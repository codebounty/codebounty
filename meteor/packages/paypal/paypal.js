//Contains all logic for interacting with paypal

PayPal = {};

var request = Npm.require("request"),
    ipn = Npm.require("paypal-ipn");

var rootUrl = Meteor.settings["ROOT_URL"],
//note when testing, this must go through a tunnel (for PayPal)
    ipnUrl = rootUrl + "ipn";

//https://www.x.com/developers/paypal/documentation-tools/adaptive-payments/integration-guide/APIntro#id091QF0N0MPF__id092SH0050HS

/**
 * Executes an Adaptive Payments API call
 * @param operation Ex. Pay
 * @param fields The fields required for the API call
 * @param callback Passes an error or the response data
 */
var execute = function (operation, fields, callback) {
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
};

//Adaptive Payments https://developer.paypal.com/webapps/developer/docs/classic/api/

//callback passes an error or the pre-approval of funds data and url
PayPal.getApproval = function (amount, description, endDate, cancelUrl, confirmUrl, callback) {
    var startDate = new Date();

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
        ipnNotificationUrl: ipnUrl
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

//https://developer.paypal.com/webapps/developer/docs/classic/api/adaptive-payments/CancelPreapproval_API_Operation/
PayPal.cancelPreapproval = function (preapprovalKey, callback) {
    var params = {
        preapprovalKey: preapprovalKey,
        requestEnvelope: {
            errorLanguage: "en_US"
        }
    };

    execute("CancelPreapproval", params, function (error, data) {
        if (error)
            callback(error);
        else if (data)
            callback(null, data);
    });
};

PayPal.confirmApproval = function (preapprovalKey, callback) {
    var params = {
        preapprovalKey: preapprovalKey,
        requestEnvelope: {
            errorLanguage: "en_US"
        }
    };

    execute("PreapprovalDetails", params, function (error, data) {
        if (error)
            callback(error);
        else if (data)
            callback(null, data);
    });
};

/**
 * Make a payment to a set of receivers
 * https://developer.paypal.com/webapps/developer/docs/classic/api/adaptive-payments/Preapproval_API_Operation/
 * @param preapprovalKey
 * @param receiverList ex. [{email: "perl.jonathan@gmail.com", amount: 100.12}, ..]
 * @param callback (error, data)
 */
PayPal.pay = function (preapprovalKey, receiverList, callback) {
    //fee calculation here: https://www.x.com/devzone/articles/adaptive-payment-fee-calculation-analysis

    //only need to pay the people getting > $0
    //remove any decimals past 0.01
    receiverList = _.filter(receiverList, function (receiver) {
        return receiver.amount > 0;
    });

    receiverList = {"receiver": receiverList};

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

/**
 * Verify IPN message
 * @param request
 * @param response
 * @param callback (error, params, message)
 */
PayPal.verify = function (request, response, callback) {
    var params = request.body;

    ipn.verify(params, function (error, message) {
        if (error || message !== "VERIFIED")
            console.log("Error verifying IPN", message, params);

        if (callback) {
            callback(error, params, message);
        }
    });
};