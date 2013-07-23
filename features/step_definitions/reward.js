module.exports = function () {
    this.World = require("../support/world.js").World;

    var Big = require("big.js");

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
        self.browser.sleep(3500);

        currentRewardPage = new RewardPage(self);
        currentRewardPage.switchTo();

        //equally split the amount among each contributor
        currentRewardPage.amount().then(function (amount) {
            currentRewardPage.contributorRows().then(function (contributorRows) {
                var promises = [],
                    numberOfContributors = contributorRows.length;

                amount = new Big(amount);
                var equalAmount = new Big(amount.div(numberOfContributors).toFixed(2));
                var remainder = amount.minus(equalAmount.times(numberOfContributors));

                //check the contributors before setting the amounts
                //because every time a contributor is set the amounts reset
                //TODO fix this?
                for (var i = 0; i < numberOfContributors; i++)
                    promises.push(currentRewardPage.checkContributor(i));

                //wait a second for the browser to re-render
                //TODO fix this?
                self.browser.sleep(1000);

                for (i = 0; i < numberOfContributors; i++) {
                    var contributorReward = equalAmount;

                    //add any remainder to the first contributor
                    if (i === 0)
                        contributorReward = equalAmount.plus(remainder);

                    console.log(contributorReward.toString());

                    contributorReward = contributorReward.toFixed(2);
                    promises.push(currentRewardPage.setContributorAmount(i, contributorReward));
                }

                return self.webdriver.promise.fullyResolved(promises);
            });
        });
    });
};