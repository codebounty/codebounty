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

        currentIssuePage.rewardBounty();

        //give time for the reward to load
        self.browser.sleep(3000);

        currentRewardPage = new RewardPage(self);
        currentRewardPage.switchTo();

        //equally split the amount among each contributor
        currentRewardPage.amount().then(function (amount) {
            currentRewardPage.contributorRows().then(function (contributorRows) {
                var promises = [];

                console.log(amount, "/", contributorRows.length, promises.length);

                //check the contributors before setting the amounts
                //because every time a contributor is set the amounts reset
                //TODO fix this?
                for (var i = 0; i < contributorRows.length; i++)
                    promises.push(currentRewardPage.checkContributor(i));

                //wait a half second for the browser to re-render
                //TODO fix this?
                self.browser.sleep(500);

                for (i = 0; i < contributorRows.length; i++)
                    promises.push(currentRewardPage.setContributorAmount(i, 13));


                return self.webdriver.promise.fullyResolved(promises);
            });
        });
    });
};