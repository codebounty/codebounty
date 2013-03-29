//Contains all logic for interacting with paypal
CB.PayPal = (function () {
    var my = {}, request = require('request'),

    //the longest a bounty can be open for
        MAXDAYS = 90;

    //https://www.x.com/developers/paypal/documentation-tools/adaptive-payments/integration-guide/APIntro#id091QF0N0MPF__id092SH0050HS

    /**
     * Executes an Adaptive Payments API call
     * @param operation Ex. Pay
     * @param fields The fields required for the API call
     * @param callback Passes an error or the response data
     */
    function execute(operation, fields, callback) {
        var headers = {
            "X-PAYPAL-REQUEST-DATA-FORMAT": "JSON",
            "X-PAYPAL-APPLICATION-ID": Meteor.settings["PAYPAL_APPLICATIONID"],
            "X-PAYPAL-SECURITY-USERID": Meteor.settings["PAYPAL_USERID"],
            "X-PAYPAL-SECURITY-PASSWORD": Meteor.settings["PAYPAL_PASSWORD"],
            "X-PAYPAL-SECURITY-SIGNATURE": Meteor.settings["PAYPAL_SIGNATURE"],
            "X-PAYPAL-RESPONSE-DATA-FORMAT": "JSON",
            "Content-Type": "application/json"
        };

        if (!Meteor.settings["PRODUCTION"])
            headers["X-PAYPAL-SANDBOX-EMAIL-ADDRESS"] = Meteor.settings["SUPPORT_EMAIL"];

        request.post({
            headers: headers,
            url: Meteor.settings["PAYPAL_REQURL"] + "AdaptivePayments/" + operation,
            json: fields
        }, function (error, response, data) {
            if (error)
                callback(error);
            else if (data.responseEnvelope.ack !== "Success" && data.responseEnvelope.ack !== "SuccessWithWarning")
                callback(data.error);
            else
                callback(null, data);
        });
    }

//callback passes an error or the pre-approval of funds data and url
    my.GetApproval = function (amount, description, cancelUrl, confirmUrl, callback) {
        var startDate = new Date();
        var endDate = new Date();
        endDate.setDate(startDate.getDate() + MAXDAYS);

        var params = {
            endingDate: endDate.toISOString(),
            startingDate: startDate.toISOString(),
            maxTotalAmountOfAllPayments: amount,
            currencyCode: "USD",
            cancelUrl: cancelUrl,
            returnUrl: confirmUrl,
            requestEnvelope: {
                errorLanguage: "en_US"
            },
            displayMaxTotalAmount: true,
            memo: description,
            ipnNotificationUrl: Meteor.settings["ROOT_URL"] + "approved"
        };

        execute("Preapproval", params, function (error, data) {
            if (error) {
                callback(error);
            } else if (data) {
                var preApprovalUrl = Meteor.settings["PAYPAL_REDURL"] + "webscr?cmd=_ap-preapproval&preapprovalkey=" + data.preapprovalKey;
                callback(null, data, preApprovalUrl);
            }
        });
    };

    my.ConfirmApproval = function (preapprovalKey, callback) {
        var params = {
            preapprovalKey: preapprovalKey,
            requestEnvelope: {
                errorLanguage: "en_US"
            }
        };

        execute("PreapprovalDetails", params, function (error, data) {
            if (error) {
                CBError.PayPal.PreApproval();
                callback(error);
            } else if (data) {
                callback(null, data);
            }
        });
    };

    //pay a set of users

    /**
     *
     * @param preapprovalKey
     * @param receiverList ex. [{email: "perl.jonathan@gmail.com", amount: 100.12}, ..]
     * @param callback (error, data)
     */
    my.Pay = function (preapprovalKey, receiverList, callback) {
        //details here https://www.x.com/developers/paypal/documentation-tools/api/Pay-api-operation
        //note fee calculation here: https://www.x.com/devzone/articles/adaptive-payment-fee-calculation-analysis

        var rootUrl = Meteor.settings["ROOT_URL"];

        //TODO pin? here and on preapproval store it
        var params = {
            actionType: "PAY",
            currencyCode: "USD",
            receiverList: receiverList,
            feesPayer: "EACHRECEIVER",
            preapprovalKey: preapprovalKey,
            requestEnvelope: {
                errorLanguage: "en_US"
            },
            //not used but required
            cancelUrl: rootUrl,
            returnUrl: rootUrl
        };

        execute("Pay", params, function (error, data) {
            callback(error, data);
        });
    };

//TODO setup Chained Payment https://www.x.com/developers/paypal/documentation-tools/api/pay-api-operation
//https://www.x.com/developers/paypal/documentation-tools/adaptive-payments/integration-guide/APIntro

    return my;
})();