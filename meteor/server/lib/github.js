//Contains all logic for interacting with github
CB.GitHub = (function () {
    var GitHubApi = NodeModules.require("github"), async = NodeModules.require("async");

    //used to cache api responses
    var Responses = new Meteor.Collection("responses");

    //max allowed http://developer.github.com/v3/#pagination
    var pageSize = 100;
    //FOR DEBUGGING var pageSize = 5;

    //TODO every response, update # requests remaining

    function GitHub(user) {
        var githubApi = new GitHubApi({
            // required
            version: "3.0.0",
            // optional
            timeout: 5000
        });

        var accessToken = user.services.github.accessToken;
        githubApi.authenticate({
            type: "oauth",
            token: accessToken
        });

        this._client = githubApi;
    }

    //Check we have access to the user and repo scopes
    GitHub.prototype.CheckAccess = function (callback) {
        this._client.user.get({}, function (err, res) {
            if (err) {
                callback(false);
                return;
            }

            var scopes = res.meta["x-oauth-scopes"].replace(" ", "").split(",");
            var haveAccess = _.contains(scopes, "user") && _.contains(scopes, "repo");

            callback(haveAccess);
        });
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
        //clone data to use for request options
        var requestOptions = JSON.parse(JSON.stringify(data));
        requestOptions.page = page || 1;
        requestOptions.per_page = pageSize;

        //if there is a cached response perform a conditional request
        var headers = {};
        if (etag) {
            headers["If-None-Match"] = etag;
        }

        var requestFunction;

        if (name === "Issues.getEvents") {
            requestFunction = this._client.issues.getEvents;
        } else {
            throw "Not a known request: " + request;
        }

        //run the request
        requestFunction(requestOptions, callback, headers);
    };

    /**
     * Takes a standard response and adds it to the cachedResponse
     * @param cachedResponse
     * @param res
     */
    var addPageResponse = function (cachedResponse, res) {
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

                    //FOR DEBUGGING
                    console.log("New to cache", "1", res.meta.etag);

                    addPageResponse(cachedResponse, res);
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
                            //FOR DEBUGGING
                            console.log("Changed", pageIndex + 1, pageResponse.meta.etag, "to", res.meta.etag);

                            pageResponse.meta = res.meta;
                            delete res.meta;
                            pageResponse.data = res;
                        } else {
                            //FOR DEBUGGING
                            console.log("Not changed", pageIndex + 1, res.meta.etag);
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
            //FOR DEBUGGING
            console.log("at end", cachedResponse.pages.length);

            callback(null, cachedResponse);
            return;
        }

        //FOR DEBUGGING
        console.log("crawling after page", cachedResponse.pages.length);

        //load next page
        that._runRequest(cachedResponse.request, cachedResponse.data, null, cachedResponse.pages.length + 1,
            function (err, res) {
                if (err) {
                    callback(err);
                    return;
                }

                //store the page and keep crawling
                addPageResponse(cachedResponse, res);
                that._crawlToEnd(cachedResponse, callback);
            });
    };

    /**
     * Perform a conditional request for each page of a request
     * then cache and return the result
     * @param request the request name
     * @param data the request data (no config options like page #)
     *             used as a lookup in the cache for existing responses
     * @param callback (error, result) called after completed. passed the result pages concatenated
     */
    GitHub.prototype.ConditionalCrawlAndCache = function (request, data, callback) {
        var that = this;
        async.waterfall([
            //update the cache
            function (cb) {
                that._updateCachedResponse(request, data, cb);
            },

            //then crawl until the last page
            function (cachedResponse, cb) {
                that._crawlToEnd(cachedResponse, cb);
            }],

            //then store the result and return it
            function (err, cachedResponse) {
                if (err) {
                    console.log("ERROR: ConditionalCrawlAndCache", err, request, data);
                    return;
                }

                //FOR DEBUGGING
                var pageIndex = 1;
                _.each(cachedResponse.pages, function (page) {
                    var pageDataCounter = {};
                    if (cachedResponse.request === "Issues.getEvents") {
                        pageDataCounter.closed = 0;
                        pageDataCounter.reopened = 0;
                    }
                    _.each(page.data, function (data) {
                        if (cachedResponse.request === "Issues.getEvents") {
                            if (data.event === "closed")
                                pageDataCounter.closed++;
                            else if (data.event === "reopened")
                                pageDataCounter.reopened++;
                        }
                    });

                    console.log("page", pageIndex, _.pairs(pageDataCounter));
                    pageIndex++;
                });
                //END

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

                var merged = _.flatten(pageData);
                callback(null, merged);
            }
        );
    };

    /**
     * Loads the issue events with a conditional request
     * TODO paging go through each page
     * @param repo {user: "jperl", name: "codebounty"}
     * @param {Number} issue 7
     * @param {function} callback (error, result)
     */
    GitHub.prototype.GetIssueEvents = function (repo, issue, callback) {
        this.ConditionalCrawlAndCache("Issues.getEvents", {
            user: repo.user,
            repo: repo.name,
            number: issue
        }, callback);
    };

    GitHub.prototype.GetCommit = function (repo, sha, callback) {
        this._client.gitdata.getCommit(
            {
                user: repo.user,
                repo: repo.name,
                sha: sha
            },
            callback
        );
    };

    /**
     * Get all the commit data from  "contributors" (users with associated commits) for an issue
     * TODO and exclude the current user
     * NOTE: The commit or pull request must have a comment referencing the issue
     * @param repo {user: "jperl", name: "codebounty"}
     * @param {Number} issue 7
     * @param {function} callback (error, result)
     */
    GitHub.prototype.GetContributorsCommits = function (repo, issue, callback) {
        var that = this;

        that.GetIssueEvents(repo, issue, function (error, result) {
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

                that.GetCommit(repo, sha, function (error, result) {
                    if (error)
                        commitLoaded(error);
                    else {
                        commitData.push(result);

                        commitLoaded();
                    }
                });

            }, commitsLoaded);
        });
    };

    /**
     * @param repo {user: "jperl", name: "codebounty"}
     * @param {Number} issue 7
     * @param {String} comment "Interesting issue!"
     */
    GitHub.prototype.PostComment = function (repo, issue, comment) {
        this._client.issues.createComment(
            {
                user: repo.user,
                repo: repo.name,
                number: issue,
                body: comment
            }, function (err, res) {
                //TODO log error
                if (err) {
                    console.log("ERROR: Posting GitHub comment", err);
                }
            }
        );
    };

    return GitHub;
})();