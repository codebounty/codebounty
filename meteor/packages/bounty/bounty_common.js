Bounty = {};

//common errors
Bounty.errors = {
    doesNotExist: function () {
        throw new Meteor.Error(404, "Bounty does not exist, or you are not authorized to reward it");
    },
    parsing: function () {
        throw new Meteor.Error(404, "Could not parse the bounty");
    }
};