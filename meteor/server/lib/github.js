//Contains all logic for interacting with github

var GitHub = (function () {
    var my = {};

    var GitHubApi = NodeModules.require("github"), async = NodeModules.require("async");

    /**
     * Returns the authenticated GitHub client
     * @param {String} user "jperl"
     * @returns {GitHubApi}
     */
    function authenticatedClient(user) {
        var github = new GitHubApi({
            // required
            version: "3.0.0",
            // optional
            timeout: 5000
        });

        github.authenticate({
            type: "oauth",
            token: user.services.github.accessToken
        });

        return github;
    }

    /**
     * @param user the meteor user object
     * @param repo {user: "jperl", name: "codebounty"}
     * @param {Number} issue 7
     * @param {{function(error, result)}} callback
     */
    my.GetIssueEvents = function (user, repo, issue, callback) {
        var client = authenticatedClient(user);

        client.issues.getEvents(
            {
                user: repo.user,
                repo: repo.name,
                number: issue
            },
            callback
        );
    };

    my.GetCommit = function (user, repo, sha, callback) {
        var client = authenticatedClient(user);

        client.gitdata.getCommit(
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
     * and exclude the current user
     * @param user the meteor user object
     * @param repo {user: "jperl", name: "codebounty"}
     * @param {Number} issue 7
     * @param {{function(error, result)}} callback
     */
    my.GetContributorsCommits = function (user, repo, issue, callback) {
        GitHub.GetIssueEvents(user, repo, issue, function (error, result) {
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

                GitHub.GetCommit(user, repo, sha, function (error, result) {
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
     * @param user the meteor user object
     * @param repo {user: "jperl", name: "codebounty"}
     * @param {Number} issue 7
     * @param {String} comment "Interesting issue!"
     */
    my.PostComment = function (user, repo, issue, comment) {
        var client = authenticatedClient(user);

        client.issues.createComment(
            {
                user: repo.user,
                repo: repo.name,
                number: issue,
                body: comment
            }, function (err, res) {
                console.log(err);
                console.log(res);
            }
        );
    };

    return my;
})();