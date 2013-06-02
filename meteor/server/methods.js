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
            var last = _.last(_.filter(result.data, function (item) {
                return item.event === "closed" || item.event === "reopened";
            }));

            fut.ret(!last || last.event !== "closed");
        });

        return fut.wait();
    },
    
    "setupReceiverAddress": function (receiverAddress, redirect) {
        var fut = new Future();
        var userId = this.userId;
        var user = Meteor.user();
        
        Fiber(function () {
            
            var registeredAddress = Bitcoin.ReceiverAddresses.findOne(
                { userId: userId });
            
            // Make sure an address has not been assigned to this user
            // before assigning one.
            if (!registeredAddress) {
                
                // We need to get this user's email address.
                var gitHub = new GitHub(user);
        
                Fiber(function () {
                    gitHub.getUser(function (error, user) {
                        Fiber(function () {
                            Bitcoin.ReceiverAddresses.insert({ userId: this.userId,
                                email: user.email, address: receiverAddress});
                        
                        
                            // See if we set up a temporary address for this user and
                            // forward any BTC in it to their receiving address.
                            Bitcoin.Client.getAccountAddress(user.email, function (err, address) {
                                
                                if (address) {
                                    Bitcoin.Client.getReceivedByAddress(address, function (err, received) {
                                    
                                        if (received) {
                                            Bitcoin.Client.sendToAddress(receiverAddress, received);
                                        }
                                    });
                                }
                            });
                        }).run();
                    });
                }).run();
            }
            fut.ret(redirect);
        }).run();
    
        
        return fut.wait();
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

        // Specifying fund amount before funds are actually received
        // is not supported by the Bitcoin flow.
        if (currency == "usd") {
            amount = new Big(amount);
        } else if (currency == "btc") {
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
        var user = Meteor.user();
        AuthUtils.requireAuthorization(user);

        issueUrl = Tools.stripHash(issueUrl);

        var fut = new Future();

        var selector = {
            userId: user._id,
            //make sure there is an approved not expired fund
            funds: { $elemMatch: { approved: { $ne: null }, expires: { $gt: new Date() } }}
        };

        var gitHub = new GitHub(user);

        RewardUtils.eligibleForManualReward(selector, {}, issueUrl, gitHub, function (rewards, contributorsEmails) {
            if (contributorsEmails && contributorsEmails.length > 0) {
                var clientRewards = _.map(rewards, RewardUtils.clientReward);
                fut.ret(clientRewards);
            } else
                fut.ret([]);
        });

        return fut.wait();
    },
    
    /**
     * Take an issue and return the user's Bitcoin address for it.
     * @param url the url to return an address for
     * @returns {String}
     */
     "btcAddressForIssue": function (url) {
        return Bitcoin.addressForIssue(this.userId, url).proxyAddress;
     },

    //TODO
    /**
     * used by moderators to hold a bounties reward until a dispute is resolved
     * @param id
     */
    "holdReward": function (id) {
    },

    /**
     * Initiate the reward payout process
     * @param reward
     * @returns true if there is no error
     */
    "reward": function (reward) {
        var user = Meteor.user();
        AuthUtils.requireAuthorization(user);

        var myReward = Rewards.findOne({_id: reward._id, userId: user._id});

        var fut = new Future();

        //update receivers before initiating payout
        var gitHub = new GitHub(Meteor.user());
        gitHub.getContributorsCommits(myReward.issueUrl, function (error, issueEvents, commits) {
            var contributorsEmails = GitHubUtils.authorsEmails(commits, gitHub.user);
            Fiber(function () {
                myReward.updateReceivers(contributorsEmails);

                //the client should only have changed the receiver amounts
                //so update the corresponding receiver amounts on the reward we fetched from the db
                //then check the reward is still valid
                _.each(reward._receivers, function (receiver) {
                    var myReceiver = _.find(myReward._receivers, function (r) {
                        return r.email === receiver.email;
                    });

                    myReceiver.setReward(receiver.amount);
                });

                myReward.initiatePayout(user._id, function (error, success) {
                    fut.ret(success);

                    if (error)
                        throw error;
                });
            }).run();
        });

        return fut.wait();
    }
});
