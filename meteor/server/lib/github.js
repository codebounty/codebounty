//Contains all logic for interacting with github
CB.GitHub = (function () {
    var GitHubApi = NodeModules.require("github"), async = NodeModules.require("async");

    //used to cache api responses
    var Responses = new Meteor.Collection("responses");

    //max allowed http://developer.github.com/v3/#pagination
    var pageSize = 100;

    var requestsRemaining = 5000;
    /**
     * Log the # requests remaining
     * @param res
     * @param name
     */
    var updateRequestsRemaining = function (res, name) {
        var before = requestsRemaining;
        var after = requestsRemaining = res.meta["x-ratelimit-remaining"];
        if (before - after > 0) //{
//          console.log("counted", name, res.meta.etag, res.meta.status);
            console.log("remaining", requestsRemaining);
//        } else {
//            console.log("not counted", name, res.meta.etag, res.meta.status);
//        }
    };

    /**
     * Need to pass either the user so we can always make (authenticated) github requests
     * @param user
     * @constructor
     */
    function GitHub(user) {
        var githubApi = new GitHubApi({
            // required
            version: "3.0.0",
            // optional
            timeout: 5000
        });

        if (user) {
            this._userGitHub = user.services.github;

            var accessToken = this._userGitHub.accessToken;
            githubApi.authenticate({
                type: "oauth",
                token: accessToken
            });
        }
        //we don't want unauthenticated api calls for now since they are extremely limited
        else {
            throw "No unauthenticated github clients allowed";
        }

        this._client = githubApi;
    }

    /**
     * Run a request then trigger the callback
     * @param name the request name
     * @param data the request data
     * @param [etag] will run a conditional request if passed
     * @param [page] the page to get. defaults to 1
     * @param callback (error, result)
     */
    GitHub.prototype._runRequest = function (name, data, etag, page, callback) {
        //clone data to use for request options
        var requestOptions = JSON.parse(JSON.stringify(data));
        if (page >= 1)
            requestOptions.page = page;
        requestOptions.per_page = pageSize;

        //if there is a cached response perform a conditional request
        var headers = {};
        if (etag)
            headers["If-None-Match"] = etag;

        var requestFunction;
        switch (name) {
            case "User.get":
                requestFunction = this._client.user.get;
                break;
            case "Issues.getEvents":
                requestFunction = this._client.issues.getEvents;
                break;
            case "GitData.getCommit":
                requestFunction = this._client.gitdata.getCommit;
                break;
            default:
                throw "Not a known request: " + name;
        }

        //run the request
        requestFunction(requestOptions, function (err, res) {
            if (err)
                callback(err);
            else {
                updateRequestsRemaining(res, name);

                callback(null, res);
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
    GitHub.prototype.CheckAccess = function (callback) {
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
     * @param bounty
     * @param {function} [callback] (error, result) result is an array
     */
    GitHub.prototype.GetIssueEvents = function (bounty, callback) {
        var that = this;
        that._conditionalCrawlAndCache("Issues.getEvents", {
            user: bounty.repo.user,
            repo: bounty.repo.name,
            number: bounty.issue
        }, true, function (error, result) {
            _.each(_getIssueEventsCallbacks, function (cb) {
                cb(that, bounty, error, result);
            });

            if (callback)
                callback(error, result);
        });
    };

    /**
     * Loads the commit with a conditional request
     * @param repo {user: "jperl", name: "codebounty"}
     * @param {string} sha
     * @param {function} [callback] (error, result) result is an array with one item
     */
    GitHub.prototype.GetCommit = function (repo, sha, callback) {
        this._conditionalCrawlAndCache("GitData.getCommit", {
            user: repo.user,
            repo: repo.name,
            sha: sha
        }, false, callback);
    };

    /**
     * Get all the commit data from  "contributors" (users with associated commits) for an issue
     * TODO and exclude the current user
     * NOTE: The commit or pull request must have a comment referencing the issue to count as a contributor
     * @param bounty
     * @param {function} callback (error, result)
     */
    GitHub.prototype.GetContributorsCommits = function (bounty, callback) {
        var that = this;

        that.GetIssueEvents(bounty, function (error, result) {
            var result = result.data;
            if (error) {
                callback(error);
                return;
            }

            //load the commit data for each referenced commit
            var commitData = [];
            var referencedCommits = _.map(result, function (event) {
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
                    callback(null, commitData);
            };

            async.each(referencedCommits, function (sha, commitLoaded) {
                that.GetCommit(bounty.repo, sha, function (error, result) {
                    if (error)
                        commitLoaded(error);
                    else {
                        var result = result.data;
                        commitData.push(result[0]);
                        commitLoaded();
                    }
                });
            }, commitsLoaded);
        });
    };

    /**
     * @param bounty
     * @param {String} comment "Interesting issue!"
     */
    GitHub.prototype.PostComment = function (bounty, comment) {
        this._client.issues.createComment(
            {
                user: bounty.repo.user,
                repo: bounty.repo.name,
                number: bounty.issue,
                body: comment
            }, function (err, res) {
                //TODO log error
                if (err) {
                    console.log("ERROR: Posting GitHub comment", err);
                }
            }
        );
    };

    var _getIssueEventsCallbacks = [];
    /**
     * Add an additional callback to GetIssueEvents
     * @param callback (thisGitHubInstance, bounty, error, result)
     */
    GitHub.onGetIssueEvents = function (callback) {
        _getIssueEventsCallbacks.push(callback);
    };

    return GitHub;
})();