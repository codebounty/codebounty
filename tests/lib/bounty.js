define([
    "intern!object",
    "intern/chai!assert",
    "../settings"
], function (registerSuite, assert, settings) {
    var gitHub = "https://github.com/";
    var issueUrl = gitHub + "codebounty/codebounty/issues/26";
    var loginUrl = gitHub + "login";

    registerSuite({
        name: "bounty",

        "post bounty": function () {
            var browser = this.remote;
            return browser.get(loginUrl)
                .elementByName("login").clickElement().type(settings.GITHUB_USERNAME)
                .end()
                .elementByName("password").clickElement().type(settings.GITHUB_PASSWORD)
                .end()
                .elementByName("commit").clickElement()
                .end()
                .wait(1000)
                .get(issueUrl)
                .wait(5000);

            //TODO
        }
    });
});