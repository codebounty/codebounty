//Contains all the CodeBounty server error messages
//prefixed with CB to prevent overwriting pre-existing error
var CBError = (function () {
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
        CannotReward: function () {
            throw new Meteor.Error(404, "The user who created a bounty can reward it after a different user has " +
                "committed code");
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