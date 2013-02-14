var PAYPAL = (function () {
    var my = {}, sandbox = true,
        url = require('url'),
        NVPRequest = NodeModules.require('paypal-nvp-request'),
        SANDBOX_URL = 'www.sandbox.paypal.com', REGULAR_URL = 'www.paypal.com';

    function createRequest() {
        var credentials = {
            username: 'bmerch_1360785614_biz_api1.facebook.com',
            password: '1360785637',
            signature: 'AFLo3RwkMoqnUrSwAke80UjuJb.pA-5bJWD1xBV-NXH-IU0yavWsT3eg'
        };

        var opts = {
            sandbox: sandbox,
            version: '95'
        };


        var nvpreq = new NVPRequest(credentials, opts);
        return nvpreq;
    }

    //https://www.x.com/developers/paypal/documentation-tools/express-checkout/how-to/ht_ec-singleAuthPayment-curl-etc
    //callback passes an error or the express checkout url
    my.StartCheckout = function (amount, description, callback) {
        var request = createRequest();

        var params = {
            returnUrl: 'http://localhost:3000/confirm',
            cancelUrl: 'http://localhost:3000/cancel',
            PAYMENTACTION: 'Authorization',
            AMT: amount,
            CURRENCYCODE: 'USD',
            DESC: description
        };

        request.execute('SetExpressCheckout', params, function (error, data) {
            if (error) {
                callback(error);
            } else {
                var paymentUrl = url.format({
                    protocol: 'https:',
                    host: sandbox ? SANDBOX_URL : REGULAR_URL,
                    pathname: '/cgi-bin/webscr',
                    query: {
                        cmd: '_express-checkout',
                        token: data.TOKEN
                    }
                });

                console.log(paymentUrl);

                callback(null, paymentUrl);
            }
        });
    };

    //confirms the payment
    //callback passes an error or the confirmed checkout data
    my.Confirm = function (token, payerId, callback) {
        var request = createRequest();

        var params = {
            TOKEN: token,
            PAYERID: payerId,
            PAYMENTACTION: 'Authorization',
            AMT: '10.0'
        };

        request.execute('GetExpressCheckoutDetails', params, function (error, data) {
            callback(error, data);
        });
    }

    return my;
}());