define([
    "intern!object",
    "intern/chai!assert",
    "require"
], function (registerSuite, assert, require) {
    var url = "https://github.com/codebounty/codebounty/issues/26";

    registerSuite({
        name: "bounty",

        "post bounty": function () {
            var that = this;
            return that.remote
//                .init({
//                    "chrome.switches": "[--start-maximized]"
//                })
                .get(require.toUrl(url))
                .waitForElementById("postBounty", 10000)
//                .then(function (element) {
//                    console.log(element);
//                })
//                .elementByName("q")
//                .keys("Sample test")
//                .submit()
        }
    });
});