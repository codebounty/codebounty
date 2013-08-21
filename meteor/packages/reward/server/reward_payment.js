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
    TL.info("Cancelled payout for " + this._id, Modules.Reward);

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
    if (receivers.length <= 0 || amountToDistribute.lt(minimumReward))
        return;

    var equallyDistributed = amountToDistribute.div(receivers.length);

    var truncateAfterDecimals = that.currency === "usd" ? 2 : 4;

    //add the fraction to the first receivers
    var fraction = BigUtils.remainder(equallyDistributed, truncateAfterDecimals).times(receivers.length);
    equallyDistributed = BigUtils.truncate(equallyDistributed, truncateAfterDecimals);

    //equally distribute the reward
    if (equallyDistributed.gte(minimumReward)) {
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
            // TODO: There's an intermittent bug here that ends up
            // adding an infinitesimal fraction to the first receiver
            // under certain conditions, which pushes the sum of the
            // receiver totals over the sum of the funds to be
            // distributed.
            receiver.setReward(rewardAmount.plus(fraction));
            fraction = new Big(0);
        }
    }
};

/**
 * Initiates a payout by changing the status to initiated and storing the payout
 * after 72 hours if no one disputes the reward will automatically be paid out
 * NOTE: Only call this after updating the reward's receivers
 * @param by Who the reward was initiated by (the backer userId, "system", "admin")
 * @param callback (error, success)
 */
Reward.prototype.initiatePayout = function (by, callback) {
    var that = this;

    if (by !== that.userId && by !== "system" && by !== "admin") {
        callback("Reward cannot be initiated by " + by, false);
        return;
    }

    //if there are validation errors, throw the first one
    var errors = that.validationErrors();
    if (errors.length > 0) {
        callback(errors[0], false);
        return;
    }

    Fiber(function () {
        TL.info("Initiated payout by " + by + " for " + that._id.toString(), Modules.Reward);

        that.payout = {
            by: by,
            on: Tools.addMinutes(payoutWindow)
        };
        that.status = "initiated";

        //after the payout is set, it will automatically be paid
        Rewards.update(that._id, {
            $set: {
                payout: that.payout,
                status: that.status
            }
        });

        var issue = GitHubUtils.issue(that.issueUrl);
        var backerUsername = AuthUtils.username(Meteor.users.findOne(that.userId));

        // Email an alert to all recipients and the backer.
        _.each(that.receivers, function (receiver) {
            if (!receiver._reward.gt(0))
                return;

            EmailManager.sendRewardEmail(backerUsername, "perl.jonathan@gmail.com", receiver.name, issue, receiver.amountString());
        });

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

    TL.info("Pay reward " + that._id.toString(), Modules.Reward);

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
 * Return all the funds
 * @param {string} adminId
 * @param {string} reason
 * @returns {string} logItem
 */
Reward.prototype.refund = function (adminId, reason) {
    this.status = "refunded";

    _.each(this.funds, function (fund) {
        fund.refund(adminId);
    });

    var logItem = "Reward refunded on " + new Date().toString() +
        " by " + adminId + " because " + reason;

    return logItem;
};

/**
 * Distributes receiver rewards across each fund
 * @returns {Array.<{fundId, payments: Array.<{email, amount: Big}>}>}
 */
Reward.prototype.fundDistributions = function () {
    var allFundDistributions = [];

    var that = this;

    // Grab the email address of every person we're supposed to pay out to,
    // along with the amount we're supposed to pay out.
    var receiverPayments = _.map(that.receivers, function (receiver) {
        return { email: receiver.email, amount: receiver.getReward() };
    });

    if (receiverPayments.length == 0) {
        return [];
    }

    // Initialize some variables we'll use later for looping through
    // all the Fund objects and payees.
    var receiverPaymentIndex = 0;
    var currentReceiverPayment = receiverPayments[receiverPaymentIndex];
    var remainingReceiverPayment = currentReceiverPayment.amount;

    var availableFunds = that.availableFunds();

    //move through each fund to distribute, one by one
    for (var fundIndex = 0; fundIndex < availableFunds.length; fundIndex++) {
        //track how much the current fund has remaining
        var remainingFundAmount = availableFunds[fundIndex].payoutAmount;

        var fundDistribution = {
            fundId: availableFunds[fundIndex]._id,
            payments: []
        };

        // Add a record of the fee we're taking from this fund.
        fundDistribution.payments.push({
            email: Meteor.settings["PAYPAL_PAYMENTS_EMAIL"],
            //since we are processing a payout let's log any fractional fee
            amount: availableFunds[fundIndex].fee(true)
        });

        //while there is money on the fund and more payouts to distribute
        //keep adding payments to this fund
        while (remainingFundAmount.gt(0) && receiverPaymentIndex < receiverPayments.length) {
            var fundPayment = {
                email: currentReceiverPayment.email
            };

            //if there is enough fund left, pay the entire remaining payout
            if (remainingFundAmount.gte(remainingReceiverPayment)) {
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

            if (remainingFundAmount.lt(0))
                throw "Problem with distributing the fund, it is below 0";

            //only add fund payments that are > 0
            if (fundPayment.amount.gt(0))
                fundDistribution.payments.push(fundPayment);
        }

        allFundDistributions.push(fundDistribution);
    }

    var payDeficit = new Big(0);

    //add up the amount that could not be paid out
    while (receiverPaymentIndex < receiverPayments.length) {
        var notPaid = receiverPayments[receiverPaymentIndex].amount;
        payDeficit = payDeficit.plus(notPaid);
        receiverPaymentIndex++;
    }

    if (payDeficit.gt(0)) {
        var error = "Problem with distributing the funds of reward " + that._id +
            " due to deficit of " + payDeficit.toString();

        Fiber(function () {
            TL.error(error, Modules.Reward);
        }).run();
        throw error; //throw the error so the payment is not processed
    }

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
