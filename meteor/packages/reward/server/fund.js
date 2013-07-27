//More details about fund here https://codebounty.hackpad.com/Reward-yN7ydM3LIjy
FundUtils = {
    //the # days funds expire after
    expiresAfterDays: 90
};

/**
 * Funds for payment
 * @param {{_id: string, amount: Big, approved: Date, currency: string, details: *,
 *          expires: Date, refunded: Date=, paid: Date, paymentError: string, processor: string}} options
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

    this.approved = options.approved;
    this.currency = options.currency;
    this.details = options.details;
    this.expires = options.expires;
    this.refunded = options.refunded;
    this.paid = options.paid;
    this.paymentError = options.paymentError;
    this.processor = options.processor;
    this.setAmount(options.amount); // Using setAmount so fee & payoutAmount get calculated.
};

Fund.prototype.isAvailable = function () {
    return this.approved && (!this.expires || this.expires >= new Date())
        && !this.paid && !this.paymentError && !this.refunded;
};

Fund.prototype.toString = function () {
    return (this.approved ? "(approved)" : "(not approved)") + (this.refunded ? " (refunded) " : " ") + this.amount +
        " " + this.currency;
};

Fund.prototype.fee = function () {
    var that = this;
    var truncateAfterDecimals = that.currency === "usd" ? 2 : 4;

    var fee = that.amount.times(Reward.Fee.Rate);

    // Bump the fee up to the minimum codebounty fee if necessary.
    //USD: $1 minimum fee
    if (that.currency === "usd" && fee.lt(Reward.Fee.Minimum.USD))
        fee = Reward.Fee.Minimum.USD;
    //BTC: .005 minimum fee, approx $0.5-$1 USD
    else if (that.currency === "btc" && fee.lt(Reward.Fee.Minimum.BTC))
        fee = Reward.Fee.Minimum.BTC;

    // After subtracting the fee from the total amount, figure out the value
    // of any amount beyond the maximum allowed decimal precision.
    var feeFractions = new Big(0);

    var fraction = BigUtils.remainder(that.amount.minus(fee), truncateAfterDecimals);

    if (fraction.gt(0)) {
        that.amount = BigUtils.truncate(that.amount, truncateAfterDecimals);
        feeFractions = feeFractions.plus(fraction);
    }

    // Add any amount beyond the maximum decimal precision to the fee.
    if (feeFractions.gt(0)) {
        fee = fee.plus(feeFractions);
        TL.info("Fractional fee for " + that._id.toString() + ": " + feeFractions.toString(), Modules.Reward);
    }
    return fee;
};

/**
 * Sets the amount property and updates the payoutAmount property.
 * Useful for if you need to change the Fund's amount after instantiating it.
 * Preferred to setting amount directly.
 */
Fund.prototype.setAmount = function (amount) {
    this.amount = amount;
    this.payoutAmount = this.amount.minus(this.fee());
};