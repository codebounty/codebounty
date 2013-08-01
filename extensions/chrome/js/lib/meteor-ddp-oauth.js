Random = {};
//from https://github.com/meteor/meteor/blob/master/packages/random/random.js
(function () {
// see http://baagoe.org/en/wiki/Better_random_numbers_for_javascript
// for a full discussion and Alea implementation.
    Random._Alea = function () {
        function Mash() {
            var n = 0xefc8249d;

            var mash = function (data) {
                data = data.toString();
                for (var i = 0; i < data.length; i++) {
                    n += data.charCodeAt(i);
                    var h = 0.02519603282416938 * n;
                    n = h >>> 0;
                    h -= n;
                    h *= n;
                    n = h >>> 0;
                    h -= n;
                    n += h * 0x100000000; // 2^32
                }
                return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
            };

            mash.version = 'Mash 0.9';
            return mash;
        }

        return (function (args) {
            var s0 = 0;
            var s1 = 0;
            var s2 = 0;
            var c = 1;

            if (args.length == 0) {
                args = [+new Date];
            }
            var mash = Mash();
            s0 = mash(' ');
            s1 = mash(' ');
            s2 = mash(' ');

            for (var i = 0; i < args.length; i++) {
                s0 -= mash(args[i]);
                if (s0 < 0) {
                    s0 += 1;
                }
                s1 -= mash(args[i]);
                if (s1 < 0) {
                    s1 += 1;
                }
                s2 -= mash(args[i]);
                if (s2 < 0) {
                    s2 += 1;
                }
            }
            mash = null;

            var random = function () {
                var t = 2091639 * s0 + c * 2.3283064365386963e-10; // 2^-32
                s0 = s1;
                s1 = s2;
                return s2 = t - (c = t | 0);
            };
            random.uint32 = function () {
                return random() * 0x100000000; // 2^32
            };
            random.fract53 = function () {
                return random() +
                    (random() * 0x200000 | 0) * 1.1102230246251565e-16; // 2^-53
            };
            random.version = 'Alea 0.9';
            random.args = args;
            return random;

        }(Array.prototype.slice.call(arguments)));
    };

// instantiate RNG.  Heuristically collect entropy from various sources

// client sources
    var height = (typeof window !== 'undefined' && window.innerHeight) ||
        (typeof document !== 'undefined'
            && document.documentElement
            && document.documentElement.clientHeight) ||
        (typeof document !== 'undefined'
            && document.body
            && document.body.clientHeight) ||
        1;

    var width = (typeof window !== 'undefined' && window.innerWidth) ||
        (typeof document !== 'undefined'
            && document.documentElement
            && document.documentElement.clientWidth) ||
        (typeof document !== 'undefined'
            && document.body
            && document.body.clientWidth) ||
        1;

    var agent = (typeof navigator !== 'undefined' && navigator.userAgent) || "";

// server sources
    var pid = (typeof process !== 'undefined' && process.pid) || 1;

// XXX On the server, use the crypto module (OpenSSL) instead of this PRNG.
//     (Make Random.fraction be generated from Random.hexString instead of the
//     other way around, and generate Random.hexString from crypto.randomBytes.)
    Random.fraction = new Random._Alea([
        new Date(), height, width, agent, pid, Math.random()]);

    Random.choice = function (arrayOrString) {
        var index = Math.floor(Random.fraction() * arrayOrString.length);
        if (typeof arrayOrString === "string")
            return arrayOrString.substr(index, 1);
        else
            return arrayOrString[index];
    };

    var UNMISTAKABLE_CHARS = "23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz";
    Random.id = function () {
        var digits = [];
        // Length of 17 preserves around 96 bits of entropy, which is the
        // amount of state in our PRNG
        for (var i = 0; i < 17; i++) {
            digits[i] = Random.choice(UNMISTAKABLE_CHARS);
        }
        return digits.join("");
    };
})();

Oauth = {};
//from https://github.com/meteor/meteor/blob/master/packages/oauth/oauth_client.js
(function () { // Open a popup window pointing to a OAuth handshake page
//
// @param credentialToken {String} The OAuth credentialToken generated by the client
// @param url {String} url to page
// @param credentialRequestCompleteCallback {Function} Callback function to call on
//   completion. Takes one argument, credentialToken on success, or Error on
//   error.
// @param dimensions {optional Object(width, height)} The dimensions of
//   the popup. If not passed defaults to something sane
    Oauth.initiateLogin = function (credentialToken, url, credentialRequestCompleteCallback, dimensions) {
        // default dimensions that worked well for facebook and google
        var popup = openCenteredPopup(
            url,
            (dimensions && dimensions.width) || 650,
            (dimensions && dimensions.height) || 331);

        var checkPopupOpen = setInterval(function () {
            try {
                // Fix for #328 - added a second test criteria (popup.closed === undefined)
                // to humour this Android quirk:
                // http://code.google.com/p/android/issues/detail?id=21061
                var popupClosed = popup.closed || popup.closed === undefined;
            } catch (e) {
                // For some unknown reason, IE9 (and others?) sometimes (when
                // the popup closes too quickly?) throws "SCRIPT16386: No such
                // interface supported" when trying to read 'popup.closed'. Try
                // again in 100ms.
                return;
            }

            if (popupClosed) {
                clearInterval(checkPopupOpen);
                credentialRequestCompleteCallback(credentialToken);
            }
        }, 100);
    };


    var openCenteredPopup = function (url, width, height) {
        var screenX = typeof window.screenX !== 'undefined'
            ? window.screenX : window.screenLeft;
        var screenY = typeof window.screenY !== 'undefined'
            ? window.screenY : window.screenTop;
        var outerWidth = typeof window.outerWidth !== 'undefined'
            ? window.outerWidth : document.body.clientWidth;
        var outerHeight = typeof window.outerHeight !== 'undefined'
            ? window.outerHeight : (document.body.clientHeight - 22);
        // XXX what is the 22?

        // Use `outerWidth - width` and `outerHeight - height` for help in
        // positioning the popup centered relative to the current window
        var left = screenX + (outerWidth - width) / 2;
        var top = screenY + (outerHeight - height) / 2;
        var features = ('width=' + width + ',height=' + height +
            ',left=' + left + ',top=' + top);

        var newwindow = window.open(url, 'Login', features);
        if (newwindow.focus)
            newwindow.focus();
        return newwindow;
    };

}).call(this);

//options ex:
//{
//    clientId: "1234a56b7a890123b4a56",
//    oauthUrl: "https://github.com/login/oauth/authorize",
//    redirectUrl: "http://localhost:3000/_oauth/github?close",
//    scopes: ["user:email"]
//}
MeteorDdp.prototype.loginWithOauth = function (options) {
    var self = this;

    self.oauth = options;

    //if there is a login token try to resume the session
    var loginToken = localStorage.getItem(self._loginTokenKey);
    if (loginToken)
        return self._resumeSession(loginToken);
    else
        return self.oauthPrompt();
};

MeteorDdp.prototype._loginTokenKey = "Meteor.loginToken";
MeteorDdp.prototype.oauthPrompt = function () {
    var def = $.Deferred();
    var credentialToken = Random.id(),
        self = this,
        loginUrl = self.oauth.oauthUrl +
            "?client_id=" + self.oauth.clientId +
            "&scope=" + self.oauth.scopes.map(encodeURIComponent).join('+') +
            "&redirect_uri=" + self.oauth.redirectUrl +
            "&state=" + credentialToken;

    Oauth.initiateLogin(credentialToken, loginUrl,
        function () {
            //after the login popup closes attempt to login
            self.call("login", [
                    { oauth: { credentialToken: credentialToken }}
                ])
                .done(function (data) {
                    //if we were successful logging in with the credential token then store it
                    localStorage.setItem(self._loginTokenKey, data.token);
                    def.resolve();
                })
                .fail(function (error) {
                    def.reject(error);
                });
        }, {width: 900, height: 450});

    return def.promise();
};

MeteorDdp.prototype._resumeSession = function (loginToken) {
    var self = this;

    return self.call("login", [
            { resume: loginToken }
        ])
        .fail(function () {
            return self.oauthPrompt();
        });
};