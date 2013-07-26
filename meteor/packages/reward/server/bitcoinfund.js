BitcoinFundUtils = {
    fromJSONValue: function (value) {
        value.amount = new Big(value.amount !== "NaN" ? value.amount : 0);
        return new BitcoinFund(value);
    }
};

/**
 * @param {{ _id: string, address: string, amount: Big, approved: Date, details: *, expires: Date,
 *            proxyAddress: string, refunded: Date=, transactionHash: string=, userId: string }} options
 * @constructor
 */
BitcoinFund = function (options) {
    options.processor = "blockchain.info";
    options.currency = "btc";

    Fund.call(this, options);

    this.address = options.address;
    this.userId = options.userId;
    this.proxyAddress = options.proxyAddress;
    this.transactionHash = options.transactionHash;
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
        details: that.details,
        expires: that.expires,
        processor: that.processor,
        proxyAddress: that.proxyAddress,
        refunded: that.refunded,
        transactionHash: that.transactionHash,
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
        payoutAmount: that.payoutAmount.toString(),
        processor: that.processor,
        proxyAddress: that.proxyAddress,
        refunded: that.refunded,
        transactionHash: that.transactionHash,
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

    TL.info("Refund " + that.toString(), Modules.Bitcoin);

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

    TL.info("Bitcoin fund refunded " + that.toString(), Modules.Bitcoin);
};

/**
 * After receiving an IPN message, update this funded amount
 * TODO check the blockchain as well to confirm this
 * @param reward
 * @param params The IPN message parameters
 * @param [insert] If true, this is a new fund so make sure to insert it
 */
BitcoinFund.prototype.confirm = function (reward, params, insert) {
    var that = this;

    that.approved = new Date();
    that.transactionHash = params.transaction_hash;
        
    //TODO figure out a scenario when this is not already rewarded or a reward is in progress and a lingering payment is approved
    //after new funds are approved distribute the reward equally among all the contributors
    reward.distributeEqually();

    var update = {
        $set: {
            receivers: reward.receivers,
            //for the client
            _availableFundAmounts: _.map(reward.availableFundAmounts(), function (amount) {
                return amount.toString()
            }),
            //for the client
            _availableFundPayoutAmounts: _.map(reward.availableFundPayoutAmounts(), function (amount) {
                return amount.toString()
            }),
            _expires: reward.expires()
        }};


    //this is a new fund, so update it
    if (insert) {
        update.$push = {"funds": that.toJSONValue() };
        Rewards.update(reward._id, update);
    }
    //the fund already exists so update what changed
    else {
        update.$set["funds.$.approved"] = that.approved;
        update.$set["funds.$.amount"] = that.amount.toString();
        update.$set["funds.$.transactionHash"] = that.transactionHash;
        Rewards.update({ "funds._id": that._id }, update);
    }

    //if this is the first fund, trigger fund approved
    if (reward.funds.length === 1)
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


    Fiber(function () {
        TL.info("Pay fund " + that.toString() + " " + EJSON.toJSONValue(receiverList), Modules.Bitcoin);
    }).run();

    Bitcoin.pay(that.address, receiverList, function (error, data) {
        var update = { $set: { "funds.$.details": { receiverList: receiverList } } };

        Fiber(function () {
            if (error) {
                update.$set["funds.$.paymentError"] = error;
                TL.error("Payment " + error, Modules.Bitcoin);
            } else {
                update.$set["funds.$.paid"] = new Date();
                TL.info("Paid " + that._id.toString(), Modules.Bitcoin);
            }

            Rewards.update({ "funds._id": that._id }, update);
        }).run();
    });
};
