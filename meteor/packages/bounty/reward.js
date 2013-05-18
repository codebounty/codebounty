RewardUtils = {};

RewardUtils.fromJSONValue = function (value) {
    var receivers = _.map(value.receivers, ReceiverUtils.fromJSONValue);
    var amounts = _.map(value.bountyAmounts, function (val) {
        return new Big(val);
    });

    var options = {
        _id: value._id,
        bountyIds: value.bountyIds,
        bountyAmounts: amounts,
        currency: value.currency,
        issueUrl: value.issueUrl,
        lastSync: value.lastSync,
        payout: value.payout,
        receivers: receivers,
        status: value.status,
        userId: value.userId
    };

    return new Reward(options);
};

//TODO move this to server?
Rewards = new Meteor.Collection("rewards", {
    transform: function (doc) {
        return RewardUtils.fromJSONValue(doc);
    }
});

/**
 * Reward for an issue
 * @param options {{_id: string=,
 *                  bountyIds: Array.<string>,
 *                  bountyAmounts: Array.<Big>,
 *                  currency: string,
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
    _.each(["bountyIds", "bountyAmounts", "currency", "issueUrl", "receivers", "status", "userId"], function (requiredProperty) {
        if (typeof options[requiredProperty] === "undefined")
            throw requiredProperty + " is required";
    });

    if (options.bountyIds.length !== options.bountyAmounts.length)
        throw "The bounty ids must correspond to bounty amounts";

    if (!_.contains(["open", "reopened", "initiated", "paid", "hold"], options.status))
        throw options.status + " is not a valid reward status name";

    this._id = options._id;
    this.bountyIds = options.bountyIds;
    this.bountyAmounts = options.bountyAmounts;
    this.currency = options.currency;
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
        var clonedBountyIds = EJSON.clone(this.bountyIds);

        //clone the bounty amounts
        var clonedBountyAmounts = _.map(this.bountyAmounts, function (amount) {
            return amount.plus(0);
        });

        var clonedReceivers = [];
        _.each(this.receivers, function (receiver) {
            clonedReceivers.push(receiver.clone());
        });

        var that = this;

        var options = {
            _id: that._id,
            bountyIds: clonedBountyIds,
            bountyAmounts: clonedBountyAmounts,
            currency: that.currency,
            issueUrl: that.issueUrl,
            lastSync: that.lastSync,
            payout: that.payout,
            receivers: clonedReceivers,
            status: that.status,
            userId: that.userId
        };

        return new Reward(options);
    },

    equals: function (other) {
        if (!(other instanceof Reward))
            return false;

        var that = this;
        return that.currency === other.currency && that.issueUrl === other.issueUrl && _.isEqual(that.status, other.status)
            && _.isEqual(that.payout, other.payout) && that.userId === other.userId &&
            Tools.arraysAreEqual(that.bountyAmounts, other.bountyAmounts, function (a, b) {
                return a.cmp(b) === 0;
            }) &&
            Tools.arraysAreEqual(that.receivers, other.receivers);
    },

    typeName: function () {
        return "Reward";
    },

    toJSONValue: function () {
        var that = this;

        var receivers = _.map(that.receivers, function (receiver) {
            return receiver.toJSONValue();
        });

        var json = {
            bountyIds: that.bountyIds,
            bountyAmounts: _.map(that.bountyAmounts, function (amount) {
                return amount.toString();
            }),
            currency: that.currency,
            issueUrl: that.issueUrl,
            lastSync: that.lastSync,
            payout: that.payout,
            receivers: receivers,
            status: that.status,
            userId: that.userId
        };

        if (that._id)
            json._id = that._id;

        return json;
    }
};

EJSON.addType("Reward", RewardUtils.fromJSONValue);

//methods

Reward.prototype.fee = function () {
    var that = this;
    var totalFee = new Big(0);

    //add up the fee per bounty
    _.each(that.bountyAmounts, function (amount) {
        var fee = amount.times("0.05");

        //bump the fee up to the minimum CodeBounty fee
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

    var total = BigUtils.sum(that.bountyAmounts);
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