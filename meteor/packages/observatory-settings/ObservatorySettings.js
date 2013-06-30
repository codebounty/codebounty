ObservatorySettings = {
    allow: {
        insert: function (userId, doc) {
            //make sure the userId is correct
            return !(doc.uid && doc.uid !== userId);
        },
        update: function (userId, doc, fields, modifier) {
            return false;
        },
        remove: function (userId, doc) {
            return false;
        }
    },
    log_http: false,
    printToConsole: false,
    should_publish: function (publish) {
        //only publish logs to the admins
        return Meteor.users.findOne({ _id: publish.userId, role: "admin"});
    }
};