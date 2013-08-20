define(["config"], function (config) {
    var ddp = new MeteorDdp("ws://" + config.baseUrl + "/websocket");

    //check we can access the required scopes for this user
    //then either initialize the ui or ask the user to login
    var authorizationAttempts = 0;
    var checkGitHubAuthorization = function (def) {
        if (!def)
            def = $.Deferred();

        if (authorizationAttempts > 3) {
            def.reject("Could not get authorized for the required access");
            return;
        }

        ddp.call("checkAuthorization").done(function (hasProperAuthorization) {
            if (hasProperAuthorization) {
                def.resolve();
                return;
            }

            var tryAgain = function () {
                authorizationAttempts++;
                checkGitHubAuthorization(def);
            };

            //if not lets re-prompt the user for authorization again
            ddp.oauthPrompt().then(tryAgain, tryAgain);
        });

        return def.promise();
    };

    return {
        /**
         * Connect to the server and attempt to get authorization for GitHub
         * @param {Function} onConnected
         * @param {Function} onAuthenticated
         * @param {Function} onAuthorized
         */
        connect: function (onConnected, onAuthenticated, onAuthorized) {
            ddp.connect().then(function () {
                if (onConnected)
                    onConnected();

                ddp.loginWithOauth(function (credentialToken) {
                    return "https://github.com/login/oauth/authorize" +
                        "?client_id=" + config.githubClientId +
                        "&scope=" + ["user:email", "repo"].map(encodeURIComponent).join('+') +
                        "&redirect_uri=" + config.rootUrl + "/_oauth/github?close" +
                        "&state=" + credentialToken;
                }).then(function () {
                        if (onAuthenticated)
                            onAuthenticated();

                        checkGitHubAuthorization().then(onAuthorized);
                    });
            });
        },
        ddp: ddp
    };
});