//Contains all the server collections and publishes

Bounties = new Meteor.Collection("bounties");

//TODO before publish: remove this
Meteor.publish("allUserData", function () {
    return Meteor.users.find();
});

// publish the total reward for a bounty url
Meteor.publish("totalReward", function (url) {
    var self = this; //the collection to publish

    var applicableBounties = Bounties.find({url: url, approved: true});

    var totalReward = 0;

    var initializing = true;
    var handle = applicableBounties.observe({
        added: function (bounty) {
            totalReward += parseFloat(bounty.amount);

            if (!initializing)
                self.changed("totalReward", url, {amount: totalReward});
        },
        changed: function (newBounty, oldBounty) {
            //add the difference
            var difference = parseFloat(newBounty.amount) - parseFloat(oldBounty.amount);

            if (difference !== 0) {
                totalReward += difference;
                self.changed("totalReward", url, {amount: totalReward});
            }
        },
        removed: function (bounty) {
            totalReward -= parseFloat(bounty.amount);

            self.changed("totalReward", url, {amount: totalReward});
        }
        // don't care about moved
    });

    // Observe only returns after the initial added callbacks have
    // run. Now return an initial value and mark the subscription
    // as ready.
    initializing = false;
    self.added("totalReward", url, {amount: totalReward});
    self.ready();

    // Stop observing the cursor when client unsubs.
    // Stopping a subscription automatically takes
    // care of sending the client any removed messages.
    self.onStop(function () {
        handle.stop();
    });
});
