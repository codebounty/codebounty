var CB = CB || {};

CB.Payout = (function () {
    var my = {};

    /**
     * Calculate the CodeBounty fee
     * @param amount the bounty amount
     * @param [payout] if specified, round up any pennies of the difference between the bounty and the payout
     * @returns {number}
     */
    my.Fee = function (amount, payout) {
        var fee = CB.Tools.Round(amount * 0.05, 2);
        if (fee < 1)
            return 1;

        if (payout) {
            var difference = CB.Tools.Round(amount - payout - fee, 2);
            if (difference > 0)
                fee += difference;

            if (difference > 1)
                CB.Error.Bounty.Reward.FeeDifferenceLarge(difference);
        }

        fee = CB.Tools.Round(fee, 2);

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
     * - each payout has no more than 2 decimals
     * - the total payout equals the total bounty amount - fee
     * - each payout is 0 or >= the minimum (4)
     * @param bounties
     * @param payout
     */
    my.CheckValidity = function (bounties, payout) {
        var totalPayout = 0;
        var totalBounty = my.Sum(bounties);

        _.each(payout, function (userPayout) {
            if (userPayout.amount * 100 % 1 != 0)
                CB.Error.Bounty.Reward.GreaterTwoDecimals();

            if (!(userPayout.amount === 0 || userPayout.amount >= my.Minimum()))
                CB.Error.Bounty.Reward.NotZeroOrFive();

            totalPayout += userPayout.amount;
        });

        var fee = my.Fee(totalBounty, totalPayout);

        if (totalBounty !== (totalPayout + fee))
            CB.Error.Bounty.Reward.NotEqual("payout ($" + totalPayout + ") + fee ($" + fee +
                ") !== bounty ($" + totalBounty + ")");
    };

    return my;
})();