//Contains all the CodeBounty server error messages
//prefixed with CB to prevent overwriting pre-existing error
var CBError = (function () {
    var my = {};

    my.Bounty = {
        DoesNotExist: function () {
            throw new Meteor.Error(404, "Bounty does not exist, or you are not authorized to reward it");
        },
        Parsing: function () {
            throw new Meteor.Error(404, "Could not parse the bounty");
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