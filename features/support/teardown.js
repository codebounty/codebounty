module.exports = function () {

    this.After(function (callback) {
        this.browser.quit().then(callback);
    });

};