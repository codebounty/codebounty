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
     * Check if there is a bounty the current user can reward at the current url
     * A bounty can be rewarded if:
     * - it is not expired
     * - it has not yet been paid
     * - the backer has not rewarded the bounty (but the system could have)
     * - someone has contributed a solution
     * @param url
     * @returns {Boolean}
     */
    "canReward": function (url) {
        url = CB.Tools.StripHash(url);

        //find if there is a bounty that is eligible for this url
        var selector = CB.Bounty.Selectors.CanBeManuallyRewarded(this.userId);
        selector.url = url;

        var bounty = Bounties.findOne(selector);
        if (!bounty) {
            return false;
        }

        var fut = new Future();

        //check someone has contributed a solution
        CB.Bounty.Contributors(null, bounty, function (contributors) {
            fut.return(contributors.length > 0);
        });

        return fut.wait();
    },

    //get contributors for the bounty at the current url
    "contributors": function (url) {
        url = CB.Tools.StripHash(url);

        var fut = new Future();

        var selector = CB.Bounty.Selectors.CanBeManuallyRewarded(this.userId);
        selector.url = url;

        var bounty = Bounties.findOne(selector);

        CB.Bounty.Contributors(null, bounty, function (contributors) {
            contributors = _.uniq(contributors, false, function (contributor) {
                return contributor.email;
            });

            fut.return(contributors);
        });

        return fut.wait();
    },

    //rewardable bounties for a url
    "rewardableBounties": function (url) {
        url = CB.Tools.StripHash(url);

        var selector = CB.Bounty.Selectors.CanBeManuallyRewarded(this.userId);
        selector.url = url;

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

            //TODO need to use localtunnel url for local testing instead of root url
            var rootUrl = Meteor.settings["ROOT_URL"];
            var imageUrl = rootUrl + "bounty/" + id;
            var commentBody = "[![Code Bounty](" + imageUrl + ")](" + rootUrl + ")";

            gitHub.PostComment(bounty, commentBody);

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
        var selector = CB.Bounty.Selectors.CanBeManuallyRewarded(this.userId);
        selector._id = {$in: ids};

        var bounties = Bounties.find(selector).fetch();
        if (bounties.length <= 0 || bounties.length !== ids.length) //make sur every bounty was found
            CB.Error.Bounty.DoesNotExist();

        CB.Bounty.InitiatePayout(bounties, payout, this.userId, function () {
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