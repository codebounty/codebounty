BigUtils = {};

BigUtils.sum = function (amounts) {
    var sum = _.reduce(amounts, function (sum, amount) {
        return sum.plus(amount);
    }, new Big("0"));

    return sum;
};

BigUtils.truncate = function (number, precision) {
    var numS = number.toString(),
        decPos = numS.indexOf(".");

    if (precision === null) {
        precision = 0;
    }

    var result = number;
    if (decPos > 0)
        result = numS.substr(0, 1 + decPos + precision);

    return new Big(result);
};

/**
 * The remainder of truncating a number
 */
BigUtils.remainder = function (number, precision) {
    var withoutFraction = BigUtils.truncate(number, precision);
    var remainder = number.minus(withoutFraction);
    return remainder;
};
