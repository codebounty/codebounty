define([
    "intern!object",
    "intern/chai!assert",
    "require"
], function (registerSuite, assert, require) {
    var url = "http://google.com/";

    registerSuite({
        name: "google",

        "search google": function () {
            var that = this;
            return that.remote
                .get(require.toUrl(url))
                .elementByName("q")
                .keys("Sample test")
                .submit()
                .title()
                .then(function (title) {
                    console.log(title);
                })
        }
    });
});