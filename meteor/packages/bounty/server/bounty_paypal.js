//contains paypal bounty interactions
Bounty.PayPal = {};

//need to use localtunnel url for local testing instead of root url

var rootUrl = Meteor.settings["ROOT_URL"];

/**
 * Initiate a bounty payment through paypal
 * @param bounty
 * @param callback pass the url to redirect to
 */
Bounty.PayPal.create = function (bounty, callback) {
    var cancel = rootUrl + "cancelCreateBounty?id=" + bounty._id;
    var confirm = rootUrl + "confirmBounty?id=" + bounty._id;

    var endDate = Tools.addDays(Bounty.expiresAfterDays);

    //Start pre-approval process
    PayPal.getApproval(bounty.amount, bounty.desc, endDate, cancel, confirm, function (error, data, approvalUrl) {
        if (error)
            PayPal.errors.preapproval();

        Fiber(function () {
            Bounties.update({_id: bounty._id}, {$set: {preapprovalKey: data.preapprovalKey}})
        }).run();

        callback(approvalUrl);
    });
};

Bounty.PayPal.pay = function (bounty, receiverList) {
    PayPal.pay(bounty.preapprovalKey, receiverList, function (error, data) {
        var update = {};

        if (error) {
            update["reward.error"] = error;

            console.log("ERROR: PayPal Payment", error);
        } else {
            update["reward.paid"] = new Date();

            console.log("PayPal Paid", bounty);
        }

        Fiber(function () {
            Bounties.update(bounty._id, {$set: update});
        }).run();
    });
};

/**
 * After an ipn message confirms a bounty payment has been authorized
 * store the token and payer id to capture the payment later
 * and post the bounty comment
 * @param params The IPN message parameters
 */
Bounty.PayPal.confirm = function (params) {
    Fiber(function () {
        var bounty = Bounties.findOne({preapprovalKey: params.preapproval_key});

        if (params.approved !== "true" || parseFloat(params.max_total_amount_of_all_payments) !== bounty.amount)
            PayPal.errors.notApproved();

        Bounties.update(bounty, {$set: {approved: true}});

        console.log("PayPal confirmed", bounty._id);

        var imageUrl = rootUrl + "bounty/" + bounty._id;
        var commentBody = "[![Code Bounty](" + imageUrl + ")](" + rootUrl + ")";

        //post comment the comment using codebounty charlie
        var gitHub = new GitHub();
        gitHub.postComment(bounty, commentBody);
    }).run();
};