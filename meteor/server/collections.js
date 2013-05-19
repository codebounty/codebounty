//Contains all the server publishes

//stores all the bounties and their associated information
Bounties = new Meteor.Collection("bounties");

//TODO before publish: remove this
Meteor.publish("allUserData", function () {
    return Meteor.users.find();
});

// publish the total available reward for an issue url
Meteor.publish("totalReward", function (issueUrl) {
    issueUrl = Tools.stripHash(issueUrl);

    var self = this;
    var uuid = Meteor.uuid();
    var totalReward = new Big(0);
    var initializing = true;

    var handle = Rewards.find({
        issueUrl: issueUrl,
        "status": { $in: [ "open", "reopened" ] },
        //make sure there is an approved and not expired fund
        funds: { $elemMatch: { approved: { $ne: null }, expires: { $gt: new Date() } }}
    }).observe({
            added: function (reward) {
                var totalBounties = BigUtils.sum(reward.availableFundAmounts());
                totalReward = totalReward.plus(totalBounties);

                if (!initializing) //need to wait until it is added
                    self.changed("totalReward", uuid, {amount: totalReward.toString()});
            },
            removed: function (reward) {
                var totalBounties = BigUtils.sum(reward.availableFundAmounts());
                totalReward = totalReward.minus(totalBounties);

                self.changed("totalReward", uuid, {amount: totalReward.toString()});
            }
        });

    initializing = false;

    // publish the initial amount. observeChanges guaranteed not to return
    // until the initial set of `added` callbacks have run, so the `totalReward`
    // variable is up to date.
    self.added("totalReward", uuid, {amount: totalReward.toString()});

    // and signal that the initial document set is now available on the client
    self.ready();

    // turn off observe when client unsubscribes
    self.onStop(function () {
        handle.stop();
    });
});
