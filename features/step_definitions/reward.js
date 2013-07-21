module.exports = function () {
    this.World = require("../support/world.js").World;

    var IssuePage = require("../page_objects/issue_page.js").IssuePage,
        RewardPage = require("../page_objects/reward_page.js").RewardPage;

    var currentIssuePage;

    this.Given(/^I posted a bounty on issue (\d+) in (.*)\/(.*)$/, function (number, organization, repo, callback) {
        //assume the bounty is posted for now

        currentIssuePage = new IssuePage(this, number, organization, repo, callback);
    });

    var currentRewardPage;

    this.When(/I reward the bounty equally among the contributors/, function (callback) {
        var self = this;

        //give time for the reward button to show up
        self.browser.sleep(1000);

        currentIssuePage.rewardBounty();

        self.browser.switchTo().frame(0);

        currentRewardPage = new RewardPage(self);
        currentRewardPage.checkFirstContributor();
    });
};