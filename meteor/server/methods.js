Meteor.methods({
    //Authorization -------------------------------------------------------------

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
     * @param issueUrl
     * @returns {boolean}
     */
    "canPostBounty": function (issueUrl) {
        issueUrl = Tools.stripHash(issueUrl);

        var user = Meteor.user();
        if (!user || !user.active)
            return false;

        var fut = new Future();
        var gitHub = new GitHub(user);
        gitHub.getIssueEvents(issueUrl, function (error, result) {
            if (error) {
                TL.error("Error checking canPostBounty: " + EJSON.stringify(error), Modules.Github);
                fut.ret(false);
                return;
            }

            var last = _.last(_.filter(result.data, function (item) {
                return item.event === "closed" || item.event === "reopened";
            }));

            fut.ret(!last || last.event !== "closed");
        });

        return fut.wait();
    },

    "setupReceiverAddress": function (receiverAddress) {
        var user = Meteor.user();

        //TODO check this is a valid bitcoin address?

        // Make sure an address has not been assigned to this user before assigning one
        var registeredAddress = Bitcoin.ReceiverAddresses.findOne({ userId: user._id });
        if (registeredAddress)
            throw "Receiver address already setup for user";

        var email = AuthUtils.email(user);
        Bitcoin.ReceiverAddresses.insert({ userId: user._id, email: email, address: receiverAddress});

        // See if we set up a temporary address for this user and
        // forward any BTC in it to their receiving address
        var tempAddress = Bitcoin.TemporaryReceiverAddresses.findOne({ email: user.email });
        if (tempAddress) {
            Fiber(function () {
                Bitcoin.Client.getReceivedByAddress(tempAddress.address,
                function (err, received) {
                    if (received)
                        Bitcoin.Client.sendToAddress(receiverAddress, received);
                });
                Bitcoin.TemporaryReceiverAddresses.remove({ email: user.email });
            }).run();
        }
    },

    "setIsActive": function (user, isActive, reason) {
        var currentUser = Meteor.user();
        AuthUtils.requireAuthorization(currentUser, "admin");

        var logItem = "User set to " + (isActive ? "active" : "inactive") +
            " on " + new Date().toString() + " by " + currentUser._id +
            " because " + reason;

        Meteor.users.update(user._id, {
            $set: { active: isActive },
            $push: { log: logItem }
        });

        return logItem;
    },

    "setRole": function (user, role, reason) {
        var currentUser = Meteor.user();
        AuthUtils.requireAuthorization(currentUser, "admin");

        if (!_.contains(["admin", "user"], role))
            throw new Meteor.Error(400, "Invalid role");

        var logItem = "User set to " + role + " on " + new Date().toString() +
            " by " + currentUser._id + " because " + reason;

        Meteor.users.update(user._id, {
            $set: { role: role },
            $push: { log: logItem }
        });

        return logItem;
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
        var user = Meteor.user();
        AuthUtils.requireAuthorization(user);

        issueUrl = Tools.stripHash(issueUrl);

        if (currency !== "usd" && currency !== "btc")
            throw currency + " is an invalid currency";


        if (currency == "usd") {
            amount = new Big(amount);

            if (amount.lt(ReceiverUtils.minimum("usd")))
                throw "Cannot add less than the minimum funds";

            // Calculate how much we should charge the bounty poster
            // in order to leave the bounty amount they specified
            // after we take our fee.
            if (amount.times(Reward.Fee.Rate) < Reward.Fee.Minimum.USD) {
                amount = amount.plus(Reward.Fee.Minimum.USD);
            } else {
                amount = amount.div((new Big(1)).minus(Reward.Fee.Rate));
            }

            if (BigUtils.remainder(amount, 2).gt(0)) {
                // Equivalent to amount.times(10).ceil().div(10).
                // If there's a fractional amount, we want to round it up.
                amount = BigUtils.truncate(amount, 2).plus(0.01);
            }


        } else if (currency == "btc") {
            // Specifying fund amount before funds are actually received
            // is not supported by the Bitcoin flow, so we just set it to
            // zero for now.
            amount = new Big(0);
        }

        var fut = new Future();
        RewardUtils.addFundsToIssue(amount, currency, issueUrl, user, function (fundingUrl) {
            fut.ret(fundingUrl);
        });

        return fut.wait();
    },

    /**
     * Called if the user cancels adding a new bounty in the paypal checkout
     */
    "cancelFunds": function (fundId) {
        fundId = new Meteor.Collection.ObjectID(fundId);

        var user = Meteor.user();
        AuthUtils.requireAuthorization(user);

        var reward = Rewards.findOne({ userId: user._id, "funds._id": fundId });
        if (!reward)
            return;

        //do not allow cancelling of an approved fund
        var fund = _.find(reward.funds, function (fund) {
            return EJSON.equals(fund._id, fundId) && !fund.isAvailable();
        });

        if (fund)
            fund.cancel(reward);
    },

    //Rewards -------------------------------------------------------------------

    /**
     * Check if the user can manually reward the issueUrl
     * @param issueUrl
     * @returns {Boolean}
     */
    "canReward": function (issueUrl) {
        issueUrl = Tools.stripHash(issueUrl);

        var fut = new Future();
        Meteor.call("getReward", issueUrl, function (err, reward) {
            if (err)
                throw err;

            fut.ret(!!reward);
        });

        return fut.wait();
    },

    /**
     * Get the most valuable reward that can be manually rewarded by the current user
     * for the issue url which have contributors
     * @param issueUrl
     * @param {boolean} [byAdmin] If this was initiated by an admin
     * @returns {Reward}
     */
    "getReward": function (issueUrl, byAdmin) {
        var user = Meteor.user();
        AuthUtils.requireAuthorization(user, byAdmin ? "admin" : null);

        issueUrl = Tools.stripHash(issueUrl);

        var fut = new Future();

        var selector = {
            //make sure there is an approved not expired fund
            funds: { $elemMatch: { approved: { $ne: null }, expires: { $gt: new Date() } }}
        };

        if (!byAdmin)
            selector.userId = user._id;

        var gitHub = new GitHub(user);

        RewardUtils.eligibleForManualReward(selector, {}, issueUrl, true, gitHub, function (rewards, contributorsEmails) {
            if (contributorsEmails && contributorsEmails.length > 0) {
                var clientRewards = _.map(rewards, RewardUtils.clientReward);

                //order by size
                clientRewards = _.sortBy(clientRewards, function (reward) {
                    return parseFloat(BigUtils.sum(reward.availableFundPayoutAmounts()).toString());
                });

                //return the largest one
                fut.ret(clientRewards.length > 0 ? _.last(clientRewards) : null);
            } else {
                fut.ret(null);
            }
        });

        return fut.wait();
    },

    /**
     * used by admins to hold a reward until a dispute is resolved
     * @param {string} id
     * @param {string} reason
     */
    "holdReward": function (id, reason) {
        var user = Meteor.user();
        AuthUtils.requireAuthorization(user, "admin");

        var logItem = "Reward held on " + new Date().toString() +
            " by " + user._id + " because " + reason;

        Rewards.update(id, {
            $set: { status: "held" },
            $push: { log: logItem }
        });

        return logItem;
    },

    /**
     * used by admins to refund a reward
     * @param {string} id
     * @param {string} reason
     */
    "refundReward": function (id, reason) {
        var user = Meteor.user();
        AuthUtils.requireAuthorization(user, "admin");

        var reward = Rewards.findOne(id);
        var logItem = reward.refund(user._id, reason);

        Rewards.update(id, {
            $set: { status: "refunded" },
            $push: { log: logItem }
        });

        return logItem;
    },

    /**
     * Initiate the reward payout process
     * @param reward
     * @param {boolean} [byAdmin] If this was initiated by an admin
     * @param {string} [reason] Required if initiated by an admin
     * @returns true if there is no error
     */
    "reward": function (reward, byAdmin, reason) {
        var user = Meteor.user();
        AuthUtils.requireAuthorization(user, byAdmin ? "admin" : null);

        var selector = {
            _id: reward._id
        };
        if (!byAdmin)
            selector.userId = user._id;

        var myReward = Rewards.findOne(selector);
        if (byAdmin) {
            var logItem = "Rewarded on " + new Date().toString() + " by " + user._id + " because " + reason;

            Rewards.update(reward._id, {
                $push: { log: logItem }
            });
        }

        var fut = new Future();

        //update receivers before initiating payout
        var gitHub = new GitHub(Meteor.user());
        gitHub.getContributorsCommits(myReward.issueUrl, function (error, issueEvents, commits) {
            if (error) {
                fut.ret(false);
                return;
            }

            var contributorsEmails = GitHubUtils.authorsEmails(commits, gitHub.user);
            Fiber(function () {
                myReward.updateReceivers(contributorsEmails);

                //the client should only have changed the receiver amounts
                //so update the corresponding receiver amounts on the reward we fetched from the db
                //then check the reward is still valid
                _.each(reward.receivers, function (receiver) {
                    var myReceiver = _.find(myReward.receivers, function (r) {
                        return r.email === receiver.email;
                    });

                    myReceiver.setReward(receiver.getReward());
                });

                myReward.initiatePayout(byAdmin ? "admin" : user._id, function (error, success) {
                    fut.ret(success);

                    if (error)
                        TL.error("Error initiating payout for " + myReward._id.toString() +
                            " :" + EJSON.stringify(error), Modules.Reward);
                });
            }).run();
        });

        return fut.wait();
    }
});
