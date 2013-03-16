var GitHub = (function () {
    var my = {};

    var GitHubApi = NodeModules.require("github");

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
     * @param {String} user "jperl"
     * @param {String} repo "jperl/codebounty"
     * @param {Number} issue 7
     * @param {{function(error, result)}} callback
     */
    my.GetIssue = function (user, repo, issue, callback) {
        var client = authenticatedClient(user);

        client.issues.getRepoIssue(
            {
                user: user,
                repo: repo,
                number: issue
            },
            callback
        );
    };

    /**
     * @param {String} user "jperl"
     * @param {String} repo "jperl/codebounty"
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