//contains reward payment options

//how long (in minutes) to payout the bounty once it is rewarded
//var payoutWindow = 60 * 72; //72 hours
//for testing
var payoutWindow = 2; //2 minutes

/**
 * Cancel the payout
 * @param status The status to change the reward to Ex. "reopened"
 */
Reward.prototype.cancelPayout = function (status) {
    console.log("Cancelled payout for", this._id);

    //deleting the payout will cancel it
    Rewards.update(this._id, {
        $set: {
            payout: null,
            status: status
        }
    });
};

/**
 * Try to distribute the rewards equally among the receivers
 */
Reward.prototype.distributeEqually = function () {
    var that = this;

    var receivers = that.receivers;

    //nothing to distribute
    if (receivers.length <= 0)
        return;

    var minimumReward = ReceiverUtils.minimum(that.currency);
    var amountToDistribute = that.total();

    var equallyDistributed = amountToDistribute.div(receivers.length);
    //equally distribute the reward
    if (equallyDistributed.cmp(minimumReward) >= 0) {
        _.each(receivers, function (receiver) {
            receiver.setReward(equallyDistributed);
        });
    }
    //pay as many of the contributors as possible
    else {
        var numberCanPay = amountToDistribute.div(minimumReward).toFixed(0);
        equallyDistributed = amountToDistribute.div(numberCanPay);

        for (var i = 0; i < receivers.length; i++) {
            var receiver = receivers[i];

            var rewardAmount = new Big(0);
            if (i < numberCanPay)
                rewardAmount = equallyDistributed;

            receiver.setReward(rewardAmount);
        }
    }
};

/**
 * NOTE: Only call this after updating the reward's receivers
 * Initiates a payout by changing the status to initiated and storing the payout
 * after 72 hours if no one disputes the reward will automatically be paid out
 * @param by Who the reward was initiated by (the backer userId, "system", future: "moderator")
 * @param callback (error, success)
 */
Reward.prototype.initiatePayout = function (by, callback) {
    var that = this;

    if (by !== that.userId && by !== "system") {
        callback("Reward cannot be initiated by " + by, false);
        return;
    }

    //if there are validation errors, throw the first one
    var errors = that.validationErrors();
    if (errors.length > 0) {
        callback(errors[0], false);
        return;
    }

    console.log("Initiated payout by", by, "for", that._id);

    that.status = "initiated";
    that.payout = {
        by: by,
        on: Tools.addMinutes(payoutWindow)
    };

    //after the payout is set, it will automatically be paid
    Rewards.update(that._id, that.toJSONValue());

    callback(null, true);
};

/**
 * Pay the reward
 */
Reward.prototype.pay = function () {
    var that = this;
    var payments = that.payments();

    Rewards.update(that._id, {$set: {status: "paid"}});

    console.log("Pay reward", that._id, _.map(payments, function (bountyPayout) {
        return bountyPayout.payments;
    }));

    if (that.currency === "usd") {
        _.each(payments, function (bountyPayout) {
            //load the bounty
            var bounty = Bounties.findOne(bountyPayout.bountyId);

            var receiverList = _.map(bountyPayout.payments, function (payment) {
                return { amount: payment.amount.toString(), email: payment.email};
            });

            Bounty.PayPal.pay(bounty, receiverList);
        });
    }
    else if (that.currency === "btc") {
        throw "Not implemented yet";
    }
};

/**
 * Distributes receiver rewards and the fee payments across each bounty
 * @returns {Array.<{bountyId, payments: Array.<{email, amount: Big}>}>}
 */
Reward.prototype.payments = function () {
    var allPayments = [];

    var that = this;

    //setup the receiver payouts to distribute
    var payouts = _.map(that.receivers, function (receiver) {
        return { email: receiver.email, amount: receiver.getReward() };
    });

    //pay codebounty the fee
    payouts.push({ email: Meteor.settings["PAYPAL_PAYMENTS_EMAIL"], amount: that.fee() });

    //keep track of the current payout to distribute
    var payoutIndex = 0;
    var currentPayout = payouts[payoutIndex];
    var remainingPayout = currentPayout.amount;

    //move through each bounty to distribute, one by one
    for (var bountyIndex = 0; bountyIndex < that.bountyIds.length; bountyIndex++) {
        //track how much the current bounty has remaining
        var remainingBounty = that.bountyAmounts[bountyIndex];

        var bountyPayments = {
            bountyId: that.bountyIds[bountyIndex],
            payments: []
        };

        //while there is money on the bounty and more payouts to distribute
        //keep adding payments to this bounty
        while (remainingBounty.cmp(0) > 0 && payoutIndex < payouts.length) {
            var payment = {
                email: currentPayout.email
            };

            //if there is enough bounty left, pay the entire remaining payout
            if (remainingBounty.cmp(remainingPayout) >= 0) {
                //distribute the entire payout
                payment.amount = remainingPayout;

                //move onto the next payout
                payoutIndex++;
                if (payoutIndex < payouts.length) {
                    currentPayout = payouts[payoutIndex];
                    remainingPayout = currentPayout.amount;
                }
            }
            //otherwise pay whatever is remaining on the bounty
            else {
                payment.amount = remainingBounty;

                //update how much still needs to be paid
                remainingPayout = remainingPayout.minus(remainingBounty);
            }

            //reduce the amount left on this bounty
            remainingBounty = remainingBounty.minus(payment.amount);

            if (remainingBounty.cmp(0) < 0)
                throw "Problem with distributing the bounty, it is below 0";

            bountyPayments.payments.push(payment);
        }

        allPayments.push(bountyPayments);
    }

    if (payoutIndex < payouts.length)
        throw "Problem with distributing the bounty, not all the receivers were paid";

    return allPayments;
};

/**
 * check every 10 seconds for rewards that should be paid
 * note: limited at 60 payments/minute (6/minute * 10/time)
 * todo scalability: move this to separate process
 */
Meteor.setInterval(function () {
    //all rewards ready to be paid
    var rewardsToPay = Rewards.find({
        status: "initiated",
        "payout.on": {$lte: new Date()}
    }, {
        limit: 10
    }).fetch();

    rewardsToPay.forEach(function (reward) {
        reward.pay();
    });
}, 10000);