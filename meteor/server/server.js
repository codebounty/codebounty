Bounties = new Meteor.Collection("bounties");

//TODO before publish: remove this
Meteor.publish("allUserData", function () {
    return Meteor.users.find();
});

var Future = __meteor_bootstrap__.require("fibers/future");
var Fiber = __meteor_bootstrap__.require("fibers");

Meteor.methods({
    //returns true if the user added a bounty to issue that has yet to be rewarded
    //and the issue is eligible for a reward because a commit has referenced the issue
    "canReward": function (url) {
        var fut = new Future();

        var user = Meteor.users.findOne(this.userId);
        var bounty = Bounties.findOne({userId: this.userId, url: url, rewarded: null});

        if (!user || !bounty)
            fut.return(false);

        else
            GitHub.GetIssueEvents(user, bounty.repo, bounty.issue, function (error, result) {
                var anyReferencedCommit = _.any(result, function (event) {
                    return event.commit_id != null;
                });

                fut.ret(anyReferencedCommit);
            });

        return fut.wait();
    },

    //region Bounty Paypal Methods

    //return the paypal pre-approval url
    "createBounty": function (amount, bountyUrl) {
        var fut = new Future();

        var userId = this.userId;

        Fiber(function () {
            BOUNTY.parse(amount, bountyUrl, function (error, bounty) {
                if (error)
                    throw new Meteor.Error(404, "Incorrect parameters");

                //store the bounty
                bounty.userId = userId;

                var id = Bounties.insert(bounty);

                var cancel = CONFIG.rootUrl + "cancelCreateBounty?id=" + id;
                var confirm = CONFIG.rootUrl + "confirmBounty?id=" + id;

                //Start pre-approval process
                PAYPAL.GetApproval(bounty.amount, bounty.desc, cancel, confirm, function (error, data, approvalUrl) {
                    if (error) {
                        Bounties.remove({_id: id});
                        throw new Meteor.Error(500, "Error starting preapproval");
                    }

                    Fiber(function () {
                        Bounties.update({_id: id}, {$set: {preapprovalKey: data.preapprovalKey}})
                    }).run();

                    fut.ret(approvalUrl);
                });
            });
        }).run();

        return fut.wait();
    },

    /**
     * Called if the user cancels adding a new bounty in the paypal checkout
     */
    "cancelCreateBounty": function (id) {
        //TODO check that there is not a approved payment
        Bounties.remove({_id: id, userId: this.userId});
    },

    //TODO move confirm bounty to an IPN method instead. will be more stable
    //after a bounty payment has been authorized
    //test the the token and payer id are valid (since the client passed them)
    //then store them to capture the payment later
    "confirmBounty": function (id) {
        var fut = new Future();

        var user = Meteor.users.findOne(this.userId);
        var bounty = Bounties.findOne({_id: id, userId: this.userId});

        //Start pre-approval process
        PAYPAL.ConfirmApproval(bounty.preapprovalKey, function (error, data) {
            if (error)
                throw new Meteor.Error(500, "Error confirming preapproval");

            if (!data.approved)
                throw new Meteor.Error(402, "Payment not approved");

            Fiber(function () {
                Bounties.update(bounty, {$set: {approved: true}});
            }).run();

            //TODO prettify comment
            var commentBody = "I just added a " + bounty.desc +
                ". [Download](http://codebounty.com/extension) the codebounty code extension to add your bounties.";

            GitHub.PostComment(user, bounty.repo, bounty.issue, commentBody);

            fut.ret(true);
        });

        return fut.wait();
    }

    //endregion
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

Meteor.startup(function () {
//Setup Authentication Providers
//TODO need to pass settings json with deploy http://docs.meteor.com/#meteor_settings ex: meteor deploy --settings deploySettings.json
    Accounts.loginServiceConfiguration.remove({
        service: "github"
    });

    Accounts.loginServiceConfiguration.insert({
        service: "github",
        clientId: "a2087b445e1e1493bb7b",
        secret: "74e9f41bd555149d3a546620f5a398ace8e1a34f"
        //clientId: Meteor.settings.GITHUB_CLIENT_ID,
        //secret: Meteor.settings.GITHUB_SECRET
    });
});