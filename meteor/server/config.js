//TODO move to config file
var CONFIG = (function () {
    var my = {};

    my.rootUrl = 'http://localhost:3000/';

    my.paypalApi = {
        //URL: 'https://svcs.paypal.com/',
        APPLICATIONID: 'APP-80W284485P519543T',
        REQURL: 'https://svcs.sandbox.paypal.com/',
        REDURL: 'https://www.sandbox.paypal.com/',
        USERID: 'bmerch_1360785614_biz_api1.facebook.com',
        PASSWORD: '1360785637',
        SIGNATURE: 'AFLo3RwkMoqnUrSwAke80UjuJb.pA-5bJWD1xBV-NXH-IU0yavWsT3eg'
    };

    return my;
}());