//Contains all logic for interacting with github
CB.GitHub = (function () {
    var GitHubApi = NodeModules.require("github"), async = NodeModules.require("async");

    function GitHub(user) {
        var githubApi = new GitHubApi({
            // required
            version: "3.0.0",
            // optional
            timeout: 5000
        });

        var accessToken = user.services.github.accessToken;
        this._accessToken = accessToken;

        githubApi.authenticate({
            type: "oauth",
            token: accessToken
        });

        this._client = githubApi;
    }

    //Check we have access to the user and repo scopes
    GitHub.prototype.CheckAccess = function (callback) {
        this._client.user.get({}, function (err, res) {
            if (err)
                callback(false);

            var scopes = res.meta["x-oauth-scopes"].replace(" ", "").split(",");
            var haveAccess = _.contains(scopes, "user") && _.contains(scopes, "repo");
            callback(haveAccess);
        });
    };

    /**
     * @param repo {user: "jperl", name: "codebounty"}
     * @param {Number} issue 7
     * @param {function} callback (error, result)
     */
    GitHub.prototype.GetIssueEvents = function (repo, issue, callback) {
        this._client.issues.getEvents(
            {
                user: repo.user,
                repo: repo.name,
                number: issue
            },
            callback
        );
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
                //TODO error handling
                console.log(err);
                console.log(res);
            }
        );
    };

    return GitHub;
})
    ();