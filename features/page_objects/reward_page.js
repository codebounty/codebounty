function RewardPage(world) {
    this.browser = world.browser;
}

RewardPage.prototype.amount = function () {
    return this.browser.findElement({
        className: "payoutTotalAmount"
    }).getText()
        .then(function (amount) {
            //get rid of the currency symbol & whitespace
            amount = amount.substring(1).trim();

            return amount;
        });
};

//NOTE: need to find elements every time something changes
//because whenever you change a bound value the page will get re-rendered
RewardPage.prototype.checkContributor = function (index) {
    return this.browser.findElement({
        xpath: "(//input[@type='checkbox' and @class='shouldPay'])[" + (index + 1) + "]"
    }).click();
};

RewardPage.prototype.setContributorAmount = function (index, amount) {
    var contributorInput = this.browser.findElement({
        xpath: "(//input[@type='number' and @class='rewardInput'])[" + (index + 1) + "]"
    });
    contributorInput.clear();
    contributorInput.sendKeys(amount);

    //lose focus by clicking on a span
    contributorInput.findElement({xpath: "//span"}).click();

    //allow the page to re-render
    return this.browser.sleep(500);
};

RewardPage.prototype.contributorRows = function () {
    return this.browser.findElements({
        className: "contributorRow"
    });
};

RewardPage.prototype.switchTo = function () {
    this.browser.switchTo().frame(this.browser.findElement({id: "overlayIframe"}));
};

module.exports = {
    RewardPage: RewardPage
};
