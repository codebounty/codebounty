function PaypalApprovalPage(world, handle) {
    var self = this;

    self.browser = world.browser;
    self.handle = handle;
    self.settings = world.settings;

    self._login();
}

PaypalApprovalPage.prototype._login = function () {
    var self = this;

    //sometime the login page vs credit card page shows up
    //so click the login button to get to the login page
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

    return self.browser.sleep(4000);
};

PaypalApprovalPage.prototype.approve = function () {
    this.browser.findElement({id: "submit.x"}).click();

    //it takes some time for paypal to process the approval after clicking
    return this.browser.sleep(3000);
};

module.exports = {
    PaypalApprovalPage: PaypalApprovalPage
};