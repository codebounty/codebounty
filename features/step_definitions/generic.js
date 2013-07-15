module.exports = function () {
    this.World = require('../support/world.js');

    /* "<Given> I visit <url>" */
    this.Given(/^I visit (https?:\/\/.*\..*)$/, function (url, callback) {
        this.browser.get(url, callback).then(callback);
    });

    /* "<When> I enter <text> into <inputName>" */
    this.When(/^I enter '(.*)' into '(.*)'$/, function (text, inputName, callback) {
        this.browser.findElement(this.webdriver.By.name(inputName))
            .sendKeys(text).then(function () {
                debugger;
                callback();
            });
    });
};