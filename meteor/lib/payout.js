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
            //do this via string to prevent
            var precision = CB.Tools.Precision(userPayout.amount);
            if (precision > 2) {
                console.log("my prob", precision);
                CB.Error.Bounty.Reward.GreaterTwoDecimals();
            }

            if (!(userPayout.amount === 0 || userPayout.amount >= my.Minimum()))
                CB.Error.Bounty.Reward.NotZeroOrFive();

            totalPayout += userPayout.amount;
        });

        var fee = my.Fee(totalBounty, totalPayout);

        if (totalBounty !== (totalPayout + fee))
            CB.Error.Bounty.Reward.NotEqual("payout ($" + totalPayout + ") + fee ($" + fee +
                ") !== bounty ($" + totalBounty + ")");
    };

    //distribute the payouts among each bounty
    my.Distribute = function (bounties, payout) {
        var bountyPayoutsDistribution = [];

        //clone the payout to manipulate in distribution logic below
        var payoutToDistribute = EJSON.clone(payout);

        //move through each payout to distribute, bounty by bounty
        var currentPayoutToDistribute = payoutToDistribute.shift();
        _.each(bounties, function (bounty) {
            //the current bounty's payout to build
            var bountyPayout = [],
            //keeps track of how much is remaining on the current bounty
                bountyAmountRemaining = bounty.amount;

            while (bountyAmountRemaining > 0 && currentPayoutToDistribute !== null) {
                var payoutForBounty = {
                    email: currentPayoutToDistribute.email
                };

                //distribute part of the payout, if the bounty < bountyPayout
                if (bountyAmountRemaining < currentPayoutToDistribute.amount) {
                    payoutForBounty.amount = bountyAmountRemaining;

                    //update how much still needs to be paid
                    currentPayoutToDistribute.amount -= payoutForBounty.amount;
                }
                //distribute the rest of the payout, since the bounty > the bountyPayout
                else {
                    //distribute the entire amount
                    payoutForBounty.amount = currentPayoutToDistribute.amount;

                    //since it is distributed, remove it from the payout and
                    //move to the next payout to distribute
                    currentPayoutToDistribute = payoutToDistribute.shift();
                }

                //reduce the amount left on this bounty
                bountyAmountRemaining -= payoutForBounty.amount;

                if (bountyAmountRemaining < 0)
                    throw "Problem with distributing bounty";

                bountyPayout.push(payoutForBounty);
            }

            bountyPayoutsDistribution.push(bountyPayout);
        });

        return bountyPayoutsDistribution;
    };

    return my;
})();