//contains bounty payment logic
(function () {
    var my = CB.Bounty;

    /**
     * Pay a bounty
     * @param bounty
     */
    my.Pay = function (bounty) {
        var receiverList = _.map(bounty.reward.payout, function (payout) {
            var receiver = {email: payout.email, amount: payout.amount};
            return receiver;
        });

        CB.PayPal.Pay(bounty.preapprovalKey, receiverList, function (error, data) {
            var update = {};

            if (error) {
                update["reward.error"] = error;

                console.log("ERROR: PayPal Payment", error);
            } else {
                update["reward.paid"] = new Date();

                console.log("Paid", bounty);
            }

            Fiber(function () {
                Bounties.update(bounty._id, {$set: update});
            }).run();
        });
    };

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
    my.InitiatePayout = function (gitHubInstance, bounties, payout, by, callback) {
        var totalUserPayout = 0;
        //remove any extra decimals on the user payouts
        _.each(payout, function (userPayout) {
            userPayout.amount = CB.Tools.Truncate(userPayout.amount, 2);
            totalUserPayout += userPayout.amount;
        });

        CB.Payout.CheckValidity(bounties, payout);

        //confirm the payout amount is only to users who have contributed
        //all the bounties on the issue will have the same contributors, so lookup the first bounty's contributors
        CB.Bounty.Contributors(gitHubInstance, bounties[0], function (contributors) {
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
                CB.Error.Bounty.Reward.NotEligible();

            //everything is a-okay

            //pay codebounty it's fee
            var bountyAmount = CB.Payout.Sum(bounties);
            var fee = CB.Payout.Fee(bountyAmount, totalUserPayout);
            var codeBountyPayout = {email: Meteor.settings["PAYPAL_PAYMENTS_EMAIL"], amount: fee};
            payout.push(codeBountyPayout);

            var seventyTwoHours = CB.Tools.AddMinutes(60 * 72);
//            var seventyTwoHours = CB.Tools.AddMinutes(1);

            var bountyIds = _.pluck(bounties, "_id").join(",");

            console.log("Initiating payout for", bountyIds, "total", payout);

            var payoutDistribution = CB.Payout.Distribute(bounties, payout);
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

            //TODO comment on the issue w planned contribution split
            callback();
        });
    };

    /**
     * Cancel a payout because an issue got reopened before the hold period was over
     */
    my.CancelPayout = function (bounties, callback) {
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
                CB.Bounty.Pay(bounty);
            });
        }, 10000);
    };

    Meteor.startup(function () {
        processBountyPayments();
    });
})();