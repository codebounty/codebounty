TotalReward = new Meteor.Collection("totalReward");

//track the total open reward for the url and send a "rewardChanged" event initially and whenever it changes
RewardUtils.trackTotal = function (url) {
    TotalReward.find().observe({
        added: function (total) {
            Messenger.send({ event: "rewardChanged", amount: total.amount });
        },
        changed: function (total) {
            Messenger.send({ event: "rewardChanged", amount: total.amount });
        }
    });

    Meteor.subscribe("totalReward", url);
};