//contains all bounty related logic on the client

var Bounty = (function () {
    var my = {};

    my.Create = function (amount, url) {
        Tools.AfterLogin(function () {
            Meteor.call("createBounty", amount, url, function (error, result) {
                if (!Tools.HandleError(error))
                    return;

                window.location.href = result;
            });
        });
    };

    //TODO force the user to login everywhere
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
                        Messenger.send({event: "rewardChanged", amount: total.amount});
                    },
                    changed: function (total) {
                        Messenger.send({event: "rewardChanged", amount: total.amount});
                    }
                });
            });
        });
    };

    return my;
})();