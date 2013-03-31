//Contains all the CodeBounty server error messages
//prefixed with CB to prevent overwriting pre-existing error
CB.Error = (function () {
    var my = {};

    my.NotAuthorized = function () {
        throw new Meteor.Error(404, "Not authorized");
    };

    my.Bounty = {
        DoesNotExist: function () {
            throw new Meteor.Error(404, "Bounty does not exist, or you are not authorized to reward it");
        },
        Parsing: function () {
            throw new Meteor.Error(404, "Could not parse the bounty");
        },
        Reward: {
            NotEqual: function (description) {
                throw new Meteor.Error(404, "The total reward + fee must equal the total bounty amount", description);
            },
            NotEligible: function () {
                throw new Meteor.Error(404, "The user who created a bounty can reward it after a different user has " +
                    "committed code");
            },
            GreaterTwoDecimals: function () {
                throw new Meteor.Error(404, "Rewards must not have more than 2 decimals");
            },
            NotZeroOrFive: function () {
                throw new Meteor.Error(404, "Rewards must be $0 or >= $5");
            },
            FeeDifferenceLarge: function (difference) {
                throw new Meteor.Error(404, "The fee difference is " + difference + " which is > $1. Investigate");
            }
        }
    };

    my.GitHub = {
        Loading: {
            Commit: function (sha) {
                throw new Meteor.Error(404, "There was an error loading commit " + sha);
            }
        }
    };

    my.PayPal = {
        PreApproval: function () {
            throw new Meteor.Error(500, "Error with preapproval");
        },
        NotApproved: function () {
            throw new Meteor.Error(402, "Payment not approved");
        }
    };

    return my;
})();