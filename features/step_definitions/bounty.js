module.exports = function () {
    this.World = require("../support/world.js").World;
    
    var SATOSHI_PER_BITCOIN = 100000000;
    
    var IssuePage = require("../page_objects/issue_page.js").IssuePage,
        PaypalApprovalPage = require("../page_objects/paypal_approval_page.js").PaypalApprovalPage,
        BtcBountyPage = require("../page_objects/btc_bounty_page.js").BtcBountyPage,
        Settings = require("../../meteor/settings.local.json");

    var currentIssuePage;

    this.Given(/^I visit issue (\d+) in (.*)\/(.*)$/, function (number, organization, repo, callback) {
        currentIssuePage = new IssuePage(this, number, organization, repo, callback);
    });

    this.When(/I post a ([\.\d]+) (.*) bounty/, function (amount, currency, callback) {
        var self = this;

        if (currency === "BTC") {
            currentIssuePage.toggleCurrency();
            currentIssuePage.openBountyWindow()
            .then(function (windowHandle) {
                self.browser.switchTo().window(windowHandle);
                self.browser.sleep(8000);
                
                var btcBountyPage = new BtcBountyPage(self, windowHandle);
                return btcBountyPage.bitcoinAddress();
            })
            .then(function (address) {
                var transactionHash = Math.random().toString(36).slice(2);
                self.browser.get(Settings.ROOT_URL + "bitcoin-ipn?secret="
                    + Settings.BITCOIN_SECRET + "&input_address="
                    + address + "&value=" + amount * SATOSHI_PER_BITCOIN
                    + "&confirmations=10&transaction_hash=" + transactionHash);
                self.browser.sleep(4000);
                return self.browser.getPageSource();
            })
            .then(function (source) {
                if (source.indexOf("*ok*") < 0) {
                    callback.fail();
                } else {
                    callback();
                }
            });
            
            
        } else {
            currentIssuePage.postBounty(amount).then(function (approvalHandle) {
                self.browser.switchTo().window(approvalHandle);

                //give some time for the page to redirect to the paypal preapproval url
                self.browser.sleep(8000);

                var paypalApprovalPage = new PaypalApprovalPage(self, approvalHandle);

                paypalApprovalPage
                    .approve()
                    .then(callback);
            });
        }
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
