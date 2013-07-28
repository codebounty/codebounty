var World = function (callback) {
    if (!callback)
        return;

    var appSettings = require("../../meteor/settings.local.json"),
        testSettings;

    // Your settings.local.js file should contain the code below,
    // with your Github and Paypal login information substituted.
    // DO NOT CHECK THIS FILE IN unless you want to EXPOSE YOUR CREDENTIALS

    //{
    //    "GITHUB_USERNAME": "login",
    //    "GITHUB_PASSWORD": "password",
    //    "PAYPAL_USERNAME": "sandboxlogin",
    //    "PAYPAL_PASSWORD": "sandboxpassword"
    //}

    try {
        testSettings = require("./settings.local.json");
    }
        //error handled next
    catch (error) {
    }

    if (!testSettings || !testSettings.GITHUB_USERNAME || !testSettings.GITHUB_PASSWORD
        || !testSettings.PAYPAL_USERNAME || !testSettings.PAYPAL_PASSWORD)
        throw new Error("You need to create a features/support/settings.local.js file. "
            + "See features/support/world.js for details.");

    testSettings.ROOT_URL = appSettings.ROOT_URL;

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

    //wait up to 2.5 seconds for an element to appear
    browser.manage().timeouts().implicitlyWait(2500);

    callback({
        browser: browser,
        settings: testSettings,
        webdriver: webdriver
    });
};

module.exports.World = World;