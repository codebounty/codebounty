//More details about fund here https://codebounty.hackpad.com/Reward-yN7ydM3LIjy
FundUtils = {
    //the # days funds expire after
    expiresAfterDays: 90
};

/**
 * Funds for payment
 * @param options {{_id: string,
 *                  amount: Big,
 *                  currency: string,
 *                  details: *,
 *                  expires: Date,
 *                  processor: string}}
 * @constructor
 */
Fund = function (options) {
    _.each(["amount", "currency", "processor"], function (requiredProperty) {
        if (typeof options[requiredProperty] === "undefined")
            throw requiredProperty + " is required";
    });

    //generate one
    if (!options._id)
        this._id = new Meteor.Collection.ObjectID().toJSONValue();
    else
        this._id = options._id;

    this.amount = options.amount;
    this.currency = options.currency;
    this.details = options.details;
    this.expires = options.expires;
    this.processor = options.processor;
};

Fund.prototype.isAvailable = function () {
    return this.approved && (!this.expires || this.expires >= new Date()) && !this.paid && !this.paymentError;
};

Fund.prototype.toString = function () {
    return (this.approved ? "(approved)" : "(not approved)") + " " + this.amount + " " + this.currency;
};

PayPalFundUtils = {
    fromJSONValue: function (value) {
        value.amount = new Big(value.amount);
        return new PayPalFund(value);
    }
};

BitcoinFundUtils = {
    fromJSONValue: function (value) {
        value.amount = new Big(value.amount);
        return new BitcoinFund(value);
    }
};

/**
 * @param options {{_id: string,
 *                  amount: Big,
 *                  approved: Date,
 *                  currency: string,
 *                  details: *,
 *                  expires: Date,
 *                  paid: string,
 *                  paymentError: string,
 *                  preapprovalKey: string}}
 * @constructor
 */
PayPalFund = function (options) {
    options.processor = "paypal";

    Fund.call(this, options);

    this.preapprovalKey = options.preapprovalKey;
    this.paid = options.paid;
    this.approved = options.approved;
    this.paymentError = options.paymentError;
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
        paid: that.paid,
        paymentError: that.paymentError,
        preapprovalKey: that.preapprovalKey
    });
};

PayPalFund.prototype.equals = function (other) {
    if (!(other instanceof PayPalFund))
        return false;

    return EJSON.equals(this._id, other._id) && this.amount.cmp(other.amount) === 0 && this.approved === other.approved &&
        this.currency === other.currency && _.isEqual(this.details, other.details) && this.expires === other.expires &&
        this.paid === other.paid && this.paymentError === other.paymentError && this.preapprovalKey === other.preapprovalKey;
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
        paid: that.paid,
        paymentError: that.paymentError,
        processor: that.processor,
        preapprovalKey: that.preapprovalKey
    };
};

EJSON.addType("PayPalFund", PayPalFundUtils.fromJSONValue);

/**
 * Get and set the preapproval key on this fund, then update the reward
 * @param reward
 * @param callback (preapprovalUrl)
 */
PayPalFund.prototype.initiatePreapproval = function (reward, callback) {
    var that = this;
    if (that.preapprovalKey)
        throw "This fund already has a preapproval key";

    var rootUrl = Meteor.settings["ROOT_URL"];
    var cancel = rootUrl + "cancelFunds?id=" + that._id;
    var confirm = rootUrl + "confirmFunds?id=" + that._id;

    var issue = GitHubUtils.getIssue(reward.issueUrl);
    var description = "$" + that.amount.toString() + " bounty for Issue #" + issue.number + " in " + issue.repo.name;

    PayPal.getApproval(that.amount.toString(), description, that.expires, cancel, confirm, function (error, data, approvalUrl) {
        if (error)
            throw "Could not get preapproval url";

        //store the preapproval key
        that.preapprovalKey = data.preapprovalKey;
        Fiber(function () {
            Rewards.update(reward._id, reward.toJSONValue());
        }).run();

        callback(approvalUrl);
    });
};

PayPalFund.prototype.cancel = function (reward) {
    var that = this;

    that.funds = _.reject(that.funds, function (fund) {
        return EJSON.equals(fund._id, that._id);
    });

    if (that.funds.length <= 0)
        Rewards.remove(reward._id);
    else
        Rewards.update(reward._id, reward.toJSONValue());

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
        Rewards.update(reward._id, reward.toJSONValue());
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
            console.log("ERROR: PayPal Payment", error);
        } else {
            update.$set["funds.$.paid"] = new Date();
            console.log("PayPal paid", that._id.toString());
        }

        Fiber(function () {
            Rewards.update({ "funds._id": that._id }, update);
        }).run();
    });
};


/******************************************
 * BITCOIN FUND DEFINITIONS
 ******************************************/

/**
 * @param options {{_id: string,
 *                  amount: Big,
 *                  currency: string,
 *                  details: *,
 *                  expires: Date,
 *                  address: string}}
 * @constructor
 */
BitcoinFund = function (options) {
    options.processor = "blockchain.info";

    Fund.call(this, options);

    this.address = options.address;
};
 
BitcoinFund.prototype = Object.create(Fund.prototype);

//EJSON

BitcoinFund.prototype.clone = function () {
    var that = this;
    return new BitcoinFund({
        _id: EJSON.clone(that._id),
        amount: that.amount,
        currency: that.currency,
        details: that.details,
        expires: that.expires,
        address: that.address
    });
};

BitcoinFund.prototype.equals = function (other) {
    if (!(other instanceof BitcoinFund))
        return false;

    return EJSON.equals(this._id, other._id) && this.amount.cmp(other.amount) === 0 &&
        this.currency === other.currency && _.isEqual(this.details, other.details) &&
        this.expires === other.expires && this.address === other.address;
};

BitcoinFund.prototype.typeName = function () {
    return "BitcoinFund";
};

BitcoinFund.prototype.toJSONValue = function () {
    var that = this;
    return {
        _id: that._id,
        amount: that.amount.toString(),
        currency: that.currency,
        details: that.details,
        expires: that.expires,
        address: that.address,
        processor: that.processor
    };
};

EJSON.addType("BitcoinFund", BitcoinFundUtils.fromJSONValue);

/**
 * Get a Bitcoin address for this issue/user pair.
 * @param reward
 * @param callback (preapprovalUrl)
 */
BitcoinFund.prototype.initiatePreapproval = function (reward, callback) {
    var that = this;
    if (that.address)
        throw "This fund already has a Bitcoin address";

    var rootUrl = Meteor.settings["ROOT_URL"];
    var cancel = rootUrl + "cancelFunds?id=" + that._id;
    var confirm = rootUrl + "confirmFunds?id=" + that._id;

    var issue = GitHubUtils.getIssue(reward.issueUrl);
    var description = that.amount.toString() + " BTC bounty for Issue #" + issue.number + " in " + issue.repo.name;
    var address = Bitcoin.addressForIssue(reward.issueUrl);
    
    that.address = address.address;
    
    Fiber(function () {
        Rewards.update(reward._id, reward.toJSONValue());
    }).run();

    callback(address.proxyAddress);
};

BitcoinFund.prototype.cancel = function (reward) {
    var that = this;

    that.funds = _.reject(that.funds, function (fund) {
        return EJSON.equals(fund._id, that._id);
    });

    if (that.funds.length <= 0)
        Rewards.remove(reward._id);
    else
        Rewards.update(reward._id, reward.toJSONValue());

    // TODO: Handle refunding.

    console.log("Bitcoin fund cancelled", that._id.toString());
};

/**
 * After receiving an IPN message, update this funded amount.
 * @param reward
 * @param params The IPN message parameters
 */
BitcoinFund.prototype.confirm = function (reward, params) {
    var that = this;
    console.log("Bitcoin received", that._id.toString());

    //TODO figure out a scenario when this is not already rewarded or a reward is in progress and a lingering payment is approved
    //after new funds are approved distribute the reward equally among all the contributors
    reward.distributeEqually();
    Rewards.update(reward._id, reward.toJSONValue());
    reward.fundApproved();
};

/**
 * Trigger the reward transaction.
 * @param {{fundId, payments: Array.<{email, amount: Big}>}} fundDistribution
 */
BitcoinFund.prototype.pay = function (fundDistribution) {
    var that = this;
    
    throw "Not yet implemented."
    
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
            console.log("ERROR: PayPal Payment", error);
        } else {
            update.$set["funds.$.paid"] = new Date();
            console.log("PayPal paid", that._id.toString());
        }

        Fiber(function () {
            Rewards.update({ "funds._id": that._id }, update);
        }).run();
    });
};
