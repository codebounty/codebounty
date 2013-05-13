//contains paypal bounty interactions
Bounty.PayPal = {};

//note when testing, this must go through a tunnel for the GitHub comment image
var rootUrl = Meteor.settings["ROOT_URL"];

/**
 * Initiate a bounty payment through paypal
 * @param bounty
 * @param callback pass the url to redirect to
 */
Bounty.PayPal.create = function (bounty, callback) {
    var cancel = rootUrl + "cancelCreateBounty?id=" + bounty._id;
    var confirm = rootUrl + "confirmBounty?id=" + bounty._id;

    var endDate = Tools.addDays(BountyUtils.expiresAfterDays);

    var issue = GitHubUtils.getIssue(bounty.issueUrl);
    var description = "$" + bounty.amount + " bounty for Issue #" + issue.number + " in " + issue.repo.name;

    //Start pre-approval process
    PayPal.getApproval(bounty.amount, description, endDate, cancel, confirm, function (error, data, approvalUrl) {
        if (error)
            PayPal.errors.preapproval();

        Fiber(function () {
            Bounties.update({_id: bounty._id}, {$set: {preapprovalKey: data.preapprovalKey}})
        }).run();

        callback(approvalUrl);
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

        //create the reward
        RewardUtils.addBounty(bounty);
    }).run();
};

Bounty.PayPal.pay = function (bounty, receiverList) {
    console.log("Pay bounty", bounty._id, receiverList);
    PayPal.pay(bounty.preapprovalKey, receiverList, function (error, data) {
        var update = {};

        if (error) {
            update["paymentError"] = error;
            console.log("ERROR: PayPal Payment", error);
        } else {
            update["paid"] = new Date();
            console.log("PayPal paid", bounty._id);
        }

        Fiber(function () {
            Bounties.update(bounty._id, {$set: update});
        }).run();
    });
};