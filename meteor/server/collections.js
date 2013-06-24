//Contains all the server publishes

//for all users
Meteor.publish(null, function () {
    return Meteor.users.find(this.userId, {fields: { active: 1, profile: 1, role: 1}});
});

//for admin users
Meteor.publish("userData", function () {
    var user = Meteor.users.findOne(this.userId);
    AuthUtils.requireAuthorization(user, "admin");

    return Meteor.users.find({_id: this.userId}, {fields: {active: 1, log: 1, role: 1, services: 1}});
});

//for admin users
Meteor.publish("rewardData", function () {
    var user = Meteor.users.findOne(this.userId);
    AuthUtils.requireAuthorization(user, "admin");

    return Rewards.find({}, {fields: { funds: 0 }});
});