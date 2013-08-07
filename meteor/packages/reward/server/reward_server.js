var rootUrl = Meteor.settings["ROOT_URL"];

// publish the total available reward for an issue url
Meteor.publish("totalReward", function (issueUrl) {
    issueUrl = Tools.stripHash(issueUrl);

    var subscription = this;
    var docId = Meteor.uuid();
    var totalReward = { usd: new Big(0), btc: new Big(0) };
    var initializing = true;

    var handle = Rewards.find({
        issueUrl: issueUrl,
        status: { $in: [ "open", "reopened" ] },
        //make sure there is an approved and not expired fund
        funds: { $elemMatch: { approved: { $ne: null }, expires: { $gt: new Date() } }}
    }).observe({
            added: function (reward) {
                var totalBounties = BigUtils.sum(reward.availableFundPayoutAmounts());
                totalReward[reward.currency] = totalReward[reward.currency].plus(totalBounties);

                if (!initializing) //need to wait until it is added
                    subscription.changed("totalReward", docId, {
                        usd: totalReward.usd.toString(),
                        btc: totalReward.btc.toString()
                    });
            },
            removed: function (reward) {
                var totalBounties = BigUtils.sum(reward.availableFundPayoutAmounts());
                totalReward[reward.currency] = totalReward[reward.currency].minus(totalBounties);

                subscription.changed("totalReward", docId, {
                    usd: totalReward.usd.toString(),
                    btc: totalReward.btc.toString()
                });
            }
        });

    initializing = false;
    subscription.added("totalReward", docId, {
        usd: totalReward.usd.toString(),
        btc: totalReward.btc.toString()
    });
    subscription.ready();

    // turn off observe when client unsubscribes
    subscription.onStop(function () {
        handle.stop();
    });
});

//on the server auto-transform the json to a reward
Rewards = new Meteor.Collection("rewards", {
    transform: RewardUtils.fromJSONValue
});

/**
 * NOTE: This will update the object, but not the database
 * @param {Big} amount
 * @param funder
 * @param {Function} callback (fundingUrl)
 */
Reward.prototype.addFund = function (amount, funder, callback) {
    var that = this,
        expires = Tools.addDays(FundUtils.expiresAfterDays),
        fund;

    if (that.currency === "usd") {
        fund = new PayPalFund({
            amount: amount,
            currency: that.currency,
            expires: expires
        });
        that.funds.push(fund);
        fund.initiatePreapproval(that, function (preapprovalUrl) {
            callback(preapprovalUrl);
        });

        return;
    }

    if (that.currency === "btc") {
        var address = Bitcoin.addressForIssue(funder._id, that.issueUrl);
        
        if (!address) {
            callback(rootUrl + "newAddressError");
            return;
        }
        
        var fundingUrl = rootUrl + "addBitcoinFunds?issueAddress=" + address.proxyAddress;

        //only need to setup a fund for btc if there is not one already
        if (that.funds.length > 0) {
            callback(fundingUrl);
            return;
        } else {
            fund = new BitcoinFund({
                address: address.address,
                amount: new Big(0), //will always start as 0
                expires: expires,
                proxyAddress: address.proxyAddress,
                userId: funder._id
            });
            that.funds.push(fund);
        }

        // Make sure this user has a receiving address set up before
        // we issue them an address to send us funds through in the add bitcoin funds view
        var email = AuthUtils.email(funder);
        var receivingAddress = Bitcoin.ReceiverAddresses.findOne({ email: email });
        if (!receivingAddress)
            callback(rootUrl + "setupReceiverAddress?redirect=" + encodeURIComponent(fundingUrl));
        else
            callback(fundingUrl);

        return;
    }

    throw "Unhandled add funds scenario";
};


/**
 * Save the Reward's funds list to the database.
 * @param {Function} callback ()
 */
Reward.prototype.saveFunds = function (callback) {
    var that = this;
    
    Fiber(function () {
        // Just update the reward funds. Receivers are updated
        // in the eligibleForManualReward for existing rewards
        var funds = _.map(that.funds, function (fund) {
            return fund.toJSONValue();
        });
        
        Rewards.update(that._id, {
            $set: {
                funds: funds,
                lastSync: new Date(),
                //for the client
                _availableFundAmounts: _.map(that.availableFundAmounts(), function (amount) {
                    return amount.toString()
                }),
                //for the client
                _availableFundPayoutAmounts: _.map(that.availableFundPayoutAmounts(), function (amount) {
                    return amount.toString()
                }),
                _expires: that.expires()
            }
        });
        
        // Call whatever was passed in.
        if (callback)
            callback();
    }).run();
}

/**
 * If the last issue event was
 * - closed, and the reward status is open or reopened, and there are receivers: initiate an equally distributed payout
 * - reopened and the reward status is initiated by the system: reopen the reward and cancel the payout
 * NOTE: Only call this after updating the reward's receivers, because a payout might be initiated
 */
Reward.prototype.checkStatus = function (issueEvents) {
    var that = this;

    //find the last closed or reopened issue event
    var last = _.last(_.filter(issueEvents, function (item) {
        return item.event === "closed" || item.event === "reopened";
    }));
    if (!last)
        return;

    //initiate an equally distributed payout
    if (last.event === "closed" && (that.status === "open" || that.status === "reopened")
        && that.receivers.length > 0) {
        that.distributeEqually();

        that.initiatePayout("system", function (err) {
            if (err)
                throw err;
        });
    }
    //cancel the payout and reopen the reward
    else if (last.event === "reopened" && that.status === "initiated" && that.payout.by === "system") {
        that.cancelPayout("reopened");
    }
};

/**
 * Called whenever a fund is approved
 * Post the reward comment the first time this is called
 */
Reward.prototype.fundApproved = function () {
    var that = this;

    //not using available funds because a fund could have been available
    //but then expired causing a duplicate comment on the next approved fund
    var approvedFunds = _.filter(that.funds, function (fund) {
        return fund.approved;
    });
    if (approvedFunds.length !== 1)
        return;

    //post the reward comment using codebounty charlie
    var imageUrl = rootUrl + "reward/image/" + that._id;
    var commentLink = rootUrl + "reward/link/" + that._id;
    var commentBody = "[![Code Bounty](" + imageUrl + ")](" + commentLink + ")";

    //post as charlie
    var gitHub = new GitHub({
        accessToken: Meteor.settings["GITHUB_COMMENTER"],
        onError: GitHubUtils.Local.Logging.onError,
        onSuccess: GitHubUtils.Local.Logging.onSuccess
    });
    gitHub.postComment(that.issueUrl, commentBody);
};

/**
 * Find all the contributors for an issue, and make sure they are receivers
 */
Reward.prototype.updateReceivers = function (contributorsEmails) {
    //we do not want to use the reactive getReceivers since we are modifying it
    var receivers = this.receivers;

    var that = this;
    var receiversChanged = false;
    var receiverEmails = _.pluck(receivers, "email");
    var r = 0;
    //remove receivers that are not contributors
    _.each(receiverEmails, function (receiverEmail) {
        if (!_.contains(contributorsEmails, receiverEmail)) {
            receivers.splice(r, 1);
            receiversChanged = true;
        }

        r++;
    });

    //add contributors that are not receivers
    _.each(contributorsEmails, function (contributorEmail) {
        if (!_.contains(receiverEmails, contributorEmail)) {
            var newReceiver = new Receiver({
                currency: that.currency,
                email: contributorEmail,
                reward: new Big(0)
            });

            receivers.push(newReceiver);
            receiversChanged = true;
        }
    });

    if (receiversChanged)
        that._receiversDep.changed();

    return receiversChanged;
};

/**
 * check every minute for rewards that should be expired
 * note: limited at 50 rewards/minute (1/minute * 50/time)
 * todo scalability: move this to separate process
 */
Meteor.setInterval(function () {
    var expiredRewards = Rewards.find({
        $and: [
            //eligible to be rewarded
            { status: { $in: ["open", "reopened", "held"] } },
            //has an expired fund
            { funds: { $elemMatch: { expires: { $lt: new Date() } } } }
        ]
    }, {
        limit: 50
    }).fetch();

    expiredRewards.forEach(function (reward) {
        //need to make sure there are no available funds
        if (reward.availableFunds().length > 0)
            return;

        Rewards.update(reward._id, {$set: {status: "expired"}});
    });
}, 60000);
