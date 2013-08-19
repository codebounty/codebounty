function IssuePage(world, number, organization, repo, callback) {
    var that = this;

    that.browser = world.browser;
    that.issueUrl = "https://github.com/" + organization + "/" + repo + "/issues/" + number;
    that.settings = world.settings;

    that.browser.getAllWindowHandles().then(function (handles) {
        that.handle = handles[0];
    });

    that._navigate().then(callback);
}

IssuePage.prototype._login = function () {
    var that = this;

    that.browser.findElement({name: "login"}).sendKeys(that.settings.GITHUB_USERNAME);
    that.browser.findElement({name: "password"}).sendKeys(that.settings.GITHUB_PASSWORD);
    that.browser.findElement({name: "commit"}).click();

    //allow some time for logging in
    //this only needs to happen the first time run the tests so its not a big deal
    return that.browser.sleep(5000);
};

IssuePage.prototype._navigate = function () {
    var that = this;

    that.browser.get(that.issueUrl);

    //it takes a bit for the login and password to drop down
    that.browser.sleep(1000);

    return that.browser.isElementPresent({name: "login"}).then(function (shouldLogin) {
        if (!shouldLogin)
            return;

        return that._login();
    });
};

IssuePage.prototype.isBountyCommentPresent = function () {
    var that = this;

    var xpath = "//a[contains(@href, 'reward/link/')]/img[contains(@src, 'reward/image/')]";

    return that.browser.isElementPresent({
        xpath: xpath
    });
};

IssuePage.prototype.openBountyAmount = function () {
    var that = this,
        element = that.browser.findElement({
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
    var bountyInput = this.browser.findElement({id: "bountyInput"});
    bountyInput.clear();
    bountyInput.sendKeys(amount);

    return this.openBountyWindow();
};

IssuePage.prototype.openBountyWindow = function () {
    var that = this;
    
    that.browser.findElement({id: "postBounty"}).click();

    return this.browser.getAllWindowHandles().then(function (handles) {
        for (var i = 0; i < handles.length; i++)
            //there should only be two windows open
            //the one that is not this issue page should is the approval page
            if (handles[i] !== that.handle)
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
    return this.browser.findElement({id: "currencyToggle"}).click();
};

module.exports = {
    IssuePage: IssuePage
};
