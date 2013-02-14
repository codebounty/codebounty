var PAYPAL = (function () {
    var my = {};

    var PayPalEC = NodeModules.require('paypal-ec');

    var credentials = {
        username: 'bmerch_1360785614_biz_api1.facebook.com',
        password: '1360785637',
        signature: 'AFLo3RwkMoqnUrSwAke80UjuJb.pA-5bJWD1xBV-NXH-IU0yavWsT3eg'
    };

    var opts = {
        sandbox: true,
        version: '95'
    };

    //https://www.x.com/developers/paypal/documentation-tools/express-checkout/how-to/ht_ec-singleAuthPayment-curl-etc
    //callback passes an error or the express checkout url
    my.StartCheckout = function (amount, description, callback) {
        var ec = new PayPalEC(credentials, opts);

        var params = {
            returnUrl: 'http://localhost:3000/confirm',
            cancelUrl: 'http://localhost:3000/cancel',
            PAYMENTACTION: 'Authorization',
            AMT: amount,
            CURRENCYCODE: 'USD',
            DESC: description
        };

        ec.set(params, function (error, data) {
            if (error)
                callback(error);
            else
                callback(null, data['PAYMENTURL']);
        });
    };

    //confirms the payment
    //callback passes an error or the confirmed checkout data
    my.Confirm = function (token, payerId, callback) {
        var ec = new PayPalEC(credentials, opts);

        var params = {
            TOKEN: token,
            PAYERID: payerId,
            PAYMENTACTION: 'Authorization',
            AMT: '10.0'
        };

        ec.do_payment(params, function (error, data) {
            callback(error, data);
        });
    }

    return my;
}());