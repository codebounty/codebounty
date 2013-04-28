//TODO BITCOIN this file contains bitcoin todos
var Future = Npm.require("fibers/future");
var Fiber = Npm.require("fibers");

var errors = {
    notAuthorized: function () {
        throw new Meteor.Error(404, "Not authorized");
    }
};

Meteor.methods({
    //checks if the user has properly authorized codebounty
    "checkAuthorization": function () {
        var user = Meteor.user();
        if (!user)
            return false;

        var fut = new Future();

        var gitHub = new GitHub(user);
        gitHub.checkAccess(function (hasAccess) {
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
        url = Tools.stripHash(url);

        //find if there is a bounty that is eligible for this url
        var selector = Bounty.selectors.canBeManuallyRewarded(this.userId);
        selector.url = url;

        var bounty = Bounties.findOne(selector);
        if (!bounty) {
            return false;
        }

        var fut = new Future();

        //check someone has contributed a solution
        Bounty.contributors(null, bounty, function (contributors) {
            fut.return(contributors.length > 0);
        });

        return fut.wait();
    },

    //get contributors for the bounty at the current url
    "contributors": function (url) {
        url = Tools.stripHash(url);

        var fut = new Future();

        var selector = Bounty.selectors.canBeManuallyRewarded(this.userId);
        selector.url = url;

        var bounty = Bounties.findOne(selector);

        Bounty.contributors(null, bounty, function (contributors) {
            contributors = _.uniq(contributors, false, function (contributor) {
                return contributor.email;
            });

            fut.return(contributors);
        });

        return fut.wait();
    },

    //rewardable bounties for a url
    "rewardableBounties": function (url) {
        url = Tools.stripHash(url);

        var selector = Bounty.selectors.canBeManuallyRewarded(this.userId);
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
        url = Tools.stripHash(url);

        var fut = new Future();

        var userId = this.userId;
        if (!userId)
            errors.notAuthorized();

        Bounty.create(userId, amount, url, function (preapprovalUrl) {
            fut.ret(preapprovalUrl);
        });

        return fut.wait();
    },

    /**
     * Called if the user cancels adding a new bounty in the paypal checkout
     */
    "cancelCreateBounty": function (id) {
        Bounties.remove({_id: id, userId: this.userId, approved: false});
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
        var selector = Bounty.selectors.canBeManuallyRewarded(this.userId);
        selector._id = {$in: ids};

        var bounties = Bounties.find(selector).fetch();
        if (bounties.length <= 0 || bounties.length !== ids.length) //make sur every bounty was found
            Bounty.errors.doesNotExist();

        Bounty.initiatePayout(bounties, payout, this.userId, function () {
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