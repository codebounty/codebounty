var BOUNTY = (function () {
    var my = {};

    my.Create = function (amount, url) {
        Meteor.autorun(function (handle) {
            //force the user to login
            if (!Meteor.userId()) {
                Meteor.loginWithGithub({requestPermissions: ["user", "repo"]});
            } else {
                handle.stop();

                Meteor.call("createBounty", amount, url, function (error, result) {
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
        Meteor.call("cancelCreateBounty", id, callback);
    };

    my.Confirm = function (id, callback) {
        Meteor.call("confirmBounty", id, callback);
    };

    var totalRewardComputation;
    //track the bounty size of the url and send a "rewardChanged" event initially and whenever it changes
    my.TrackReward = function (url) {
        //stop the previous live query
        if (totalRewardComputation)
            totalRewardComputation.stop();

        Meteor.startup(function () {
            Deps.autorun(function (c) {
                totalRewardComputation = c;

                // subscribe to the total reward for the current url
                Meteor.subscribe("totalReward", url);

                var totalReward = new Meteor.Collection("totalReward");
                totalReward.find().observe({
                    added: function (total) {
                        MESSENGER.send({event: "rewardChanged", amount: total.amount});
                    },
                    changed: function (total) {
                        MESSENGER.send({event: "rewardChanged", amount: total.amount});
                    }
                });
            });
        });
    };

    return my;
})();