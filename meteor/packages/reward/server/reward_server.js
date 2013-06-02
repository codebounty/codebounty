// publish the total available reward for an issue url
Meteor.publish("totalReward", function (issueUrl) {
    issueUrl = Tools.stripHash(issueUrl);

    var subscription = this;
    var docId = Meteor.uuid();
    var totalReward = new Big(0);
    var initializing = true;

    var handle = Rewards.find({
        issueUrl: issueUrl,
        status: { $in: [ "open", "reopened" ] },
        //make sure there is an approved and not expired fund
        funds: { $elemMatch: { approved: { $ne: null }, expires: { $gt: new Date() } }}
    }).observe({
            added: function (reward) {
                var totalBounties = BigUtils.sum(reward.availableFundAmounts());
                totalReward = totalReward.plus(totalBounties);

                if (!initializing) //need to wait until it is added
                    subscription.changed("totalReward", docId, {amount: totalReward.toString()});
            },
            //having an issue with Fund.amount getting cloned incorrectly / meteor not using the .clone method?
//            changed: function (reward, oldReward) {
//                var totalBounties = BigUtils.sum(reward.availableFundAmounts());
//                var lastTotalBounties = BigUtils.sum(oldReward.availableFundAmounts());
//                var addedReward = totalBounties.minus(lastTotalBounties);
//                totalReward = totalReward.plus(addedReward);
//
//                subscription.changed("totalReward", docId, {amount: totalReward.toString()});
//            },
            removed: function (reward) {
                var totalBounties = BigUtils.sum(reward.availableFundAmounts());
                totalReward = totalReward.minus(totalBounties);

                subscription.changed("totalReward", docId, {amount: totalReward.toString()});
            }
        });

    initializing = false;
    subscription.added("totalReward", docId, {amount: totalReward.toString()});
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
 * @param {Big} amount
 * @param {Function} callback (fundingUrl)
 */
Reward.prototype.addFund = function (amount, funder, callback) {
    var fundClass;
    var that = this;

    var expires = Tools.addDays(FundUtils.expiresAfterDays);
    if (that.currency === "usd") {
        fundClass = PayPalFund;
    } else if (that.currency === "btc") {
        fundClass = BitcoinFund;
    }
    
    var fund = new fundClass({
        amount: amount,
        currency: that.currency,
        expires: expires
    });
    fund.initiatePreapproval(that, funder, callback);
    
    // See if a fund matching the new fund already exists.
    // If one does, don't bother adding the new fund to the reward object.
    // If one doesn't, add the new fund to this Reward object.
    var fundExists = _.some(that.funds, function (_fund) {
        return fund.equals(_fund);
    });
    
    if (!fundExists) {
        that.funds.push(fund);
    }
};

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
    var that = this,
        rootUrl = Meteor.settings["ROOT_URL"];

    //not using available funds because a fund could have been available
    //but then expired causing a duplicate comment on the next approved fund
    var approvedFunds = _.filter(that.funds, function (fund) {
        return fund.approved;
    });
    if (approvedFunds.length !== 1)
        return;

    //post the reward comment using codebounty charlie
    var imageUrl = rootUrl + "reward/" + that._id;
    var commentBody = "[![Code Bounty](" + imageUrl + ")](" + rootUrl + ")";

    //post as charlie
    var gitHub = new GitHub();
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
            { status: { $in: ["open", "reopened"] } },
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
