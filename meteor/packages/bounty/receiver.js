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
    return new Receiver(value.email, new Big(value._reward), value.currency);
};

/**
 * Receiver of a reward
 * @param {string} email
 * @param {Big} reward The amount the receiver should receive
 * @param {string} currency Ex. "btc", "usd"
 * @constructor
 */
Receiver = function (email, reward, currency) {
    if (!email || !reward || !currency)
        throw "Not all required constructor parameters were passed";

    //email and currency should be read only
    this.email = email;
    this.currency = currency;

    //should only be accessed through getter / setter
    this._reward = reward;
    this._rewardDep = new Deps.Dependency;
};

//EJSON fields

Receiver.prototype = {
    constructor: Receiver,

    toString: function () {
        return this.email + ": " + this._reward.toString() + " " + this.currency;
    },

    clone: function () {
        return new Receiver(this.email, this._reward, this.currency);
    },

    equals: function (other) {
        if (!(other instanceof Receiver))
            return false;

        return this.email === other.email && this._reward.cmp(other._reward) === 0
            && this.currency === other.currency;
    },

    typeName: function () {
        return "Receiver";
    },

    toJSONValue: function () {
        return {
            email: this.email,
            _reward: this._reward.toString(),
            currency: this.currency
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

/**
 * (reactive) Validation errors or an empty array if valid
 * @returns {Array.<string>}
 * @reactive
 */
Receiver.prototype.validationErrors = function () {
    var errors = [];

    var reward = this.getReward();
    var min = ReceiverUtils.minimum(this.currency);

    if (reward.cmp(new Big(0)) > 0 && reward < min)
        errors.push("Receiver reward (" + reward + ") must be 0 or > the minimum ("
            + min + " " + this.currency + ")");

    return errors;
};