//More details about reward here https://codebounty.hackpad.com/Reward-yN7ydM3LIjy

RewardUtils = {};

/**
 * Clone the reward, then strip fields the client should not get
 * @param reward
 */
RewardUtils.clientReward = function (reward) {
    reward = reward.clone();
    reward.funds = [];
    return reward;
};

RewardUtils.fromJSONValue = function (value) {
    var receivers = _.map(value.receivers, ReceiverUtils.fromJSONValue);

    var funds = [];
    _.each(value.funds, function (fund) {
        if (fund.processor === "paypal")
            funds.push(PayPalFundUtils.fromJSONValue(fund));
        else if (fund.currency === "btc")
            funds.push(BitcoinFundUtils.fromJSONValue(fund));
    });

    var options = {
        _id: value._id,
        _expires: value._expires,
        currency: value.currency,
        funds: funds,
        issueUrl: value.issueUrl,
        lastSync: value.lastSync,
        log: value.log,
        payout: value.payout,
        receivers: receivers,
        status: value.status,
        userId: value.userId
    };
    if (value._availableFundAmounts)
        options._availableFundAmounts = _.map(value._availableFundAmounts, function (amount) {
            return new Big(amount);
        });

    return new Reward(options);
};

/**
 * Reward for an issue
 * @param {{_id: string=, currency: string, funds: Array.<Fund>, issueUrl: string, lastSync: Date=, log: Array.<string>,
 *          payout: {by: string, on: Date}=, receivers: Array.<Receiver>, status: string, userId: string}} options
 * - _id, lastSync, and payout are optional, they will only be set on existing rewards
 * - currency Ex. "btc", "usd"
 * - status Ex. "expired", "held", "initiated", "open", "paid", "paying", "refunded", "reopened"
 * @constructor
 */
Reward = function (options) {
    _.each(["currency", "funds", "issueUrl", "receivers", "status", "userId"], function (requiredProperty) {
        if (typeof options[requiredProperty] === "undefined")
            throw requiredProperty + " is required";
    });

    if (!_.contains(["expired", "held", "initiated", "open", "paid", "paying", "refunded", "reopened"], options.status))
        throw options.status + " is not a valid reward status name";

    //generate one
    if (!options._id)
        this._id = new Meteor.Collection.ObjectID().toJSONValue();
    else
        this._id = options._id;

    //for the client
    if (options._availableFundAmounts)
        this._availableFundAmounts = options._availableFundAmounts;

    //for the client
    if (options._expires)
        this._expires = options._expires;

    this.currency = options.currency;
    this.funds = options.funds;
    this.issueUrl = options.issueUrl;
    this.lastSync = options.lastSync;
    this.log = options.log;
    this.payout = options.payout;
    this.receivers = options.receivers;
    this._receiversDep = new Deps.Dependency;
    this.status = options.status;
    this.userId = options.userId;
};

//EJSON fields

Reward.prototype = {
    constructor: Reward,

    toString: function () {
        return this.status + " " + this.total() + " " + this.currency;
    },

    clone: function () {
        var clonedFunds = _.map(this.funds, function (fund) {
            return fund.clone();
        });

        var clonedReceivers = _.map(this.receivers, function (receiver) {
            return receiver.clone();
        });

        var that = this;

        var options = {
            _id: EJSON.clone(that._id),
            currency: that.currency,
            funds: clonedFunds,
            issueUrl: that.issueUrl,
            lastSync: that.lastSync,
            log: that.log,
            payout: that.payout,
            receivers: clonedReceivers,
            status: that.status,
            userId: that.userId
        };

        if (that._availableFundAmounts)
            options._availableFundAmounts = that._availableFundAmounts;

        if (that._expires)
            options.expires = that.expires;

        return new Reward(options);
    },

    equals: function (other) {
        if (!(other instanceof Reward))
            return false;

        var that = this;
        return that.currency === other.currency && that.issueUrl === other.issueUrl &&
            _.isEqual(that.log, other.log) && _.isEqual(that.status, other.status) &&
            _.isEqual(that.payout, other.payout) && that.userId === other.userId &&
            Tools.arraysAreEqual(that.funds, other.funds) && Tools.arraysAreEqual(that.receivers, other.receivers);
    },

    typeName: function () {
        return "Reward";
    },

    toJSONValue: function () {
        var that = this;

        var funds = _.map(that.funds, function (fund) {
            return fund.toJSONValue();
        });
        var receivers = _.map(that.receivers, function (receiver) {
            return receiver.toJSONValue();
        });

        var json = {
            _id: that._id,
            currency: that.currency,
            funds: funds,
            issueUrl: that.issueUrl,
            lastSync: that.lastSync,
            log: that.log,
            payout: that.payout,
            receivers: receivers,
            status: that.status,
            userId: that.userId
        };

        //for the client
        if (that._availableFundAmounts)
            json._availableFundAmounts = _.map(that._availableFundAmounts, function (amount) {
                return amount.toString()
            });

        //for the client
        json._expires = that.expires();

        return json;
    }
};

EJSON.addType("Reward", RewardUtils.fromJSONValue);

//methods

/**
 * @returns {Array.<Fund>}
 */
Reward.prototype.availableFunds = function () {
    return _.filter(this.funds, function (fund) {
        return fund.isAvailable();
    });
};

/**
 * @returns {Array.<Big>}
 */
Reward.prototype.availableFundAmounts = function () {
    if (Meteor.isClient) //fund details are not exposed to the client
        return this._availableFundAmounts;

    var myAvailableFunds = this.availableFunds();
    return _.map(myAvailableFunds, function (fund) {
        return fund.amount;
    });
};

Reward.prototype.expires = function () {
    var lastExpiration = _.last(_.sortBy(this.funds, function (fund) {
        return fund.expires;
    }));

    if (lastExpiration)
        return lastExpiration.expires;

    //for the client
    if (this._expires)
        return this._expires;

    return null;
};

Reward.prototype.fee = function () {
    var that = this;
    var totalFee = new Big(0);

    var myAvailableFundAmounts = that.availableFundAmounts();

    //add up the fee per funding
    _.each(myAvailableFundAmounts, function (amount) {
        var fee = amount.times("0.05");

        //bump the fee up to the minimum codebounty fee
        //USD: $1 minimum fee
        if (that.currency === "usd" && fee.lt(1))
            fee = new Big(1);
        //BTC: .005 minimum fee, approx $0.5-$1 USD
        else if (that.currency === "btc" && fee.lt(new Big("0.005")))
            fee = new Big("0.005");

        totalFee = totalFee.plus(fee);
    });

    return totalFee;
};

Reward.prototype.getReceivers = function () {
    this._receiversDep.depend();
    return this.receivers;
};

/**
 * (reactive) The total amount of receiver rewards
 */
Reward.prototype.receiverTotal = function () {
    var receivers = this.getReceivers();
    var totalReceiverRewards = _.reduce(receivers, function (sum, receiver) {
        return sum.plus(receiver.getReward());
    }, new Big("0"));

    return totalReceiverRewards;
};

/**
 * The total amount of bounties to reward (removes the fee)
 * @param [withFee] If true, include the fee
 * @returns {Big}
 */
Reward.prototype.total = function (withFee) {
    var that = this;

    var total = BigUtils.sum(that.availableFundAmounts());
    if (withFee)
        return total;

    var fee = that.fee();
    return total.minus(fee);
};

/**
 * (reactive) Validation errors or an empty array if valid
 * @returns {Array.<string>}
 * @reactive
 */
Reward.prototype.validationErrors = function () {
    var that = this;
    var receivers = that.getReceivers();
    var validationErrors = [];

    var total = that.total();

    //add all the receiver errors
    _.each(receivers, function (receiver) {
        var errors = receiver.validationErrors();
        if (errors)
            validationErrors = validationErrors.concat(errors);
    });

    //the reward amount needs to equal codebounty fee + the total receiver amounts
    var totalReceiverRewards = that.receiverTotal();

    if (!total.eq(totalReceiverRewards))
        validationErrors.push("The reward (" + total +
            ") must be equal to the total receiver rewards (" + totalReceiverRewards + ")");

    return validationErrors;
};