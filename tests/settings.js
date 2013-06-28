try {
    define(["./settings.local"], function (localSettings) {
        return {
            GITHUB_USERNAME: localSettings.GITHUB_USERNAME,
            GITHUB_PASSWORD: localSettings.GITHUB_PASSWORD
        };
    });
} catch (e) {
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
    
    // Throwing an exception to make sure everyone trying to run the
    // tests knows to create a "settings.local.js" file.
    throw new Error("You need to create a tests/settings.local.js file with "
        + "your Github information in it! See tests/settings.js for details.");
}
