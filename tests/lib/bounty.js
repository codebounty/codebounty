function LoginPage(browser, username, password) {
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
};

function IssuePage(browser, issue) {
    var that = this;

    that.rootUrl = "https://github.com/codebounty/codebounty/issues/";
    that.browser = browser.windowHandle().then(function (handle) {
        that.mainWindow = handle;
    });

    that.issueUrl = this.rootUrl + issue;

    return that;
}

IssuePage.prototype.load = function () {
    this.browser.get(this.issueUrl).wait(5000);
    return this;
};

IssuePage.prototype.placeBounty = function (currency, amount) {
//    var activeCurrency = this.browser.safeEval("$('#currencyInput').val()");
//    if (activeCurrency != currency.toLowerCase()) {
//        this.browser
//            .waitForVisibleById("currencyToggle", function (one, two, three) {
//                console.log(one, two, three);
//            })
//            .end()
//            .elementByCssSelector("#currencyToggle .toggle-off")
//            .end()
//            .clickElement()
//            .end();
//    }

    var that = this;

    that.browser.waitForElementById("postBounty", 5000)
        .elementById("postBounty")
        .clickElement()
        .end()
        .wait(1000)
        .end()
        .windowHandles()
        .then(function (windows) {
            for (var i = 0; i < windows.length; i++) {
                if (windows[i] !== that.mainWindow) {
                    that.bountyWindow = windows[i];

                    that.browser.window(that.bountyWindow).then(function (one, two) {
                        debugger;
                    });
                }
            }
        });

    return this;
};

define([
    "intern!object",
    "intern/chai!assert",
    "../settings"
], function (registerSuite, assert, settings) {
    var testIssue = "26";

    registerSuite({
        name: "bounty",

        "post bounty": function () {
            // Log in as our test user
            var browser = (new LoginPage(this.remote, settings.GITHUB_USERNAME, settings.GITHUB_PASSWORD)).login().browser;

            // Load the issue page and place a bounty.
            return (new IssuePage(browser, testIssue)).load().placeBounty("btc", 0.5);
        }
    });
});
