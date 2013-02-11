var BOUNTY = (function () {
    var my = {};

    my.Create = function () {
        Meteor.autorun(function (handle) {
            //force the user to login
            if (!Meteor.userId()) {
                Meteor.loginWithGithub({});
            }
            else {
                handle.stop();
                Meteor.call('processBounty', function (error, result) {
                    window.location.href = result;
                });
            }
        });
    };

    return my;
}());