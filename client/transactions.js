var TRANSACTION = (function () {
    var my = {};

    my.StartTransaction = function () {
        Meteor.autorun(function (handle) {
            //force the user to login
            if (!Meteor.userId()) {
                Meteor.loginWithGithub({});
            }
            else {
                handle.stop();
                //process the transaction
                //TODO extract info from url
                Meteor.call('processTransaction', function (error, result) {

                });
            }
        });
    };

    return my;
}());