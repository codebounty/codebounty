define([
    "intern/node_modules/dojo/node!underscore",
    "./page"
], function (_, page) {
    return _.extend({}, page, {
        create: function (browser, issue) {
            var issueUrl = "https://github.com/codebounty/codebounty/issues/" + issue;

            var self = Object.create(this);

            self.browser = browser;
            self.url = issueUrl;

            return self;
        },
        placeBounty: function (currency, amount) {
//    var activeCurrency = this.browser.safeEval("$('#currencyInput').val()");
//    if (activeCurrency != currency.toLowerCase()) {
//        this.browser
//            .waitForVisibleById("currencyToggle", function (one, two, three) {
//                console.log(one, two, three);
//            })
//            .end()
//            .elementByCssSelector("#currencyToggle .toggle-off")
//            .end()
//            .clickElement()
//            .end();
//    }
            var self = this;

            self.browser.waitForElementById("postBounty", 5000)
                .elementById("postBounty")
                .clickElement()
                .end()
                .wait(1000)
                .end()
                .windowHandles()
                .then(function (windows) {
                    for (var i = 0; i < windows.length; i++) {
                        if (windows[i] !== that.mainWindow) {
                            self.bountyWindow = windows[i];

                            self.browser.window(self.bountyWindow).then(function (one, two) {
                                debugger;
                            });
                        }
                    }
                });

            return this;
        }
    });
});