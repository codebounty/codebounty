var GitHub = (function () {
    var my = {};

    var GitHubApi = NodeModules.require("github");

    function authenticatedService(user) {
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

    my.PostComment = function (user, repo, issue, comment) {
        var gitHub = authenticatedService(user);

        gitHub.issues.createComment(
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

    //TODO my.ConfirmRepository

    //TODO my.PostComment

    //TODO my.CheckCompleted or something todo with pull requests and closed issue

    return my;
})();