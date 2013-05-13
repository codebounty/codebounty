BigUtils = {};

BigUtils.sum = function (amounts) {
    var sum = _.reduce(amounts, function (sum, amount) {
        return sum.plus(amount);
    }, new Big("0"));

    return sum;
};