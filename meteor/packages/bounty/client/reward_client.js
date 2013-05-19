TotalReward = new Meteor.Collection("totalReward");

var observingTotalReward = false;
//track the total open reward for the url and send a "rewardChanged" event initially and whenever it changes
RewardUtils.trackTotal = function (url) {
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