function LoginPage (browser, username, password) {
    this.rootUrl = "https://github.com/login";
    this.browser = browser;
    this.username = username;
    this.password = password;
    return this;
}

LoginPage.prototype.login = function () {
    this.browser.get(this.rootUrl)
        .elementByName("login").clickElement().type(this.username)
        .end()
        .elementByName("password").clickElement().type(this.password)
        .end()
        .elementByName("commit").clickElement()
        .end()
        .wait(1000);
        
    return this;
}

function IssuePage(browser, issue) {
    this.rootUrl = "https://github.com/codebounty/codebounty/issues/";
    this.browser = browser;
    this.issueUrl = this.rootUrl + issue;
    return this;
}

IssuePage.prototype.load = function () {
    this.browser.get(this.issueUrl).wait(5000);
    return this;
}

IssuePage.prototype.placeBounty = function (currency, amount) {
    return this;
}

define([
    "intern!object",
    "intern/chai!assert",
    "../settings"
], function (registerSuite, assert, settings) {
    var testIssue = "26";

    registerSuite({
        name: "bounty",

        "post bounty": function () {
            var browser = this.remote;
            
            // Log in as our test user.
            (new LoginPage(
                browser, settings.GITHUB_USERNAME, settings.GITHUB_PASSWORD))
            .login();
            
            // Load the issue page and place a bounty.
            return (new IssuePage(browser, testIssue))
                .load();
        }
    });
});
