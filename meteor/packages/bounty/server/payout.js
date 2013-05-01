//TODO refactor to allow for bitcoin payments
Payout = {};

Payout.errors = {
    notEqual: function (description) {
        throw new Meteor.Error(404, "The total reward + fee must equal the total bounty amount", description);
    },
    notEligible: function () {
        throw new Meteor.Error(404, "The user who created a bounty can reward it after a different user has " +
            "committed code");
    },
    greaterTwoDecimals: function () {
        throw new Meteor.Error(404, "Rewards must not have more than 2 decimals");
    },
    notZeroOrMinimum: function (minimum) {
        throw new Meteor.Error(404, "Rewards must be $0 or >= $", minimum);
    },
    feeDifferenceLarge: function (difference) {
        throw new Meteor.Error(404, "The fee difference is " + difference + " which is > $1. Investigate");
    }
};

/**
 * Calculate the CodeBounty fee
 * @param amount the bounty amount
 * @param [payout] if specified, round up any pennies of the difference between the bounty and the payout
 * @returns {number}
 */
Payout.fee = function (amount, payout) {
    var fee = Tools.round(amount * 0.05, 2);
    if (fee < 1)
        return 1;

    if (payout) {
        var difference = Tools.round(amount - payout - fee, 2);
        if (difference > 0)
            fee += difference;

        if (difference > 1)
            Payout.errors.feeDifferenceLarge(difference);
    }

    fee = Tools.round(fee, 2);

    return fee;
};

/**
 * Calculate the minimum payout
 * @returns {number}
 */
Payout.minimum = function () {
    return 4;
};

/**
 * Calculate the sum of the bounty payments (including the fee / the fee is not removed)
 * @param bounties
 */
Payout.sum = function (bounties) {
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
Payout.checkValidity = function (bounties, payout) {
    var totalPayout = 0;
    var totalBounty = Payout.sum(bounties);

    _.each(payout, function (userPayout) {
        //do this via string to prevent
        var precision = Tools.precision(userPayout.amount);
        if (precision > 2) {
            Payout.errors.greaterTwoDecimals();
        }

        if (!(userPayout.amount === 0 || userPayout.amount >= Payout.minimum()))
            Payout.errors.notZeroOrMinimum(Payout.minimum());

        totalPayout += userPayout.amount;
    });

    var fee = Payout.fee(totalBounty, totalPayout);

    if (totalBounty !== (totalPayout + fee))
        Payout.errors.notEqual("payout ($" + totalPayout + ") + fee ($" + fee +
            ") !== bounty ($" + totalBounty + ")");
};

//distribute the payouts among each bounty
Payout.distribute = function (bounties, payout) {
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