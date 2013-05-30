//More details about reward here https://codebounty.hackpad.com/Reward-yN7ydM3LIjy

RewardUtils = {};

/**
 * Clone the reward, then strip fields the client should not get
 * @param reward
 */
RewardUtils.clientReward = function (reward) {
    reward = reward.clone();
    reward._availableFundAmounts = reward.availableFundAmounts();
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
        currency: value.currency,
        funds: funds,
        issueUrl: value.issueUrl,
        lastSync: value.lastSync,
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
 * @param options {{_id: string=,
 *                  currency: string,
 *                  funds: Array.<Fund>,
 *                  issueUrl: string,
 *                  lastSync: Date=,
 *                  payout: {by: string, on: Date}=,
 *                  receivers: Array.<Receiver>,
 *                  status: string,
 *                  userId: string}}
 *
 * - _id, lastSync, and payout are optional, they will only be set on existing rewards
 * - currency Ex. "btc", "usd"
 * - status Ex. "open", "reopened", "initiated", "paid", "hold"
 * @constructor
 */
Reward = function (options) {
    _.each(["currency", "funds", "issueUrl", "receivers", "status", "userId"], function (requiredProperty) {
        if (typeof options[requiredProperty] === "undefined")
            throw requiredProperty + " is required";
    });

    if (!_.contains(["open", "expired", "initiated", "paying", "paid", "reopened", "hold"], options.status))
        throw options.status + " is not a valid reward status name";

    //generate one
    if (!options._id)
        this._id = new Meteor.Collection.ObjectID().toJSONValue();
    else
        this._id = options._id;

    //for the client
    if (options._availableFundAmounts)
        this._availableFundAmounts = options._availableFundAmounts;

    this.currency = options.currency;
    this.funds = options.funds;
    this.issueUrl = options.issueUrl;
    this.lastSync = options.lastSync;
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
        var clonedFunds = _.map(this.funds, function (funds) {
            return funds.clone();
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
            payout: that.payout,
            receivers: clonedReceivers,
            status: that.status,
            userId: that.userId
        };

        if (that._availableFundAmounts)
            options._availableFundAmounts = that._availableFundAmounts;

        return new Reward(options);
    },

    equals: function (other) {
        if (!(other instanceof Reward))
            return false;

        var that = this;
        return that.currency === other.currency && that.issueUrl === other.issueUrl && _.isEqual(that.status, other.status)
            && _.isEqual(that.payout, other.payout) && that.userId === other.userId &&
            Tools.arraysAreEqual(that.funds, other.funds) &&
            Tools.arraysAreEqual(that.receivers, other.receivers);
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

Reward.prototype.fee = function () {
    var that = this;
    var totalFee = new Big(0);

    var myAvailableFundAmounts = that.availableFundAmounts();

    //add up the fee per funding
    _.each(myAvailableFundAmounts, function (amount) {
        var fee = amount.times("0.05");

        //bump the fee up to the minimum codebounty fee
        //USD: $1 minimum fee
        if (that.currency === "usd" && fee.cmp(1) < 0)
            fee = new Big(1);
        //BTC: .005 minimum fee, approx $0.5-$1 USD
        else if (that.currency === "btc" && fee.cmp(new Big("0.005")) < 0)
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
 * The total amount of bounties to reward (removes the fee)
 * @returns {Big}
 */
Reward.prototype.total = function () {
    var that = this;

    var fee = that.fee();

    var total = BigUtils.sum(that.availableFundAmounts());
    return total.minus(fee);
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

    if (total.cmp(totalReceiverRewards) !== 0)
        validationErrors.push("The reward (" + total +
            ") must be equal to the total receiver rewards (" + totalReceiverRewards + ")");

    return validationErrors;
};
