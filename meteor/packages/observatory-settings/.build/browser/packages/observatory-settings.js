(function () {

//////////////////////////////////////////////////////////////////////////////
//                                                                          //
// packages/observatory-settings/ObservatorySettings.js                     //
//                                                                          //
//////////////////////////////////////////////////////////////////////////////
                                                                            //
ObservatorySettings = {                                                     // 1
    allow: {                                                                // 2
        insert: function (userId, doc) {                                    // 3
            //make sure the userId is correct                               // 4
            return !(doc.uid && doc.uid !== userId);                        // 5
        },                                                                  // 6
        update: function (userId, doc, fields, modifier) {                  // 7
            return false;                                                   // 8
        },                                                                  // 9
        remove: function (userId, doc) {                                    // 10
            return false;                                                   // 11
        }                                                                   // 12
    },                                                                      // 13
    log_http: false,                                                        // 14
    printToConsole: false,                                                  // 15
    should_publish: function (publish) {                                    // 16
        //only publish logs to the admins                                   // 17
        return Meteor.users.findOne({ _id: publish.userId, role: "admin"}); // 18
    }                                                                       // 19
};                                                                          // 20
//////////////////////////////////////////////////////////////////////////////

}).call(this);
