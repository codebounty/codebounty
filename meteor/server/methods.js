var requireAuthentication = function (userId) {
    if (!userId)
        throw new Meteor.Error(404, "Not authorized");
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
     * Check if the user can post a bounty at this url
     * - the issue is not closed
     * - the issue is for a public repository
     *   (we will not be able to get the event information if it is not)
     * - TODO the user is not banned (not setup yet)
     * @param issueUrl
     * @returns {boolean}
     */
    "canPostBounty": function (issueUrl) {
        issueUrl = Tools.stripHash(issueUrl);

        var user = Meteor.user();
        if (!user)
            return false;

        var fut = new Future();
        var gitHub = new GitHub(user);
        gitHub.getIssueEvents(issueUrl, function (error, result) {
            var last = _.last(_.filter(result.data, function (item) {
                return item.event === "closed" || item.event === "reopened";
            }));

            fut.ret(!last || last.event !== "closed");
        });

        return fut.wait();
    },

    /**
     * Check if the user can manually reward the issueUrl
     * @param issueUrl
     * @returns {Boolean}
     */
    "canReward": function (issueUrl) {
        issueUrl = Tools.stripHash(issueUrl);

        var fut = new Future();

        Meteor.call("getRewards", issueUrl, function (err, rewards) {
            if (err)
                throw err;

            fut.ret(rewards.length > 0);
        });

        return fut.wait();
    },

    /**
     * Get the rewards that can be manually rewarded by the current user
     * for the issue url which have contributors
     * @param issueUrl
     * @returns {Array.<Reward>}
     */
    "getRewards": function (issueUrl) {
        requireAuthentication(this.userId);
        issueUrl = Tools.stripHash(issueUrl);

        var fut = new Future();

        var selector = {
            userId: this.userId
        };

        var user = Meteor.users.findOne({_id: this.userId});
        var gitHub = new GitHub(user);

        RewardUtils.eligibleForManualReward(selector, {}, issueUrl, gitHub, function (rewards, contributors) {
            fut.ret(contributors && contributors.length > 0 ? rewards : []);
        });

        return fut.wait();
    },

    /**
     * Create a bounty and return it's paypal pre-approval url
     * @param amount the bounty amount
     * @param issueUrl the url to create a bounty for
     * @param currency
     * @returns {String}
     */
    "createBounty": function (amount, issueUrl, currency) {
        requireAuthentication(this.userId);
        issueUrl = Tools.stripHash(issueUrl);

        if ((!_.isNumber(amount)) || _.isNaN(amount))
            throw "Need to specify an amount";

        var bounty = {
            amount: amount,
            created: new Date(),
            currency: currency,
            reward: null,
            issueUrl: issueUrl,
            userId: this.userId
        };
        bounty._id = Bounties.insert(bounty);

        if (currency === "btc")
            throw "not implemented yet";

        //TODO remove (for debugging w/o tunnel)
//        bounty.approved = true;

        var fut = new Future();
        Bounty.PayPal.create(bounty, function (preapprovalUrl) {
            fut.ret(preapprovalUrl);

            //TODO remove (for debugging w/o tunnel)
//            Fiber(function () {
//                RewardUtils.addBounty(bounty);
//            }).run();
        });

        return fut.wait();
    },

    /**
     * Called if the user cancels adding a new bounty in the paypal checkout
     */
    "cancelCreateBounty": function (id) {
        //approved: false to prevent someone cancelling an approved bounty
        Bounties.remove({_id: id, userId: this.userId, approved: false});
    },

    //TODO change to update reward? then just have them set status to payout....
    //and validate make sure status is not sent to paid / reopened by the user or some shit like dat
    /**
     * Initiate the reward payout process
     * @param reward
     * @returns true if there is no error
     */
    "rewardBounty": function (reward) {
        requireAuthentication(this.userId);

        var fut = new Future();
        Bounty.initiatePayout(null, reward, this.userId, function () {
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
