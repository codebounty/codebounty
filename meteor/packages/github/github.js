//TODO make this a public package

var GitHubApi = Npm.require("github"), async = Npm.require("async"), signals = Npm.require("signals");

//used to cache api responses
var Responses = new Meteor.Collection("responses");

//max allowed http://developer.github.com/v3/#pagination
var pageSize = 100;

var remainingRequests = 5000;
/**
 * Log the # requests remaining
 * @param res
 * @param name
 */
var logRemainingRequests = function (res, name) {
    var before = remainingRequests;
    var after = remainingRequests = res.meta["x-ratelimit-remaining"];
    if (before - after > 0) //{
//          console.log("counted", name, res.meta.etag, res.meta.status);
        console.log("remaining", remainingRequests);
//        } else {
//            console.log("not counted", name, res.meta.etag, res.meta.status);
//        }
};

GitHubEvents = {
    User: {
        loaded: new signals.Signal()
    },
    Issues: {
        loaded: new signals.Signal()
    },
    GitData: {
        Commit: {
            loaded: new signals.Signal()
        }
    }
};

/**
 * Creates an authenticated github client
 * @param [user] The user to authorize the API with. If not passed, it will use the codebountycharlie
 * @constructor
 */
GitHub = function (user) {
    var githubApi = new GitHubApi({
        // required
        version: "3.0.0",
        // optional
        timeout: 5000
    });

    var accessToken;

    if (user) {
        this._userGitHub = user.services.github;

        accessToken = this._userGitHub.accessToken;
    }
    else
        accessToken = Meteor.settings["GITHUB_CHARLIE"];

    githubApi.authenticate({
        type: "oauth",
        token: accessToken
    });

    this._client = githubApi;

    this._requestMapping = {
        "User.get": {
            request: this._client.user.get,
            signal: GitHubEvents.User.loaded
        },
        "Issues.getEvents": {
            request: this._client.issues.getEvents,
            signal: GitHubEvents.Issues.loaded
        },
        "GitData.getCommit": {
            request: this._client.gitdata.getCommit,
            signal: GitHubEvents.GitData.Commit.loaded
        }
    };
};

/**
 * Run a request then trigger the callback & signal
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
    requestOptions.per_page = pageSize;

    //if there is a cached response perform a conditional request
    var headers = {};
    if (etag)
        headers["If-None-Match"] = etag;

    var requestFunction = that._requestMapping[name].request;
    var signal = that._requestMapping[name].signal;

    //run the request
    requestFunction(requestOptions, function (err, res) {
        if (err)
            callback(err);
        else {
            logRemainingRequests(res, name);
            callback(null, res);
            if (signal)
                signal.dispatch(that, err, res);
        }
    }, headers);
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
 * @param callback (error, result) returns the cachedResponse
 */
GitHub.prototype._updateCachedResponse = function (request, data, callback) {
    var that = this;
    Fiber(function () {
        var cachedResponse = Responses.findOne({request: request, data: data});
        //if there is not a cached response yet
        //load the first page and set it on a new cached response
        if (!cachedResponse) {
            cachedResponse = {
                request: request,
                data: data,
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
            that._runRequest(request, data, pageResponse.meta.etag, pageIndex + 1, function (err, res) {
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
            if (err)
                callback(err);
            else
                callback(null, cachedResponse);
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

    var nextPage = lastPage.data.length === pageSize;
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
 * @param [callback] (error, resultData) called after completed.
 * resultData has properties - data: merged page data, - meta: the last page's meta data
 * and the last pages metadata
 */
GitHub.prototype._conditionalCrawlAndCache = function (request, data, paging, callback) {
    var that = this;
    async.waterfall([
        //update the cache
        function (cb) {
            that._updateCachedResponse(request, data, cb);
        },

        //then crawl until the last page
        function (cachedResponse, cb) {
            if (paging)
                that._crawlToEnd(cachedResponse, cb);
            else
                cb(null, cachedResponse);
        }],

        //then store the result and return it
        function (err, cachedResponse) {
            if (err) {
                console.log("ERROR: ConditionalCrawlAndCache", err, request, data);
                if (callback)
                    callback(err);
                return;
            }

            Fiber(function () {
                //update cached response if it already exists
                if (cachedResponse._id) {
                    Responses.update(cachedResponse._id, {$set: {pages: cachedResponse.pages}});
                }
                //otherwise insert it
                else {
                    Responses.insert(cachedResponse);
                }
            }).run();

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
GitHub.prototype.checkAccess = function (callback) {
    var that = this;
    that._conditionalCrawlAndCache("User.get", {
        user: that._userGitHub.username
    }, false, function (error, result) {
        if (error) {
            callback(false);
            return;
        }

        var scopes = result.meta["x-oauth-scopes"].replace(" ", "").split(",");
        var haveAccess = _.contains(scopes, "user") && _.contains(scopes, "repo");
        callback(haveAccess);
    });
};

/**
 * Loads the issue events with a conditional request
 * @param {string} issueUrl
 * @param {function} [callback] (error, result) result is an array
 */
GitHub.prototype.getIssueEvents = function (issueUrl, callback) {
    var issue = GitHubUtils.getIssue(issueUrl);

    this._conditionalCrawlAndCache("Issues.getEvents", {
        user: issue.repo.user,
        repo: issue.repo.name,
        number: issue.number
    }, true, callback);
};

/**
 * Loads the commit with a conditional request
 * @param repo {user: string, name: string}
 * @param {string} sha
 * @param {function} [callback] (error, result) result is an array with one item
 */
GitHub.prototype.getCommit = function (repo, sha, callback) {
    this._conditionalCrawlAndCache("GitData.getCommit", {
        user: repo.user,
        repo: repo.name,
        sha: sha
    }, false, callback);
};

/**
 * Loads the commit with a conditional request
 * @param repo {user: string, name: string}
 * @param {string} sha
 * @param {function} [callback] (error, result) result is an array with one item
 */
GitHub.prototype.getUser = function (callback) {
    var that = this;
    that._conditionalCrawlAndCache("User.get", {
        user: that._userGitHub.username
    }, false, function (error, result) {
        callback(error, !error ? result.data[0] : undefined);
    });
};

/**
 * Get all the commit data from  "contributors" (users with associated commits) for an issue
 * TODO and exclude the current user
 * NOTE: The commit or pull request must have a comment referencing the issue to count as a contributor
 * @param {string} issueUrl
 * @param {function} callback (error, eventsResult, commitsResult)
 */
GitHub.prototype.getContributorsCommits = function (issueUrl, callback) {
    var that = this;

    var issue = GitHubUtils.getIssue(issueUrl);

    that.getIssueEvents(issueUrl, function (error, issueEvents) {
        issueEvents = issueEvents.data;
        if (error) {
            callback(error);
            return;
        }

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
    });
};

/**
 * Post a comment on an issue
 * @param {string} issueUrl
 * @param {string} comment "Interesting issue!"
 */
GitHub.prototype.postComment = function (issueUrl, comment) {
    var issue = GitHubUtils.getIssue(issueUrl);

    this._client.issues.createComment(
        {
            user: issue.repo.user,
            repo: issue.repo.name,
            number: issue.number,
            body: comment
        }, function (err, res) {
            //TODO log error
            if (err)
                console.log("ERROR: Posting GitHub comment", err);
        }
    );
};
