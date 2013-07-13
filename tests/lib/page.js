define([
    "intern/node_modules/dojo/node!underscore"
], function (_) {
    return {
        create: function (browser, url) {
            var self = Object.create(this);

            self.browser = browser;
            self.url = url;

            return self;
        },

        navigate: function (username, password) {
            var self = this;

            var browser = self.browser.get(self.url);

// disabled for now see http://stackoverflow.com/questions/17634215/how-to-do-conditional-browser-interactions-with-intern
//            //if there is a username / password and login fields shows up we need to login
//            if (username && password) {
//                self.browser = browser.elementByNameIfExists("login").then(function (element) {
//                    if (!element)
//                        return;
//
//                    return browser.elementByName("login").clickElement(element).type(username)
//                        .end()
//                        .elementByNameIfExists("password").clickElement().type(password)
//                        .end()
//                        .elementByNameIfExists("commit").clickElement()
//                        .end();
//                });
//            }

            return self;
        },

        storeWindowHandle: function () {
            var self = this;

            self.browser = self.browser.windowHandle().then(function (handle) {
                self.windowHandle = handle;
            });

            return self;
        }
    };
});