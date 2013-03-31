var CB = CB || {};

CB.Payout = (function () {
    var my = {};

    /**
     * Calculate the CodeBounty fee.
     * @param amount
     * @param {{bounty, payout}} [fixDifference] if specified, round up any pennies
     * @returns {number}
     */
    my.Fee = function (amount, fixDifference) {
        if ((amount * 0.05) < 1)
            return 1;

        var fee = parseFloat((amount * 0.05).toFixed(2));
        if (fixDifference) {
            var difference = fixDifference.bounty - fixDifference.payout - fee;
            if (difference > 0)
                fee += difference;

            console.log("diff " + difference);
            console.log("fee " + fee);

            if (difference > 1)
                CB.Error.Bounty.Reward.FeeDifferenceLarge(difference);
        }

        return fee;
    };

    /**
     * Calculate the minimum payout
     * @returns {number}
     */
    my.Minimum = function () {
        return 4;
    };

    /**
     * Calculate the sum of the bounties (including the fee)
     * @param bounties
     */
    my.Sum = function (bounties) {
        var totalBounty = _.reduce(bounties, function (sum, bounty) {
            return sum + bounty.amount;
        }, 0);

        return totalBounty;
    };

    /**
     * Throw an error if these conditions are not met:
     * - each payout has no more decimals than 2
     * - the total payout equals the total bounty amount - fee
     * - each payout is 0 or >= the minimum (4)
     * @param bounties
     * @param payout
     */
    my.CheckValidity = function (bounties, payout) {
        var totalPayout = 0;
        var totalBounty = my.Sum(bounties);

        _.each(payout, function (userPayout) {
            if (userPayout.amount % 0.001 != 0)
                CB.Error.Bounty.Reward.GreaterTwoDecimals();

            if (!(userPayout.amount === 0 || userPayout.amount >= my.Minimum()))
                CB.Error.Bounty.Reward.NotZeroOrFive();

            totalPayout += userPayout.amount;
        });

        var fee = my.Fee(totalBounty, {bounty: totalBounty, payout: totalPayout});

        if (totalBounty !== (totalPayout + fee))
            CB.Error.Bounty.Reward.NotEqual("payout ($" + totalPayout + ") + fee ($" + fee +
                ") !== bounty ($" + totalBounty + ")");
    };

    return my;
})();