var Future = __meteor_bootstrap__.require("fibers/future");
var Fiber = __meteor_bootstrap__.require("fibers");

Meteor.methods({
    //checks if the user has properly authorized codebounty
    "checkAuthorization": function () {
        var user = Meteor.user();
        if (!user)
            return false;

        var fut = new Future();

        var gitHub = new CB.GitHub(user);
        gitHub.CheckAccess(function (hasAccess) {
            fut.ret(hasAccess);
        });

        return fut.wait();
    },

    /**
     * Check if there is a bounty eligible for rewarding by the current user at the current url.
     * A bounty can be rewarded if:
     * - the bounty is not expired
     * - the user has not yet rewarded the bounty
     * - someone has contributed a solution
     * @param url
     * @returns {Boolean}
     */
    "canReward": function (url) {
        url = CB.Tools.StripHash(url);

        //find if there is a bounty that is eligible for this url
        //(approved, not expired, no reward, this user, not expired)
        var bounty = Bounties.findOne({
            url: url,
            approved: true,
            reward: null,
            userId: this.userId,
            created: {"$gt": CB.Bounty.ExpiredDate()}
        });

        if (!bounty) {
            return false;
        }

        var fut = new Future();

        //check someone has contributed a solution
        CB.Bounty.Contributors(bounty, function (contributors) {
            fut.return(contributors.length > 0);
        });

        return fut.wait();
    },

    //contributors for the current url
    //TODO should this method be restricted to the bounty owner?
    "contributors": function (url) {
        url = CB.Tools.StripHash(url);

        var fut = new Future();

        var bounty = Bounties.findOne({url: url, approved: true, reward: null});
        CB.Bounty.Contributors(bounty, function (contributors) {
            fut.return(contributors);
        });

        return fut.wait();
    },

    //open bounties for a url
    //if currentUser is true, only return bounties from the current user
    //TODO should this method be restricted to the bounty owner?
    "openBounties": function (url, currentUser) {
        url = CB.Tools.StripHash(url);

        var selector = {
            url: url,
            approved: true,
            reward: null,
            created: {"$gt": CB.Bounty.ExpiredDate()}
        };

        if (currentUser)
            selector.userId = this.userId;

        var bounties = Bounties.find(selector, {fields: {_id: true, amount: true, desc: true}}).fetch();
        return bounties;
    },

    //region Bounty Paypal Methods

    /**
     * Create a bounty and return it's paypal pre-approval url
     * @param amount the bounty amount
     * @param url the url to create a bounty for
     * @returns {String}
     */
    "createBounty": function (amount, url) {
        url = CB.Tools.StripHash(url);

        var fut = new Future();

        var userId = this.userId;
        if (!userId)
            CB.Error.NotAuthorized();

        CB.Bounty.Create(userId, amount, url, function (preapprovalUrl) {
            fut.ret(preapprovalUrl);
        });

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
            CB.Error.Bounty.DoesNotExist();

        var gitHub = new CB.GitHub(Meteor.user());

        //Start pre-approval process
        CB.PayPal.ConfirmApproval(bounty.preapprovalKey, function (error, data) {
            if (!data.approved || parseFloat(data.maxTotalAmountOfAllPayments) !== bounty.amount)
                CB.Error.PayPal.NotApproved();

            Fiber(function () {
                Bounties.update(bounty, {$set: {approved: true}});
            }).run();

            //TODO Issue #21: prettify this comment with auto-generated image
            var commentBody = "I just added a " + bounty.desc +
                ". [Download](http://codebounty.co/extension) the codebounty code extension to add your bounties.";

            gitHub.PostComment(bounty.repo, bounty.issue, commentBody);

            fut.ret(true);
        });

        return fut.wait();
    },

    /**
     * Initiate the reward payout process
     * @param ids the bounty ids to payout
     * @param payout
     * @returns true if there is no error
     */
    "rewardBounty": function (ids, payout) {
        var fut = new Future();

        //get all the bounties with ids sent that the user has open on the issue
        //note: not filtered by expiration date so if they are trying to reward a bounty and it expires during
        //when they have the reward screen open it will still allow them to reward the bounty
        var bounties = Bounties.find({_id: {$in: ids}, approved: true, reward: null, userId: this.userId}).fetch();
        if (bounties.length <= 0 || bounties.length !== ids.length) //make sur every bounty was found
            CB.Error.Bounty.DoesNotExist();

        CB.Bounty.InitiatePayout(bounties, payout, function () {
            fut.ret(true);
        });

        return fut.wait();
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