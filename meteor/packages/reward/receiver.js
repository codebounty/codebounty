//More details about receiver here https://codebounty.hackpad.com/Reward-yN7ydM3LIjy

ReceiverUtils = {};

/**
 * The minimum reward a receiver should receive
 * @param {string} currency
 * @returns {Big}
 */
ReceiverUtils.minimum = function (currency) {
    //USD $4 minimum per receiver
    if (currency === "usd")
        return new Big("4");
    //BTC .02 minimum per receiver, approx $2-$4 USD
    else if (currency === "btc")
        return new Big("0.02");
};

ReceiverUtils.fromJSONValue = function (value) {
    return new Receiver({
        currency: value.currency,
        email: value.email,
        login: value.login,
        name: value.name,
        reward: new Big(value._reward)
    });
};

/**
 * Keeps track of how much money from a given Reward should be
 * paid out to a particular user. Each Reward has many Receivers.
 * @param options {{currency: string,
 *                  email: string,
 *                  login: string,
 *                  name: string,
 *                  reward: Big}}
 * @constructor
 */
Receiver = function (options) {
    _.each(["currency", "email", "name", "login", "reward"], function (requiredProperty) {
        if (typeof options[requiredProperty] === "undefined")
            throw requiredProperty + " is required";
    });

    //email and currency should be read only
    this.currency = options.currency;
    this.email = options.email;
    this.login = options.login;
    this.name = options.name;

    //should only be accessed through getter / setter
    this._reward = options.reward;
    this._rewardDep = new Deps.Dependency;
};

//EJSON fields

Receiver.prototype = {
    constructor: Receiver,

    toString: function () {
        return this.email + ": " + this._reward.toString() + " " + this.currency;
    },

    clone: function () {
        var that = this;
        return new Receiver({
            currency: that.currency,
            email: that.email,
            login: that.login,
            name: that.name,
            reward: new Big(that._reward)
        });
    },

    equals: function (other) {
        if (!(other instanceof Receiver))
            return false;

        return this.currency === other.currency && this.email === other.email &&
            this.login === other.login && this.name === other.name && this._reward.eq(other._reward);
    },

    typeName: function () {
        return "Receiver";
    },

    toJSONValue: function () {
        return {
            currency: this.currency,
            email: this.email,
            login: this.login,
            name: this.name,
            _reward: this._reward.toString()
        };
    }
};

EJSON.addType("Receiver", ReceiverUtils.fromJSONValue);

//methods

/**
 * @returns {Big}
 * @reactive
 */
Receiver.prototype.getReward = function () {
    this._rewardDep.depend();
    return this._reward;
};

/**
 * @param {Big} reward
 */
Receiver.prototype.setReward = function (reward) {
    this._reward = reward;
    this._rewardDep.changed();
};

Receiver.prototype.amountString = function () {
    var amount = this._reward.toString();

    if (this.currency === "usd")
        return "$" + amount;

    return amount + " BTC";
};

/**
 * (reactive) Validation errors or an empty array if valid
 * @returns {Array.<string>}
 * @reactive
 */
Receiver.prototype.validationErrors = function () {
    var errors = [];

    var reward = this.getReward();
    var min = ReceiverUtils.minimum(this.currency);

    if (!(reward.eq(new Big(0)) || reward.gte(min)))
        errors.push("Receiver reward (" + reward + ") must be 0 or >= the minimum ("
            + min + " " + this.currency + ")");

    return errors;
};