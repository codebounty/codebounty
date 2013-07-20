function IssuePage(world, number, organization, repo, callback) {
    var self = this;

    self.browser = world.browser;
    self.issueUrl = "https://github.com/" + organization + "/" + repo + "/issues/" + number;
    self.settings = world.settings;

    self.browser.getAllWindowHandles().then(function (handles) {
        self.handle = handles[0];
    });

    self._navigate().then(callback);
}

IssuePage.prototype._login = function () {
    var self = this;

    self.browser.findElement({name: "login"}).sendKeys(self.settings.GITHUB_USERNAME);
    self.browser.findElement({name: "password"}).sendKeys(self.settings.GITHUB_PASSWORD);
    return self.browser.findElement({name: "commit"}).click();
};

IssuePage.prototype._navigate = function () {
    var self = this;

    self.browser.get(self.issueUrl);

    //it takes a bit for the login and password to drop down
    self.browser.sleep(1000);

    return self.browser.isElementPresent({name: "login"}).then(function (shouldLogin) {
        if (!shouldLogin)
            return;

        return self._login();
    });
};

IssuePage.prototype.toggleCurrency = function () {
    return this.browser.findElement({id: "currencyToggle"})
        .findElement({className: "toggle-select"})
        .click();
};

IssuePage.prototype.isBountyCommentPresent = function () {
    var self = this;

    var xpath = "//a[contains(@href, '" + self.settings.ROOT_URL + "reward/link/')]" +
        "/img[contains(@src, '" + self.settings.ROOT_URL + "reward/image/')]";

    return self.browser.isElementPresent({
        xpath: xpath
    });
};

/**
 * Returns the approval page handle
 */
IssuePage.prototype.postBounty = function () {
    var self = this;

    self.browser.findElement({id: "postBounty"}).click();

    return self.browser.getAllWindowHandles().then(function (handles) {
        for (var i = 0; i < handles.length; i++)
            //there should only be two windows open
            //the one that is not this issue page should is the approval page
            if (handles[i] !== self.handle)
                return handles[i];
    });
};

module.exports = {
    IssuePage: IssuePage
};