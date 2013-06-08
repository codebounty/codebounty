BitcoinFundUtils = {
    fromJSONValue: function (value) {
        if (value.amount != 'NaN') {
            value.amount = new Big(value.amount);
        } else {
            value.amount = new Big(0);
        }
        return new BitcoinFund(value);
    }
};

/**
 * @param {{ _id: string, userId: string, amount: Big, currency: string, details: *, expires: Date,
 *           address: string, proxyAddress: string }} options
 * @constructor
 */
BitcoinFund = function (options) {
    options.processor = "blockchain.info";

    Fund.call(this, options);

    this.address = options.address;
    this.userId = options.userId;
    this.proxyAddress = options.proxyAddress;
};

BitcoinFund.prototype = Object.create(Fund.prototype);

//EJSON

BitcoinFund.prototype.clone = function () {
    var that = this;
    return new BitcoinFund({
        _id: EJSON.clone(that._id),
        address: that.address,
        amount: that.amount,
        approved: that.approved,
        currency: that.currency,
        details: that.details,
        expires: that.expires,
        proxyAddress: that.proxyAddress,
        userId: EJSON.clone(that.userId)
    });
};

BitcoinFund.prototype.equals = function (other) {
    if (!(other instanceof BitcoinFund))
        return false;

    return _.isEqual(this, other);
};

BitcoinFund.prototype.typeName = function () {
    return "BitcoinFund";
};

BitcoinFund.prototype.toJSONValue = function () {
    var that = this;
    return {
        _id: that._id,
        address: that.address,
        amount: that.amount.toString(),
        approved: that.approved,
        currency: that.currency,
        details: that.details,
        expires: that.expires,
        processor: that.processor,
        proxyAddress: that.proxyAddress,
        userId: that.userId
    };
};

EJSON.addType("BitcoinFund", BitcoinFundUtils.fromJSONValue);

/**
 * Issue a refund
 * @param reward
 */
BitcoinFund.prototype.refund = function (reward) {
    var that = this;

    //TODO move validation towards calling method when updating admin console to allow for refunds
    var user = Meteor.user();
    if (!user._id !== that.userId)
        throw "Not authorized to refund this";

    that.funds = _.reject(that.funds, function (fund) {
        return EJSON.equals(fund._id, that._id);
    });

    var email = AuthUtils.email(user);
    // And then make sure they have a refund address set
    var refundAddress = ReceiverAddress.find({ email: email });
    if (!refundAddress) {
        // They shouldn't have been able to send us any bitcoin
        // if they didn't set up a receiving address first. If they're
        // trying to refund without having set up a refund address, something is
        // probably afoot...
        console.log("Error: Refund attempted by user (" + user._id + ") without a receiving address!");
        return;
    }

    Bitcoin.Client.getReceivedByAddress(that.address, function (err, received) {
        // Send whatever has been sent to this Fund's address to the
        // user's refund address.
        Bitcoin.Client.sendToAddress(refundAddress.address, received);
    });

    // Remove this Fund from its Reward
    if (that.funds.length <= 0)
        Rewards.remove(reward._id);
    else
        Rewards.update(reward._id, reward.toJSONValue());

    console.log("Bitcoin fund cancelled", that._id.toString());
};

/**
 * After receiving an IPN message, update this funded amount.
 * @param reward
 * @param params The IPN message parameters
 */
BitcoinFund.prototype.confirm = function (reward, params) {
    var that = this;

    var firstApproval = !that.approved;

    that.amount = that.amount.plus(Big(params.value).div(new Big(Bitcoin.SATOSHI_PER_BITCOIN))); // Value is passed as number of satoshi
    that.approved = true;

    //TODO figure out a scenario when this is not already rewarded or a reward is in progress and a lingering payment is approved
    //after new funds are approved distribute the reward equally among all the contributors
    reward.distributeEqually();
    Rewards.update(reward._id, reward.toJSONValue());

    if (firstApproval)
        reward.fundApproved();
};

/**
 * Trigger the reward transaction.
 * @param {{fundId, payments: Array.<{email, amount: Big}>}} fundDistribution
 */
BitcoinFund.prototype.pay = function (fundDistribution) {
    var that = this;

    if (that._id !== fundDistribution.fundId)
        throw "Wrong fund distribution";

    var receiverList = _.map(fundDistribution.payments, function (payment) {
        return { amount: payment.amount.toString(), email: payment.email};
    });

    console.log("Pay fund (Bitcoin)", that.toString(), receiverList);

    Bitcoin.pay(that.address, receiverList, function (error, data) {
        var update = { $set: { "funds.$.details": { receiverList: receiverList } } };

        if (error) {
            update.$set["funds.$.paymentError"] = error;
            console.log("ERROR: Bitcoin Payment", error);
        } else {
            update.$set["funds.$.paid"] = new Date();
            console.log("Bitcoin paid", that._id.toString());
        }

        Fiber(function () {
            Rewards.update({ "funds._id": that._id }, update);
        }).run();
    });
};