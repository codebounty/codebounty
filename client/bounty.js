var BOUNTY = (function () {
    var my = {};

    my.Create = function (amount, url) {
        Meteor.autorun(function (handle) {
            //force the user to login
            if (!Meteor.userId()) {
                Meteor.loginWithGithub({});
            } else {
                handle.stop();

                Meteor.call('processBounty', amount, url, function (error, result) {
                    if (error) {
                        debugger;
                        //TODO error handling, route to some error page with details
                    } else
                        window.location.href = result;
                });
            }
        });
    };

    return my;
})();