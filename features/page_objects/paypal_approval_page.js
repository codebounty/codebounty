function PaypalApprovalPage(world, handle) {
    var self = this;

    self.browser = world.browser;
    self.handle = handle;
    self.settings = world.settings;

    self._login();
}

PaypalApprovalPage.prototype._login = function () {
    var self = this;

    //sometime the load login page button shows up
    //so click the load login button to get to the login page
    return self.browser.isElementPresent({id: "loadLogin"}).then(function (loginButton) {
        if (loginButton) {
            self.browser.findElement({id: "loadLogin"}).click();

            //wait for the login drop down to show up
            return self.browser.sleep(4000);
        }
    }).then(function () {
            var loginEmail = self.browser.findElement({id: "login_email"});
            loginEmail.clear();
            loginEmail.sendKeys(self.settings.PAYPAL_USERNAME);

            self.browser.findElement({id: "login_password"})
                .sendKeys(self.settings.PAYPAL_PASSWORD);

            self.browser.findElement({id: "submitLogin"}).click();

            return self.browser.sleep(4000);
        });
};

PaypalApprovalPage.prototype.approve = function () {
    this.browser.findElement({id: "submit.x"}).click();

    //it takes some time for paypal to process the approval after clicking
    return this.browser.sleep(3000);
};

module.exports = {
    PaypalApprovalPage: PaypalApprovalPage
};