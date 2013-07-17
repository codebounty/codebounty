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

    var allHandles, githubHandle, paymentHandle;

    this.When(/I post a (\d+) (.*) bounty/, function (amount, currency, callback) {
        var self = this;

        self.browser.manage().timeouts().implicitlyWait(5000);
        self.browser.findElement({id: "postBounty"}).click();

        //store current window handle, switch windows, login with paypal, approve payment

        self.browser.getAllWindowHandles().then(function (handles) {
            allHandles = handles;
        });

        self.browser.getWindowHandle().then(function (handle) {
            githubHandle = handle;

            for (var i = 0; i < allHandles.length; i++) {
                if (allHandles[i] !== githubHandle) {
                    paymentHandle = allHandles[i];
                }
            }
        }).then(function () {
                self.browser.switchTo().window(paymentHandle);

                self.browser.isElementPresent({id: "login_button"}).then(function (loginButton) {
                    if (loginButton)
                        return self.browser.findElement({id: "login_button"}).click();
                });

                var loginEmail = self.browser.findElement({id: "login_email"});
                loginEmail.clear();
                loginEmail.sendKeys(self.settings.PAYPAL_USERNAME);

                self.browser.findElement({id: "login_password"})
                    .sendKeys(self.settings.PAYPAL_PASSWORD);

                self.browser.findElement({id: "submitLogin"}).click();

                self.browser.sleep(4000).then(function () {
                    self.browser.findElement({id: "submit.x"}).click();
                    self.browser.sleep(3000).then(callback);
                });
            });
    });
};