TotalReward = new Meteor.Collection("totalReward");

//track the total open reward for the url and send a "rewardChanged" event initially and whenever it changes
RewardUtils.trackTotal = function (url) {
    TotalReward.find().observe({
        added: function (total) {
            Messenger.send({ event: "rewardChanged", usd: total.usd, btc: total.btc },
                Messenger.target.plugin);
        },
        changed: function (total) {
            Messenger.send({ event: "rewardChanged", usd: total.usd, btc: total.btc },
                Messenger.target.plugin);
        }
    });

    Meteor.subscribe("totalReward", url);
};
