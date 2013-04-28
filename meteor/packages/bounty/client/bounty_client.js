//contains all bounty related logic for the client

Bounty.create = function (amount, url) {
    Meteor.call("createBounty", amount, url, function (error, result) {
        if (!ErrorUtils.handle(error))
            return;

        window.location.href = result;
    });
};

Bounty.cancel = function (id, callback) {
    Meteor.call("cancelCreateBounty", id, callback);
};

TotalReward = new Meteor.Collection("totalReward");

var observingTotalReward = false;
//track the bounty size of the url and send a "rewardChanged" event initially and whenever it changes
Bounty.trackReward = function (url) {
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