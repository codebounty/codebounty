ObservatorySettings = {
    should_publish: function (publish) {
        //only publish logs to the admins
        return Meteor.users.findOne({ _id: publish.userId, role: "admin"});
    }
};