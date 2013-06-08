PayPalFundUtils = {
    fromJSONValue: function (value) {
        value.amount = new Big(value.amount);
        return new PayPalFund(value);
    }
};

/**
 * @param {{_id: string, amount: Big, approved: Date, currency: string, details: *,
 *          expires: Date, refunded: Date=, paid: string, paymentError: string, preapprovalKey: string}} options
 * @constructor
 */
PayPalFund = function (options) {
    options.processor = "paypal";

    Fund.call(this, options);

    this.preapprovalKey = options.preapprovalKey;
};

PayPalFund.prototype = Object.create(Fund.prototype);

//EJSON

PayPalFund.prototype.clone = function () {
    var that = this;
    return new PayPalFund({
        _id: EJSON.clone(that._id),
        amount: that.amount,
        approved: that.approved,
        currency: that.currency,
        details: that.details,
        expires: that.expires,
        refunded: that.refunded,
        paid: that.paid,
        paymentError: that.paymentError,
        preapprovalKey: that.preapprovalKey
    });
};

PayPalFund.prototype.equals = function (other) {
    if (!(other instanceof PayPalFund))
        return false;

    return _.isEqual(this, other);
};

PayPalFund.prototype.typeName = function () {
    return "PayPalFund";
};

PayPalFund.prototype.toJSONValue = function () {
    var that = this;
    return {
        _id: that._id,
        amount: that.amount.toString(),
        approved: that.approved,
        currency: that.currency,
        details: that.details,
        expires: that.expires,
        refunded: that.refunded,
        paid: that.paid,
        paymentError: that.paymentError,
        processor: that.processor,
        preapprovalKey: that.preapprovalKey
    };
};

EJSON.addType("PayPalFund", PayPalFundUtils.fromJSONValue);

/**
 * Get and set the preapproval key on this fund
 * then return the preapprovalUrl in the callback
 * @param reward
 * @param callback (preapprovalUrl)
 */
PayPalFund.prototype.initiatePreapproval = function (reward, callback) {
    var that = this;
    if (that.preapprovalKey)
        throw "This fund already has a preapproval key";

    var rootUrl = Meteor.settings["ROOT_URL"];
    if (typeof rootUrl === "undefined")
        throw "ROOT_URL is not defined";

    var cancel = rootUrl + "cancelFunds?id=" + that._id;
    var confirm = rootUrl + "confirmFunds?id=" + that._id;

    var issue = GitHubUtils.issue(reward.issueUrl);
    var description = "$" + that.amount.toString() + " bounty for Issue #" + issue.number + " in " + issue.repo.name;

    PayPal.getApproval(that.amount.toString(), description, that.expires, cancel, confirm, function (error, data, approvalUrl) {
        if (error)
            throw "Could not get preapproval url";

        //set the preapproval key
        that.preapprovalKey = data.preapprovalKey;
        callback(approvalUrl);
    });
};

/**
 * NOTE: Do not confuse with refund. This is if the fund is not approved.
 * @param reward
 */
PayPalFund.prototype.cancel = function (reward) {
    var that = this;

    that.funds = _.reject(that.funds, function (fund) {
        return EJSON.equals(fund._id, that._id);
    });

    if (that.funds.length <= 0)
        Rewards.remove(reward._id);
    else
        Rewards.update(reward._id, {$pull: {"funds": {"_id": that._id}}});

    console.log("PayPal fund cancelled", that._id.toString());
};

/**
 * After an ipn message confirms this PayPalFund has been authorized
 * store the token and payer id to capture the payment later.
 * @param reward
 * @param params The IPN message parameters
 */
PayPalFund.prototype.confirm = function (reward, params) {
    var that = this;
    if (params.approved !== "true" ||
        new Big(params.max_total_amount_of_all_payments).cmp(that.amount) !== 0) {
        that.cancel(reward);
    } else {
        that.approved = new Date();
        console.log("PayPal confirmed", that._id.toString());

        //TODO figure out a scenario when this is not already rewarded or a reward is in progress and a lingering payment is approved
        //after new funds are approved distribute the reward equally among all the contributors
        reward.distributeEqually();

        Rewards.update({ "funds._id": that._id }, {
            receivers: reward.receivers,
            "funds.$": {
                approved: that.approved,
                amount: that.amount
            }
        });

        reward.fundApproved();
    }
};

/**
 * Pay the fund based on the distribution
 * @param {{fundId, payments: Array.<{email, amount: Big}>}} fundDistribution
 */
PayPalFund.prototype.pay = function (fundDistribution) {
    var that = this;

    if (that._id !== fundDistribution.fundId)
        throw "Wrong fund distribution";

    var receiverList = _.map(fundDistribution.payments, function (payment) {
        return { amount: payment.amount.toString(), email: payment.email};
    });

    console.log("Pay fund", that.toString(), receiverList);

    PayPal.pay(that.preapprovalKey, receiverList, function (error, data) {
        var update = { $set: { "funds.$.details": { receiverList: receiverList } } };

        if (error) {
            update.$set["funds.$.paymentError"] = error;
            console.log("ERROR: PayPal payment", error);
        } else {
            update.$set["funds.$.paid"] = new Date();
            console.log("PayPal paid", that._id.toString());
        }

        Fiber(function () {
            Rewards.update({ "funds._id": that._id }, update);
        }).run();
    });
};

/**
 * Refund the fund
 */
PayPalFund.prototype.refund = function () {
    var that = this;
    console.log("Refund", that.toString());

    PayPal.cancelPreapproval(that.preapprovalKey, function (error, data) {
        var update = { $set: { } };

        if (error) {
            update.$set["funds.$.refundError"] = error;
            console.log("ERROR: PayPal refund", error);
        } else {
            update.$set["funds.$.refunded"] = new Date();
            console.log("PayPal refunded", that._id.toString());
        }

        Fiber(function () {
            Rewards.update({ "funds._id": that._id }, update);
        }).run();
    });
};