var Future = __meteor_bootstrap__.require("fibers/future");
var Fiber = __meteor_bootstrap__.require("fibers");

Meteor.methods({

    //check if the bounty is eligible for rewarding
    "canReward": function (url) {
        var fut = new Future();

        var bounty = Bounties.findOne({url: url, rewarded: null});

        if (!bounty)
            CBError.Bounty.DoesNotExist();

        Bounty.canReward(bounty, function (canReward) {
            fut.return(canReward);
        });

        return fut.wait();
    },

    //contributors for the current url
    //TODO should this method be restricted to the bounty owner?
    "contributors": function (url) {
        var fut = new Future();

        var bounty = Bounties.findOne({url: url, rewarded: null});

        if (!bounty)
            CBError.Bounty.DoesNotExist();

        Bounty.contributors(bounty, function (contributors) {
            fut.return(contributors);
        });

        return fut.wait();
    },

    //region Bounty Paypal Methods

    //return the paypal pre-approval url
    "createBounty": function (amount, bountyUrl) {
        var fut = new Future();

        var userId = Meteor.userId();
        if (!userId)
            CBError.NotAuthorized();

        Fiber(function () {
            Bounty.parse(amount, bountyUrl, function (error, bounty) {
                if (error)
                    CBError.Bounty.Parsing();

                //store the bounty
                bounty.userId = userId;

                var id = Bounties.insert(bounty);

                var cancel = Meteor.settings["ROOT_URL"] + "cancelCreateBounty?id=" + id;
                var confirm = Meteor.settings["ROOT_URL"] + "confirmBounty?id=" + id;

                //Start pre-approval process
                PayPal.GetApproval(bounty.amount, bounty.desc, cancel, confirm, function (error, data, approvalUrl) {
                    if (error) {
                        Bounties.remove({_id: id});
                        CBError.PayPal.PreApproval();
                    }

                    //TODO check if necessary
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

        var bounty = Bounties.findOne({_id: id, userId: this.userId});

        if (!bounty)
            CBError.Bounty.DoesNotExist();

        var gitHub = new GitHub(Meteor.user());

        //Start pre-approval process
        PayPal.ConfirmApproval(bounty.preapprovalKey, function (error, data) {
            if (!data.approved)
                CBError.PayPal.NotApproved();

            Fiber(function () {
                Bounties.update(bounty, {$set: {approved: true}});
            }).run();

            //TODO prettify comment
            var commentBody = "I just added a " + bounty.desc +
                ". [Download](http://codebounty.co/extension) the codebounty code extension to add your bounties.";

            gitHub.PostComment(bounty.repo, bounty.issue, commentBody);

            fut.ret(true);
        });

        return fut.wait();
    },

    /**
     * sets the payout rates when a backer rewards a bounty
     * post a comment on the issue with the payout rate
     * and after one week if no one disputes, the bounty will automatically be paid out with this rate
     * @param url the bounty url
     * @param {Object.<string, number>} rate An object with GitHub ids and their payouts
     * Ex. {"githubid": percentageHere, "githubidTwo": 50 }
     */
    "rewardBounty": function (url, rate) {
//        var fut = new Future();
//
//        Bounty.canReward(url, function (canReward) {
//            if (!canReward)
//                CBError.Bounty.CannotReward();
//
//        });
//
//        return fut.wait();

//        var bounty = Bounties.findOne({_id: id, userId: this.userId});
//
//        if (!bounty)
//            CBError.Bounty.DoesNotExist();
//
//        var total = _.reduce(_.values(rate), function (memo, num) {
//            return memo + num;
//        }, 0);
//
//        if (total !== 100)
//            throw new Meteor.Error(404, "Total payout must equal 100%");
//
//        //check that each user who has contributed code to a bounty has been assigned a payout
//
//        //TODO write a comment on the issue about users that do not have codebounty accounts who were paid a bounty
//
//        //check each user exists
//        var users = _.keys(rate);
//        var foundUsers = Meteor.users.find({_id: {$in: users}}).count();
//        if (foundUsers !== users.length)
//            throw new Meteor.Error(404, "Not every user exists for this payout");
//
//        bounty.payout = {initiated: new Date(), rate: rate, disputed: null};
    },

    //TODO
    /**
     * used by moderators to hold a bounties reward until a dispute is resolved
     * @param id
     */
    "holdReward": function (id) {
    }

    //endregion
});