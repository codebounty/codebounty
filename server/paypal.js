var PAYPAL = (function () {
    var my = {}, request = require('request'),

    //the longest a bounty can be open for
        MAXDAYS = 90;

    /**
     * Executes an Adaptive Payments API call
     * @param operation Ex. Pay
     * @param fields The fields required for the API call
     * @param callback Passes an error or the response data
     */
    function execute(operation, fields, callback) {
        var headers = {
            "X-PAYPAL-APPLICATION-ID": CONFIG.paypalApi.APPLICATIONID,
            "X-PAYPAL-SECURITY-USERID": CONFIG.paypalApi.USERID,
            "X-PAYPAL-SECURITY-PASSWORD": CONFIG.paypalApi.PASSWORD,
            "X-PAYPAL-SECURITY-SIGNATURE": CONFIG.paypalApi.SIGNATURE,
            "X-PAYPAL-REQUEST-DATA-FORMAT": "JSON",
            "X-PAYPAL-RESPONSE-DATA-FORMAT": "JSON",
            "Content-Type": "application/json"
        };

        request.post({
            headers: headers,
            url: CONFIG.paypalApi.REQURL + "AdaptivePayments/" + operation,
            json: fields
        }, function (error, response, data) {
            if (error)
                callback(error);
            else if (data.responseEnvelope.ack !== "Success" && data.responseEnvelope.ack !== "SuccessWithWarning")
                callback(data.responseEnvelope.error.message);
            else
                callback(null, data);
        });
    }

//callback passes an error or the pre-approval of funds url
    my.GetApproval = function (amount, description, callback) {
        var startDate = new Date();
        var endDate = new Date();
        endDate.setDate(startDate.getDate() + MAXDAYS);

        var params = {
            endingDate: endDate.toISOString(),
            startingDate: startDate.toISOString(),
            maxTotalAmountOfAllPayments: amount,
            currencyCode: 'USD',
            cancelUrl: CONFIG.rootUrl + 'cancel',
            returnUrl: CONFIG.rootUrl + 'confirm',
            requestEnvelope: {
                errorLanguage: "en_US"
            },
            displayMaxTotalAmount: true,
            memo: description,
            ipnNotificationUrl: CONFIG.rootUrl + "approved"
        };

        execute('Preapproval', params, function (error, data) {
            if (error) {
                callback(error);
            } else if (data) {
                var preApprovalUrl = CONFIG.paypalApi.REDURL + "webscr?cmd=_ap-preapproval&preapprovalkey=" + data.preapprovalKey;
                callback(null, preApprovalUrl);
            }
        });
    };

    return my;
}());