var PAYPAL = (function () {
    var my = {};

    var credentials = {
        username: 'bmerch_1360785614_biz_api1.facebook.com',
        password: '1360785637',
        signature: 'AFLo3RwkMoqnUrSwAke80UjuJb.pA-5bJWD1xBV-NXH-IU0yavWsT3eg'
    };

    //https://www.x.com/developers/paypal/documentation-tools/express-checkout/how-to/ht_ec-singleAuthPayment-curl-etc
    //callback returns the express checkout url
    my.StartCheckout = function (callback) {
        var PayPalEC = NodeModules.require('paypal-ec');

        var opts = {
            sandbox: true,
            version: '95'
        };

        var ec = new PayPalEC(credentials, opts);

        var params = {
            returnUrl: 'http://localhost:3000/confirm',
            cancelUrl: 'http://localhost:3000/cancel',
            PAYMENTREQUEST_0_PAYMENTACTION: 'Authorization',
            PAYMENTREQUEST_0_AMT: '10.0',
            PAYMENTREQUEST_0_CURRENCYCODE: 'USD',
            PAYMENTREQUEST_0_DESC: 'A code bounty for Issue ...'
        };

        ec.set(params, function (err, data) {
            callback(data['PAYMENTURL']);
        });
    };

    return my;
}());