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

    this.amount = options.amount;
    this.approved = options.approved;
    this.currency = options.currency;
    this.details = options.details;
    this.expires = options.expires;
    this.refunded = options.refunded;
    this.paid = options.paid;
    this.paymentError = options.paymentError;
    this.processor = options.processor;
};

Fund.prototype.isAvailable = function () {
    return this.approved && (!this.expires || this.expires >= new Date())
        && !this.paid && !this.paymentError && !this.refunded;
};

Fund.prototype.toString = function () {
    return (this.approved ? "(approved)" : "(not approved)") + (this.refunded ? " (refunded) " : " ") + this.amount +
        " " + this.currency;
};