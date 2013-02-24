var BOUNTY = (function () {
    var my = {};

    my.Create = function (amount, url) {
        Meteor.autorun(function (handle) {
            //force the user to login
            if (!Meteor.userId()) {
                Meteor.loginWithGithub({requestPermissions: ['user', 'repo']});
            } else {
                handle.stop();

                Meteor.call('createBounty', amount, url, function (error, result) {
                    if (error) {
                        debugger;
                        //TODO error handling, route to some error page with details
                    } else
                        window.location.href = result;
                });
            }
        });
    };

    my.Cancel = function (id, callback) {
        Meteor.call('cancelBounty', id, callback);
    };

    my.Confirm = function (id, callback) {
        Meteor.call('confirmBounty', id, callback);
    };

    return my;
})();