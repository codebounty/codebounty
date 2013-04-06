//Contains all the server collections and publishes

Bounties = new Meteor.Collection("bounties");

//TODO before publish: remove this
Meteor.publish("allUserData", function () {
    return Meteor.users.find();
});

// publish the total reward for a bounty url
Meteor.publish("totalReward", function (url) {
    var self = this;
    var uuid = Meteor.uuid();
    var totalReward = 0;
    var initializing = true;

    var handle = Bounties.find({
        url: url,
        approved: true,
        reward: null,
        created: {"$gt": CB.Bounty.ExpiredDate()}
    }).observe({
            added: function (bounty) {
                totalReward += parseFloat(bounty.amount);

                if (!initializing) //need to wait until it is added
                    self.changed("totalReward", uuid, {amount: totalReward});
            },
            changed: function (newBounty, oldBounty) {
                var oldBountyAmount = parseFloat(oldBounty.amount);

                //if the new bounty now is rewarded, subtract it from the total (available) reward
                if (newBounty.reward && !oldBounty.reward) {
                    totalReward -= oldBountyAmount.amount;
                    self.changed("totalReward", uuid, {amount: totalReward});
                }
            },
            removed: function (bounty) {
                totalReward -= parseFloat(bounty.amount);

                self.changed("totalReward", uuid, {amount: totalReward});
            }
            // don't care about moved
        });

    initializing = false;

    // publish the initial amount. observeChanges guaranteed not to return
    // until the initial set of `added` callbacks have run, so the `totalReward`
    // variable is up to date.
    self.added("totalReward", uuid, {amount: totalReward});

    // and signal that the initial document set is now available on the client
    self.ready();

    // turn off observe when client unsubs
    self.onStop(function () {
        handle.stop();
    });
});
