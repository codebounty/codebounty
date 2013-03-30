//contains all bounty related logic on the client

var Bounty = (function () {
    var my = {};

    my.Create = function (amount, url) {
        Meteor.call("createBounty", amount, url, function (error, result) {
            if (!Tools.HandleError(error))
                return;

            window.location.href = result;
        });
    };

    //TODO force the user to login everywhere
    my.Cancel = function (id, callback) {
        Meteor.call("cancelCreateBounty", id, callback);
    };

    my.Confirm = function (id, callback) {
        Meteor.call("confirmBounty", id, callback);
    };

    TotalReward = new Meteor.Collection("totalReward");

    var observingTotalReward = false;
    //track the bounty size of the url and send a "rewardChanged" event initially and whenever it changes
    my.TrackReward = function (url) {
        if (!observingTotalReward) {
            TotalReward.find().observe({
                added: function (total) {
                    Messenger.send({event: "rewardChanged", amount: total.amount});
                },
                changed: function (total) {
                    Messenger.send({event: "rewardChanged", amount: total.amount});
                }
            });

            observingTotalReward = true;
        }

        // subscribe to the total reward for the current url
        Meteor.subscribe("totalReward", url);
    };

    return my;
})();