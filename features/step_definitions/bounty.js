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
//        this.browser.findElement(this.webdriver.By.name(inputName))
//            .sendKeys(text).then(function () {
//                callback();
//            });

        callback();
    });
};