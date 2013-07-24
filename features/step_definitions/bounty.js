module.exports = function () {
    this.World = require("../support/world.js").World;

    var IssuePage = require("../page_objects/issue_page.js").IssuePage,
        PaypalApprovalPage = require("../page_objects/paypal_approval_page.js").PaypalApprovalPage;

    var currentIssuePage;

    this.Given(/^I visit issue (\d+) in (.*)\/(.*)$/, function (number, organization, repo, callback) {
        currentIssuePage = new IssuePage(this, number, organization, repo, callback);
    });

    this.When(/I post a (\d+) (.*) bounty/, function (amount, currency, callback) {
        var self = this;

        if (currency === "BTC") {
            currentIssuePage.toggleCurrency();
            throw "Not implemented yet";
        }

        currentIssuePage.postBounty(amount).then(function (approvalHandle) {
            if (currency === "USD") {
                self.browser.switchTo().window(approvalHandle);

                //give some time for the page to redirect to the paypal preapproval url
                self.browser.sleep(2000);

                var paypalApprovalPage = new PaypalApprovalPage(self, approvalHandle);

                paypalApprovalPage
                    .approve()
                    .then(callback);
            }
        });
    });

    this.Then(/a bounty comment should be posted on the issue/, function (callback) {
        currentIssuePage.switchTo();

        currentIssuePage.isBountyCommentPresent().then(function (isPresent) {
            if (isPresent)
                callback();
            else
                callback.fail();
        });
    });
};