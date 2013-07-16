module.exports = function () {
    this.World = require("../support/world.js").World;

    this.Given(/^I visit issue (\d+) in (.*)\/(.*)$/, function (number, org, repo, callback) {
        var self = this;

        self.browser.get("https://github.com/" + org + "/" + repo + "/issues/" + number, callback);

        self.browser.sleep(1000);

        self.browser.isElementPresent({name: "login"}).then(function (shouldLogin) {
            if (!shouldLogin) {
                callback();
                return;
            }

            self.browser.findElement({name: "login"})
                .sendKeys(self.settings.GITHUB_USERNAME);

            self.browser.findElement({name: "password"})
                .sendKeys(self.settings.GITHUB_PASSWORD);

            self.browser.findElement({name: "commit"}).click();

            self.browser.sleep(1000).then(callback);
        });
    });

    this.When(/I post a (\d+) (.*) bounty/, function (amount, currency, callback) {
        var self = this;

        self.browser.manage().timeouts().implicitlyWait(5000);
        self.browser.findElement({id: "postBounty"}).click();
        self.browser.sleep(5000).then(callback);

        //TODO store current window handle, switch windows, login with paypal, approve payment

        callback();
    });
};