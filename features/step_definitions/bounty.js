module.exports = function () {
    var browser, settings, webdriver;

    this.World = require("../support/world.js").World;

    function IssuePage(number, organization, repo, callback) {
        var self = this;

        self.issueUrl = "https://github.com/" + organization + "/" + repo + "/issues/" + number;

        //store current window handle, switch windows, login with paypal, approve payment
        browser.getAllWindowHandles().then(function (handles) {
            self.handle = handles[0];
        });

        self._navigate().then(function () {
            //it could take up to 5 seconds after we navigated for the extension to load
            //todo improve performance
            browser.manage().timeouts().implicitlyWait(5000);

            callback();
        });
    }

    IssuePage.prototype._login = function () {
        browser.findElement({name: "login"}).sendKeys(settings.GITHUB_USERNAME);
        browser.findElement({name: "password"}).sendKeys(settings.GITHUB_PASSWORD);
        browser.findElement({name: "commit"}).click();

        return browser.sleep(1000);
    };

    IssuePage.prototype._navigate = function () {
        var self = this;

        browser.get(self.issueUrl);
        browser.sleep(1000);

        return browser.isElementPresent({name: "login"}).then(function (shouldLogin) {
            if (!shouldLogin)
                return;

            return self._login();
        });
    };

    IssuePage.prototype.toggleCurrency = function () {
        return browser.findElement({id: "currencyToggle"})
            .findElement({className: "toggle-select"})
            .click();
    };

    /**
     * Returns the approval page handle
     */
    IssuePage.prototype.postBounty = function () {
        var self = this;

        browser.findElement({id: "postBounty"}).click();

        return browser.getAllWindowHandles().then(function (handles) {
            for (var i = 0; i < handles.length; i++)
                //there should only be two windows open
                //the one that is not this issue page should is the approval page
                if (handles[i] !== self.handle)
                    return handles[i];
        });
    };

    var currentIssuePage;

    this.Given(/^I visit issue (\d+) in (.*)\/(.*)$/, function (number, organization, repo, callback) {
        browser = this.browser;
        settings = this.settings;
        webdriver = this.webdriver;

        currentIssuePage = new IssuePage(number, organization, repo, callback);
    });

    function PaypalApprovalPage(handle) {
        this.handle = handle;

        browser.switchTo().window(handle);

        this._login();
    }

    PaypalApprovalPage.prototype._login = function () {
        //sometime the login page vs credit card page shows up
        //so click the login button to get to the login page
        browser.isElementPresent({id: "login_button"}).then(function (loginButton) {
            if (loginButton)
                return browser.findElement({id: "login_button"}).click();
        });

        var loginEmail = browser.findElement({id: "login_email"});
        loginEmail.clear();
        loginEmail.sendKeys(settings.PAYPAL_USERNAME);

        browser.findElement({id: "login_password"})
            .sendKeys(settings.PAYPAL_PASSWORD);

        browser.findElement({id: "submitLogin"}).click();

        return browser.sleep(4000);
    };

    PaypalApprovalPage.prototype.approve = function () {
        browser.findElement({id: "submit.x"}).click();

        //it takes some time for paypal to process the approval after clicking
        return browser.sleep(3000);
    };

    function BitcoinApprovalPage(handle) {
        this.handle = handle;
        browser.switchTo().window(handle);

        //TODO if the user has not set a return address, do so here
    }

    this.When(/I post a (\d+) (.*) bounty/, function (amount, currency, callback) {
        if (currency === "BTC") {
            currentIssuePage.toggleCurrency();
            throw "Not implemented yet";
        }

        currentIssuePage.postBounty().then(function (approvalHandle) {
            if (currency === "USD") {
                var paypalApprovalPage = new PaypalApprovalPage(approvalHandle);

                paypalApprovalPage.approve()
                    .then(callback);
            }
        });
    });
};