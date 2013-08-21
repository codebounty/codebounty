//TODO separate this out into it's own repo / meteor package

var GitHubApi = Npm.require("github"), async = Npm.require("async");

//used to cache api responses
var Responses = new Meteor.Collection("responses");

// Max allowed according to
// http://developer.github.com/v3/#pagination
// http://developer.github.com/v3/#rate-limiting
var PAGE_SIZE = 100;
var MAX_REQUESTS = 5000;

/**
 * Creates an authenticated github client
 * @param [userParams] The user to authorize the API with. If not passed, it will use the GITHUB_COMMENTER key
 * @constructor
 */
GitHub = function (userParams) {
    var accessToken;
    var params = {
        onError: function (err, that) {
            console.log(err);
        },
        onSuccess: function (res, that) {
            console.log(that.remainingRequests + " requests left this hour.");
        },
        requestsRemaining: MAX_REQUESTS,
        // In milliseconds
        cacheExpirationInterval: 600000 //10 minutes
    };

    var githubApi = new GitHubApi({
        // required
        version: "3.0.0",
        // optional
        timeout: 5000
    });

    // Fill in omitted parameters with our defaults.
    _.extend(params, userParams);

    // Make sure the required parameters have been supplied.
    if (params.user) {
        this.user = params.user;
        accessToken = this.user.services.github.accessToken;
    } else if (params.accessToken) {
        accessToken = params.accessToken;
    } else {
        throw "Must pass either user or accessToken to GitHub client!";
    }

    // Set event callbacks.
    this.onError = params.onError;
    this.onSuccess = params.onSuccess;
    this.cacheExpirationInterval = params.cacheExpirationInterval;

    githubApi.authenticate({
        type: "oauth",
        token: accessToken
    });

    this._client = githubApi;

    this._requestMapping = {
        "User.get": {
            request: this._client.user.get
        },
        "Issues.getEvents": {
            request: this._client.issues.getEvents
        },
        "Repos.getCommit": {
            request: this._client.repos.getCommit
        }
    };
};

/**
 * Run a request then trigger the callback
 * @param name the request name
 * @param data the request data
 * @param [etag] will run a conditional request if passed
 * @param [page] the page to get. defaults to 1
 * @param callback (error, result)
 */
GitHub.prototype._runRequest = function (name, data, etag, page, callback) {
    var that = this;

    //clone data to use for request options
    var requestOptions = JSON.parse(JSON.stringify(data));
    if (page >= 1)
        requestOptions.page = page;
    requestOptions.per_page = PAGE_SIZE;

    //if there is a cached response perform a conditional request
    var headers = {};
    if (etag)
        headers["If-None-Match"] = etag;

    var requestFunction = that._requestMapping[name].request;

    //run the request
    requestFunction(requestOptions, function (err, res) {
        if (err)
            callback(err);
        else {
            // Update our count of how many requests we have left this hour.
            that.remainingRequests = res.meta["x-ratelimit-remaining"];
            callback(null, res);
        }
    }, headers);
};

GitHub.prototype._pastCacheExpiration = function (response) {
    var now = new Date();

    return (!response || response.retrieved < new Date(now - this.cacheExpirationInterval));
};

/**
 * Takes a standard response and adds it to the cachedResponse
 * @param cachedResponse
 * @param res
 */
GitHub.prototype._addPageResponse = function (cachedResponse, res) {
    var pageResponse = {
        meta: res.meta
    };
    delete res.meta;
    pageResponse.data = res;
    cachedResponse.pages.push(pageResponse);
};

/**
 * finds and updates, or creates an initial cached response
 * NOTE: this does not update the DB, that is done later when it is crawled to the end
 * @param request
 * @param data
 * @param {boolean} forceRequest Do not pull from cache
 * @param callback (error, result) returns the cachedResponse
 */
GitHub.prototype._updateCachedResponse = function (request, data, forceRequest, callback) {
    var that = this;
    Fiber(function () {
        var cachedResponse = Responses.findOne({request: request, data: data});

        // If there is a cached response and it has not yet expired,
        // just return that. (Unless we're being forced to make a request.)
        if (!forceRequest && cachedResponse && !that._pastCacheExpiration(cachedResponse)) {
            callback(null, cachedResponse);
            return;
        }

        //if there is not a cached response yet
        //load the first page and set it on a new cached response
        if (!cachedResponse) {
            cachedResponse = {
                request: request,
                data: data,
                retrieved: new Date(),
                pages: []
            };

            that._runRequest(request, data, null, 1, function (err, res) {
                if (err) {
                    callback(err);
                    return;
                }

                that._addPageResponse(cachedResponse, res);
                callback(null, cachedResponse);
            });

            return;
        }

        //if there is a cached response do a conditional request for each cached page
        async.each(cachedResponse.pages, function (pageResponse, pageChecked) {
            var pageIndex = _.indexOf(cachedResponse.pages, pageResponse);
            that._runRequest(request, data, pageResponse, pageIndex + 1, function (err, res) {
                if (!err) {
                    //if the page changed, update it
                    if (res.meta.etag !== pageResponse.meta.etag) {
                        pageResponse.meta = res.meta;
                        delete res.meta;
                        pageResponse.data = res;
                    }
                }

                pageChecked(err);
            });
        }, function (err) {
            if (err) {
                callback(err);
            } else {
                cachedResponse.retrieved = new Date();
                callback(null, cachedResponse);
            }
        });
    }).run();
};

/**
 * Makes requests until it hits the last page.
 * Also remove any pages with 0 results
 * @param cachedResponse the cachedResponse to crawl to the end to. Starts at the last page.
 * @param callback (error, result) returns the cachedResponse
 */
GitHub.prototype._crawlToEnd = function (cachedResponse, callback) {
    var that = this;

    //only keep one page with 0 results
    var zeroResultPages = _.filter(cachedResponse.pages,function (page) {
        return page.data.length === 0;
    }).length;
    var lastPage = _.last(cachedResponse.pages);
    while (zeroResultPages > 1 && lastPage.data.length === 0) {
        cachedResponse.pages.pop();
        zeroResultPages--;
        lastPage = _.last(cachedResponse.pages);
    }

    var nextPage = lastPage.data.length === PAGE_SIZE;
    //done crawling so return
    if (!nextPage) {
        callback(null, cachedResponse);
        return;
    }

    //load next page
    that._runRequest(cachedResponse.request, cachedResponse.data, null, cachedResponse.pages.length + 1,
        function (err, res) {
            if (err) {
                callback(err);
                return;
            }

            //store the page and keep crawling
            that._addPageResponse(cachedResponse, res);
            that._crawlToEnd(cachedResponse, callback);
        });
};

/**
 * Perform a conditional request for each page of a request
 * then cache and return the result
 * @param request the request name
 * @param data the request data (no config options like page #)
 *             used as a lookup in the cache for existing responses
 * @param paging if the request can return multiple results
 * @param {boolean} force Do not pull from cache
 * @param [callback] (error, resultData) called after completed.
 * resultData has properties - data: merged page data, - meta: the last page's meta data
 * and the last pages metadata
 */
GitHub.prototype._conditionalCrawlAndCache = function (request, data, paging, force, callback) {
    var that = this;
    async.waterfall([
        //update the cache
        function (cb) {
            that._updateCachedResponse(request, data, force, cb);
        },

        //then crawl until the last page
        function (cachedResponse, cb) {
            if (paging)
                that._crawlToEnd(cachedResponse, cb);
            else
                cb(null, cachedResponse);
        }],

        //then store the result and return it
        function (error, cachedResponse) {
            Fiber(function () {
                if (error && that.onError) {
                    that.onError("ConditionalCrawlAndCache: " + error
                        + " for " + JSON.stringify(request) + " " +
                        JSON.stringify(data), that);

                    if (callback)
                        callback(error);

                    return;
                } else {
                    that.onSuccess(cachedResponse, that);
                }

                //update cached response if it already exists
                if (cachedResponse._id) {
                    Responses.update(cachedResponse._id, {$set: {
                        pages: cachedResponse.pages,
                        retrieved: cachedResponse.retrieved
                    }});
                }
                //otherwise insert it
                else {
                    Responses.insert(cachedResponse);
                }
            }).run();

            if (error)
                return;

            //merge the pages before returning them
            var pageData = _.map(cachedResponse.pages, function (page) {
                return page.data;
            });

            var merged;
            //if each page's data is an array, flatten the arrays
            if (_.isArray(pageData[0]))
                merged = _.flatten(pageData);
            else {
                merged = pageData;
            }

            var lastPage = _.last(cachedResponse.pages);
            if (callback)
                callback(null, {data: merged, meta: lastPage.meta});
        }
    );
};

//Check we have access to the user and repo scopes
GitHub.prototype.checkAccess = function (callback, force) {
    var that = this;
    that._conditionalCrawlAndCache("User.get", {
        user: AuthUtils.username(that.user)
    }, false, force, function (error, result) {
        if (error) {
            callback(false);
            return;
        }

        var scopes = result.meta["x-oauth-scopes"].replace(" ", "").split(",");
        var haveAccess = _.every(Environment.githubScopes, function (requiredScope) {
            if (requiredScope === "public_repo")
                return _.contains(scopes, "public_repo") || _.contains(scopes, "repo");

            return _.contains(scopes, requiredScope);
        });

        callback(haveAccess);
    });
};

/**
 * Loads the issue events with a conditional request
 * @param {string} issueUrl
 * @param {function} [callback] (error, result) result is an array
 * @param {boolean} force Do not pull from cache
 */
GitHub.prototype.getIssueEvents = function (issueUrl, callback, force) {
    var issue = GitHubUtils.issue(issueUrl);

    this._conditionalCrawlAndCache("Issues.getEvents", {
        user: issue.repo.user,
        repo: issue.repo.name,
        number: issue.number
    }, true, force, callback);
};

/**
 * Loads the commit with a conditional request
 * @param repo {user: string, name: string}
 * @param {string} sha
 * @param {function} [callback] (error, result) result is an array with one item
 * @param {boolean} force Do not pull from cache
 */
GitHub.prototype.getCommit = function (repo, sha, callback, force) {
    this._conditionalCrawlAndCache("Repos.getCommit", {
        user: repo.user,
        repo: repo.name,
        sha: sha
    }, false, force, callback);
};

/**
 * Loads the commit with a conditional request
 * @param {function} [callback] (error, result) result is an array with one item
 * @param {boolean} force Do not pull from cache
 */
GitHub.prototype.getUser = function (callback, force) {
    var that = this;
    that._conditionalCrawlAndCache("User.get", {
        user: AuthUtils.username(that.user)
    }, false, force, function (error, result) {
        callback(error, !error ? result.data[0] : undefined);
    });
};

/**
 * Get all the commit data from  "contributors" (users with associated commits) for an issue
 * NOTE: The commit or pull request must have a comment referencing the issue to count as a contributor
 * @param {string} issueUrl
 * @param {function} callback (error, eventsResult, commitsResult)
 * @param {boolean} force Do not pull from cache
 * @param force
 */
GitHub.prototype.getContributorsCommits = function (issueUrl, callback, force) {
    var that = this;

    var issue = GitHubUtils.issue(issueUrl);

    that.getIssueEvents(issueUrl, function (error, issueEvents) {
        if (error) {
            callback(error);
            return;
        }

        issueEvents = issueEvents.data;

        //load the commit data for each referenced commit
        var commitData = [];
        var referencedCommits = _.map(issueEvents, function (event) {
            return event.commit_id;
        });

        referencedCommits = _.filter(referencedCommits, function (sha) {
            return sha != null
        });

        //triggered after async.each complete
        var commitsLoaded = function (err) {
            if (err)
                callback(err);
            else
                callback(null, issueEvents, commitData);
        };

        async.each(referencedCommits, function (sha, commitLoaded) {
            that.getCommit(issue.repo, sha, function (error, result) {
                if (error)
                    commitLoaded(error);
                else {
                    result = result.data;
                    commitData.push(result[0]);
                    commitLoaded();
                }
            });
        }, commitsLoaded);
    }, force);
};

/**
 * Post a comment on an issue
 * @param {string} issueUrl
 * @param {string} comment "Interesting issue!"
 */
GitHub.prototype.postComment = function (issueUrl, comment) {
    var that = this;
    var issue = GitHubUtils.issue(issueUrl);

    this._client.issues.createComment(
        {
            user: issue.repo.user,
            repo: issue.repo.name,
            number: issue.number,
            body: comment
        }, function (err, res) {
            if (err && that.onError) {
                Fiber(function () {
                    that.onError("ERROR: Posting GitHub comment "
                        + EJSON.stringify(issue) + " "
                        + EJSON.stringify(err), that);
                }).run();
            } else {
                that.onSuccess(res, that);
            }
        }
    );
};