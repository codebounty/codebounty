//contains reward payment options

//how long (in minutes) to payout the bounty once it is rewarded
//var payoutWindow = 60 * 72; //72 hours
//for testing
var payoutWindow = 0.5; //.5 minutes

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
    var amountToDistribute = that.total();
    var minimumReward = ReceiverUtils.minimum(that.currency);

    //nothing to distribute
    if (receivers.length <= 0 || amountToDistribute.cmp(minimumReward) < 0)
        return;

    var equallyDistributed = amountToDistribute.div(receivers.length);

    var truncateAfterDecimals = that.currency === "usd" ? 2 : 4;

    //add the fraction to the first receivers
    var fraction = BigUtils.remainder(equallyDistributed, truncateAfterDecimals).times(receivers.length);
    equallyDistributed = BigUtils.truncate(equallyDistributed, truncateAfterDecimals);

    //equally distribute the reward
    if (equallyDistributed.cmp(minimumReward) >= 0) {
        _.each(receivers, function (receiver) {
            //add fraction to the first receiver, then clear it
            receiver.setReward(equallyDistributed.plus(fraction));
            fraction = new Big(0);
        });
    }
    //pay as many of the contributors as possible
    else {
        var numberCanPay = amountToDistribute.div(minimumReward).toFixed(0);
        equallyDistributed = amountToDistribute.div(numberCanPay);

        var fraction = BigUtils.remainder(equallyDistributed, truncateAfterDecimals).times(receivers.length);
        equallyDistributed = BigUtils.truncate(equallyDistributed, truncateAfterDecimals);

        for (var i = 0; i < receivers.length; i++) {
            var receiver = receivers[i];

            var rewardAmount = new Big(0);
            if (i < numberCanPay)
                rewardAmount = equallyDistributed;

            //add fraction to the first receiver, then clear it
            receiver.setReward(rewardAmount.plus(fraction));
            fraction = new Big(0);
        }
    }
};

/**
 * Initiates a payout by changing the status to initiated and storing the payout
 * after 72 hours if no one disputes the reward will automatically be paid out
 * NOTE: Only call this after updating the reward's receivers
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

    console.log("Initiated payout by", by, "for", that._id.toString());

    that.status = "initiated";
    that.payout = {
        by: by,
        on: Tools.addMinutes(payoutWindow)
    };

    Fiber(function () {
        //TODO only update what could have changed (receiver amounts, not funds, etc..)
        //after the payout is set, it will automatically be paid
        Rewards.update(that._id, that.toJSONValue());

        callback(null, true);
    }).run();
};

/**
 * Pay the reward
 */
Reward.prototype.pay = function () {
    var that = this;
    var fundDistributions = that.fundDistributions();

    Rewards.update(that._id, {$set: {status: "paying"}});

    console.log("Pay reward", that._id.toString(), _.map(fundDistributions, function (fundPayment) {
        return fundPayment.payments;
    }));

    var funds = that.funds;
    var fundIndex = 0;
    
    _.each(fundDistributions, function (fundDistribution) {
        var fund = _.find(funds, function (f) {
            return EJSON.equals(f._id, fundDistribution.fundId);
        });

        fund.pay(fundDistribution);
        fundIndex++;
    });

    that.status = "paid";

    //update the reward's status
    Rewards.update(that._id, {$set: {status: "paid"}});
};

/**
 * Distributes receiver rewards and the fee payments across each fund
 * @returns {Array.<{fundId, payments: Array.<{email, amount: Big}>}>}
 */
Reward.prototype.fundDistributions = function () {
    var allFundDistributions = [];

    var that = this;

    //setup the receiver payments to distribute
    var receiverPayments = _.map(that.receivers, function (receiver) {
        return { email: receiver.email, amount: receiver.getReward() };
    });

    var truncateAfterDecimals = that.currency === "usd" ? 2 : 4;
    var feeFractions = new Big(0);

    //remove any fractional payments, and put them into the fee
    _.each(receiverPayments, function (receiverPayment) {
        var fraction = BigUtils.remainder(receiverPayment.amount, truncateAfterDecimals);
        if (fraction.cmp(0) > 0) {
            receiverPayment.amount = BigUtils.truncate(receiverPayment.amount, truncateAfterDecimals);
            feeFractions = feeFractions.plus(fraction);
        }
    });

    var fee = that.fee();
    //add fractional payments to the fee
    if (feeFractions.cmp(0) > 0) {
        fee = fee.plus(feeFractions);
        console.log("Fractional fee for reward", that._id.toString(), feeFractions.toString());
    }

    //pay codebounty the fee
    receiverPayments.push({ email: Meteor.settings["PAYPAL_PAYMENTS_EMAIL"], amount: fee });

    //keep track of the current receiver payment to distribute
    var receiverPaymentIndex = 0;
    var currentReceiverPayment = receiverPayments[receiverPaymentIndex];
    var remainingReceiverPayment = currentReceiverPayment.amount;

    var availableFunds = that.availableFunds();

    //move through each fund to distribute, one by one
    for (var fundIndex = 0; fundIndex < availableFunds.length; fundIndex++) {
        //track how much the current fund has remaining
        var remainingFundAmount = availableFunds[fundIndex].amount;

        var fundDistribution = {
            fundId: availableFunds[fundIndex]._id,
            payments: []
        };

        //while there is money on the fund and more payouts to distribute
        //keep adding payments to this fund
        while (remainingFundAmount.cmp(0) > 0 && receiverPaymentIndex < receiverPayments.length) {
            var fundPayment = {
                email: currentReceiverPayment.email
            };

            //if there is enough fund left, pay the entire remaining payout
            if (remainingFundAmount.cmp(remainingReceiverPayment) >= 0) {
                //distribute the entire payout
                fundPayment.amount = remainingReceiverPayment;

                //move onto the next payout
                receiverPaymentIndex++;
                if (receiverPaymentIndex < receiverPayments.length) {
                    currentReceiverPayment = receiverPayments[receiverPaymentIndex];
                    remainingReceiverPayment = currentReceiverPayment.amount;
                }
            }
            //otherwise pay whatever is remaining on the fund
            else {
                fundPayment.amount = remainingFundAmount;

                //update how much still needs to be paid
                remainingReceiverPayment = remainingReceiverPayment.minus(remainingFundAmount);
            }

            //reduce the amount left on this fund
            remainingFundAmount = remainingFundAmount.minus(fundPayment.amount);

            if (remainingFundAmount.cmp(0) < 0)
                throw "Problem with distributing the fund, it is below 0";

            fundDistribution.payments.push(fundPayment);
        }

        allFundDistributions.push(fundDistribution);
    }

    if (receiverPaymentIndex < receiverPayments.length)
        throw "Problem with distributing the funds, not all the receivers were paid";

    return allFundDistributions;
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
        "payout.on": {$lte: new Date()},
        //make sure there is an approved and not expired fund
        funds: { $elemMatch: { approved: { $ne: null }, expires: { $gt: new Date() } }}
    }, {
        limit: 10
    }).fetch();

    rewardsToPay.forEach(function (reward) {
        reward.pay();
    });
}, 10000);
