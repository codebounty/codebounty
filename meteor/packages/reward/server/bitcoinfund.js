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
 * @param {{ _id: string, address: string, amount: Big, approved: Date, currency: string, details: *, expires: Date,
 *            proxyAddress: string, refunded: Date=, userId: string }} options
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
        refunded: that.refunded,
        userId: that.userId
    };
};

EJSON.addType("BitcoinFund", BitcoinFundUtils.fromJSONValue);

/**
 * Issue a refund
 * @param {string} adminId
 */
BitcoinFund.prototype.refund = function (adminId) {
    var that = this;
    console.log("Refund", that.toString());

    // And then make sure they have a refund address set
    var refundAddress = Bitcoin.ReceiverAddresses.find({ userId: that.userId });
    // They shouldn't have been able to send us any bitcoin
    // if they didn't set up a receiving address first. If they're
    // trying to refund without having set up a refund address, something is
    // probably afoot...
    if (!refundAddress)
        throw "Error: Refund attempted by admin " + adminId + " for " + that._id + " without a receiving address!";

    Bitcoin.Client.getReceivedByAddress(that.address, function (err, received) {
        // Send whatever has been sent to this Fund's address to the
        // user's refund address.
        Bitcoin.Client.sendToAddress(refundAddress.address, received);
    });

    Rewards.update({ "funds._id": that._id }, { $set: { "funds.$.refunded": new Date() } });
    console.log("Bitcoin fund refunded", that._id.toString());
};

/**
 * After receiving an IPN message, update this funded amount
 * @param reward
 * @param params The IPN message parameters
 */
BitcoinFund.prototype.confirm = function (reward, params) {
    var that = this;

    var firstApproval = !that.approved;

    that.amount = that.amount.plus(Big(params.value).div(new Big(Bitcoin.SATOSHI_PER_BITCOIN))); // Value is passed as number of satoshi
    that.approved = new Date();

    //TODO figure out a scenario when this is not already rewarded or a reward is in progress and a lingering payment is approved
    //after new funds are approved distribute the reward equally among all the contributors
    reward.distributeEqually();

    Rewards.update({ "funds._id": that._id }, {
        $set: {
            receivers: reward.receivers,
            "funds.$.approved": that.approved,
            "funds.$.amount": that.amount.toString()
        }
    });

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