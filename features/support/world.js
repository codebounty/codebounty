var World = function (callback) {
    if (!callback)
        return;

    var settings = require("./settings.local.json");

    // Your settings.local.js file should contain the code below,
    // with your Github login information substituted.
    // DO NOT PUT YOUR GITHUB LOGIN INFORMATION IN THIS FILE!
    // Settings.local.js is included in the .gitignore file and so
    // should never end up in the repo for all to see. This file
    // *is* in the repo, so putting your Github login details in
    // this file may expose those details.

    // define({
    //    "GITHUB_USERNAME": "login",
    //    "GITHUB_PASSWORD": "password"
    // });

    if (!settings)
        throw new Error("You need to create a features/support/settings.local.js file with "
            + "your Github information in it! See features/support/world.js for details.");

    var webdriver = require("selenium-webdriver"),
        extension = require("../../build/codebounty.crx.json");

    var browser = new webdriver.Builder()
        .usingServer("http://localhost:4444/wd/hub")
        .withCapabilities({
            "browserName": "chrome",
            "selenium-version": "2.30.0",
            "chromeOptions": {
                "args": ["user-data-dir=chromeprofile"],
                "extensions": [extension.base64]
            }
        })
        .build();

    callback({browser: browser, settings: settings, webdriver: webdriver});
};

module.exports.World = World;