define([
    "intern!object",
    "intern/chai!assert",
    "../settings",
    "./issuePage"
], function (registerSuite, assert, settings, issuePage) {
    registerSuite({
        name: "bounty",

        "post bounty": function () {
            var myIssuePage = issuePage.create(this.remote, "26");
            myIssuePage.navigate(settings.GITHUB_USERNAME, settings.GITHUB_PASSWORD)
                .storeWindowHandle()
                .placeBounty("btc", 0.5);
        }
    });
});