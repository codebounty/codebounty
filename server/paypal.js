var PAYPAL = (function () {
    var my = {};

    var cred = {
        username: 'seller_1339472528_biz_api1.gmail.com',
        password: '1339472553',
        signature: 'AFcWxV21C7fd0v3bYYYRCpSSRl31Af-aECo8vsiP1HospgIyBCFncbx3'
    };

    //https://www.x.com/developers/paypal/documentation-tools/express-checkout/how-to/ht_ec-singleAuthPayment-curl-etc
    //callback returns the express checkout url
    my.StartCheckout = function (callback) {
        var PayPalEC = NodeModules.require('paypal-ec');

        var opts = {
            sandbox: true,
            version: '78.0'
        };

        var ec = new PayPalEC(cred, opts);

        var params = {
            returnUrl: 'http://localhost:3000/confirm',
            cancelUrl: 'http://localhost:3000/cancel',
            SOLUTIONTYPE: 'sole',
            PAYMENTREQUEST_0_AMT: '10.0',
            PAYMENTREQUEST_0_DESC: 'Something',
            PAYMENTREQUEST_0_CURRENCYCODE: 'USD',
            PAYMENTREQUEST_0_PAYMENTACTION: 'Sale'
        };

        ec.set(params, function (err, data) {
            callback(data['PAYMENTURL']);
        });
    };

    return my;
}());