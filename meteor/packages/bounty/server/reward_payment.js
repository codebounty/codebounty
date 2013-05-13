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
 * NOTE: Only call this after updating the reward's receivers
 * Initiates a payout by changing the status to initiated and storing the payout
 * after 72 hours if no one disputes the reward will automatically be paid out
 * @param by Who the reward was initiated by (the backer userId, "system", future: "moderator")
 */
Reward.prototype.initiatePayout = function (by) {
    var that = this;

    //if there are validation errors, throw the first one
    var errors = that.validationErrors();
    if (errors.length > 0)
        throw errors[0];

    console.log("Initiated payout by", by, "for", that._id);

    that.status = "initiated";
    that.payout = {
        by: by,
        on: Tools.addMinutes(payoutWindow)
    };

    //after the payout is set, it will automatically be paid
    Rewards.update(that._id, that.toJSONValue());
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
 * Distributes the receiver reward's across each bounty's payments
 * @returns {Array.<{bountyId, payments: Array.<{email, amount: Big}>}>} The receiver reward payments for each bounty.
 */
Reward.prototype.payments = function () {
    //TODO pay codebounty it's fee
//    throw "Not done";

    var allPayments = [];

    var that = this;
    var receivers = that.receivers;

    //keep track of the currentReceiver to pay
    var receiverIndex = 0;
    var currentReceiver = receivers[receiverIndex];
    var remainingReceiverPayment = currentReceiver.getReward().plus(0);

    //move through each bounty to distribute, one by one
    for (var bountyIndex = 0; bountyIndex < that.bountyIds.length; bountyIndex++) {
        //keeps track of how much is remaining on the current bounty to distribute
        var remainingBounty = that.bountyAmounts[bountyIndex];

        //the payment to build
        var bountyPayments = {
            bountyId: that.bountyIds[bountyIndex],
            payments: []
        };

        while (remainingBounty.cmp(0) > 0 && receiverIndex < receivers.length) {
            var payment = {
                email: currentReceiver.email
            };

            //if possible distribute the rest of the receiver's payment
            if (remainingBounty.cmp(remainingReceiverPayment) >= 0) {
                //distribute the entire reward (add 0 to clone it)
                payment.amount = remainingReceiverPayment.plus(0);

                //since the receiver's payment is fully distributed
                //move onto the next receiver
                receiverIndex++;
                if (receiverIndex < receivers.length) {
                    currentReceiver = receivers[receiverIndex];
                    remainingReceiverPayment = currentReceiver.getReward().plus(0);
                }
            }
            //otherwise distribute part of the receiver's payment
            else {
                payment.amount = remainingBounty;

                //update how much still needs to be paid
                remainingReceiverPayment = remainingReceiverPayment.minus(remainingBounty);
            }

            //reduce the amount left on this bounty
            remainingBounty = remainingBounty.minus(payment.amount);

            if (remainingBounty.cmp(0) < 0)
                throw "Problem with distributing the bounty, it is below 0";

            bountyPayments.payments.push(payment);
        }

        allPayments.push(bountyPayments);
    }

    if (receiverIndex < receivers.length)
        throw "Problem with distributing the bounty, not all receivers were paid";

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