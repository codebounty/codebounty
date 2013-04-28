//contains bounty payment logic
//todo bitcoin this file contains bitcoin todos

/**
 * Pay a bounty
 * @param bounty
 */
Bounty.pay = function (bounty) {
    var receiverList = _.map(bounty.reward.payout, function (payout) {
        var receiver = {email: payout.email, amount: payout.amount};
        return receiver;
    });

    //todo bitcoin check type and choose bitcoin.pay here if the bounty type is bitcoin
    Bounty.PayPal.pay(bounty, receiverList);
};

//todo bitcoin refactor out PayPal specific logic here
/**
 * Set the payout amounts when a backer rewards a bounty
 * post a comment on the issue with the payout amounts
 * and after 72 hours if no one disputes, the bounty will automatically be paid out with this amount
 * @param [gitHubInstance] If not passed, will create one with the current user
 * @param bounties the bounties to payout
 * @param {Array.<{email, amount}>} payout [{email: "perl.jonathan@gmail.com", amount: 50}, ..] and their payouts
 * @param by Who the reward was initiated by (the backer userId, "system", future: "moderator")
 * @param callback Called if there is no error
 * Ex. {"email": amount, "perl.jonathan@gmail.com": 51.50 }
 */
Bounty.initiatePayout = function (gitHubInstance, bounties, payout, by, callback) {
    var totalUserPayout = 0;
    //remove any extra decimals on the user payouts
    _.each(payout, function (userPayout) {
        userPayout.amount = Tools.truncate(userPayout.amount, 2);
        totalUserPayout += userPayout.amount;
    });

    Payout.checkValidity(bounties, payout);

    //confirm the payout amount is only to users who have contributed
    //all the bounties on the issue will have the same contributors, so lookup the first bounty's contributors
    Bounty.contributors(gitHubInstance, bounties[0], function (contributors) {
        var assignedPayouts = _.pluck(payout, "email");

        //make sure every user that has contributed code has been assigned a bounty (even if it is 0)
        var allAssignedPayouts = _.every(contributors, function (contributor) {
            var assignedPayout = _.some(assignedPayouts, function (payoutEmail) {
                return contributor.email === payoutEmail;
            });

            return assignedPayout;
        });

        //and no one else has been assigned a bounty
        if (!(allAssignedPayouts && contributors.length === assignedPayouts.length))
            Payout.errors.notEligible();

        //everything is a-okay

        //pay codebounty it's fee
        var bountyAmount = Payout.sum(bounties);
        var fee = Payout.fee(bountyAmount, totalUserPayout);
        var codeBountyPayout = {email: Meteor.settings["PAYPAL_PAYMENTS_EMAIL"], amount: fee};
        payout.push(codeBountyPayout);

        var seventyTwoHours = Tools.addMinutes(60 * 72);
//            var seventyTwoHours = Tools.addMinutes(1);

        var bountyIds = _.pluck(bounties, "_id").join(",");

        console.log("Initiating payout for", bountyIds, "total", payout);

        var payoutDistribution = Payout.distribute(bounties, payout);
        var payoutIndex = 0;

        //payout group id (for the aggregated comment)
        var groupId = new Meteor.Collection.ObjectID();

        //used for grouping
        _.each(bounties, function (bounty) {
            var payout = payoutDistribution[payoutIndex];

            var reward = {
                by: by,
                updated: new Date(),
                planned: seventyTwoHours,
                payout: payout,
                group: groupId,
                paid: null,
                started: null,
                hold: false
            };

            bounty.reward = reward;

            console.log("split for", bounty._id, "is", payout);

            //after the reward is planned it will automatically be scheduled for payout in processBountyPayments
            Fiber(function () {
                Bounties.update(bounty._id, {$set: {reward: reward}});
            }).run();

            payoutIndex++;
        });

        callback();
    });
};

/**
 * Cancel a payout because an issue got reopened before the hold period was over
 */
Bounty.cancelPayout = function (bounties, callback) {
    _.each(bounties, function (bounty) {
        Bounties.update(bounty._id, {$set: {reward: null}});
    });

    if (callback)
        callback();
};

/**
 * check every 10 seconds for bounties that should be paid
 * note: limited at 60 payments/minute (6/minute * 10/time)
 * todo scalability: move this to separate process
 */
var processBountyPayments = function () {
    Meteor.setInterval(function () {
        //all bounties ready to be paid out
        var bountiesToPay = Bounties.find({
            "reward.paid": null,
            "reward.hold": false,
            "reward.planned": {$lte: new Date()},
            "reward.started": null
        }, {
            limit: 10
        }).fetch();

        bountiesToPay.forEach(function (bounty) {
            Bounties.update(bounty._id, {$set: {"reward.started": new Date()}});
            Bounty.pay(bounty);
        });
    }, 10000);
};

Meteor.startup(function () {
    processBountyPayments();
});