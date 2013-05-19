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

    //Funds ---------------------------------------------------------------------

    /**
     * Add funds to a reward
     * @param amount
     * @param currency
     * @param issueUrl
     * @returns {string} The funding url
     */
    "addFunds": function (amount, currency, issueUrl) {
        var userId = this.userId;
        requireAuthentication(userId);
        issueUrl = Tools.stripHash(issueUrl);

        if (currency !== "usd" && currency !== "btc")
            throw currency + " is an invalid currency";

        amount = new Big(amount);

        var fut = new Future();
        RewardUtils.addFundsToIssue(amount, currency, issueUrl, userId, function (fundingUrl) {
            fut.ret(fundingUrl);
        });

        return fut.wait();
    },

    /**
     * Called if the user cancels adding a new bounty in the paypal checkout
     */
    "cancelFunds": function (fundId) {
        fundId = new Meteor.Collection.ObjectID(fundId);

        var userId = this.userId;
        requireAuthentication(userId);

        var reward = Rewards.findOne({ userId: userId, "funds._id": fundId });
        if (!reward)
            return;

        //do not allow cancelling of an approved fund
        var fund = _.find(reward.funds, function (fund) {
            return EJSON.equals(fund._id, fundId) && !fund.isAvailable();
        });

        if (fund)
            fund.cancel(reward);
    },

    //Rewards ---------------------------------------------------------------------

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
        var userId = this.userId;
        requireAuthentication(userId);
        issueUrl = Tools.stripHash(issueUrl);

        var fut = new Future();

        var selector = {
            userId: this.userId,
            //make sure there is an approved not expired fund
            funds: { $elemMatch: { approved: { $ne: null }, expires: { $gt: new Date() } }}
        };

        var user = Meteor.users.findOne({_id: userId});
        var gitHub = new GitHub(user);

        RewardUtils.eligibleForManualReward(selector, {}, issueUrl, gitHub, function (rewards, contributors) {
            if (contributors && contributors.length > 0) {
                var clientRewards = _.map(rewards, RewardUtils.clientReward);
                fut.ret(clientRewards);
            } else
                fut.ret([]);
        });

        return fut.wait();
    },

    /**
     * Initiate the reward payout process
     * @param reward
     * @returns true if there is no error
     */
    "reward": function (reward) {
        var userId = this.userId;
        requireAuthentication(userId);

        var myReward = Rewards.findOne({_id: reward._id, userId: userId});

        var fut = new Future();

        //update receivers before initiating payout
        var gitHub = new GitHub(Meteor.user());
        gitHub.getContributorsCommits(myReward.issueUrl, function (error, issueEvents, commits) {
            var contributors = _.map(commits, function (commit) {
                return commit.author;
            });
            contributors = _.uniq(contributors, false, function (contributor) {
                return contributor.email;
            });

            Fiber(function () {
                myReward.updateReceivers(contributors);

                //the client should only have changed the receiver amounts
                //so update the corresponding receiver amounts on the reward we fetched from the db
                //then check the reward is still valid
                _.each(reward._receivers, function (receiver) {
                    var myReceiver = _.find(myReward._receivers, function (r) {
                        return r.email === receiver.email;
                    });

                    myReceiver.setReward(receiver.amount);
                });

                myReward.initiatePayout(userId, function (error, success) {
                    fut.ret(success);

                    if (error)
                        throw error;
                });
            }).run();
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
});
