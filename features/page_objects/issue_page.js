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

IssuePage.prototype.isBountyCommentPresent = function () {
    var self = this;

    var xpath = "//a[contains(@href, 'reward/link/')]/img[contains(@src, 'reward/image/')]";

    return self.browser.isElementPresent({
        xpath: xpath
    });
};

IssuePage.prototype.openBountyAmount = function () {
    var self = this,
        element = self.browser.findElement({
            xpath: "//span[contains(@class, 'state-indicator open')]"
        });

    return element.getText().then(function (openText) {
        //strip out the number
        return openText.replace(/^\D+/g, "");
    });
};

/**
 * Returns the approval page handle
 */
IssuePage.prototype.postBounty = function (amount) {
    var self = this;

    var bountyInput = self.browser.findElement({id: "bountyInput"});
    bountyInput.clear();
    bountyInput.sendKeys(amount);

    self.browser.findElement({id: "postBounty"}).click();

    return self.browser.getAllWindowHandles().then(function (handles) {
        for (var i = 0; i < handles.length; i++)
            //there should only be two windows open
            //the one that is not this issue page should is the approval page
            if (handles[i] !== self.handle)
                return handles[i];
    });
};

IssuePage.prototype.rewardBounty = function () {
    return this.browser.findElement({id: "rewardBounty"}).click();
};

IssuePage.prototype.switchTo = function () {
    return this.browser.switchTo().window(this.handle);
};

IssuePage.prototype.toggleCurrency = function () {
    return this.browser.findElement({id: "currencyToggle"})
        .findElement({className: "toggle-select"})
        .click();
};

module.exports = {
    IssuePage: IssuePage
};