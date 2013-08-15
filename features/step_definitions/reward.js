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

    this.When(/I reward the (.*) bounty equally among the contributors/, function (currency, callback) {
        var self = this;

        self.browser.sleep(1000);

        currentIssuePage.rewardBounty();

        //give time for the reward to load
        self.browser.sleep(3500);

        currentRewardPage = new RewardPage(self);
        currentRewardPage.switchTo();
        
        var submitRewards = function () {
			self.browser.findElement({className: "rewardButton"}).click();

			//wait for the reward to submit
			return self.browser.sleep(4000);
		};
		
		if (currency == "BTC") {
			submitRewards().then(callback);
			return;
		}

        //equally split the amount among each contributor
        var equallySplit = currentRewardPage.amount().then(function (amount) {
            return currentRewardPage.contributorRows().then(function (contributorRows) {
                var numberOfContributors = contributorRows.length;

                amount = new Big(amount);
                var equalAmount = new Big(amount.div(numberOfContributors).toFixed(2));
                var remainder = amount.minus(equalAmount.times(numberOfContributors));

                //check the contributors before setting the amounts
                //because every time a contributor is set the amounts reset
                for (var i = 0; i < numberOfContributors; i++)
                    currentRewardPage.checkContributor(i);

                for (i = 0; i < numberOfContributors; i++) {
                    var contributorReward = equalAmount;

                    //add any remainder to the first contributor
                    if (i === 0)
                        contributorReward = equalAmount.plus(remainder);

                    contributorReward = contributorReward.toFixed(2);

                    //take a break before each input to allow the browser to render
                    currentRewardPage.setContributorAmount(i, contributorReward);
                }

                return self.browser;
            });
        });

        equallySplit.then(submitRewards).then(callback);
    });

    this.Then(/there should be no remaining money on the issue$/, function (callback) {
        currentIssuePage.switchTo();

        currentIssuePage.openBountyAmount().then(function (amount) {
            amount = new Big(amount);

            if (amount.eq(0))
                callback();
            else
                callback.fail();
        })
    });
};
