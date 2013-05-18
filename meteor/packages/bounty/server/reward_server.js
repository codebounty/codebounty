//contains server specific reward methods

/**
 * Add a bounty to this reward
 * Redistribute the bounty amounts
 * @param bounty
 */
Reward.prototype.addBounty = function (bounty) {
    var that = this;
    that.bountyIds.push(bounty._id);
    that.bountyAmounts.push(new Big(bounty.amount));
    that.distributeEqually();
    this._receiversDep.changed();
};

/**
 * If the last issue event was
 * - closed, and the reward status is open or reopened, and there are receivers: initiate an equally distributed payout
 * - reopened and the reward status is initiated by the system: reopen the reward and cancel the payout
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
 * Find all the contributors for an issue, and make sure they are receivers
 * TODO exclude the backer from being a receiver
 */
Reward.prototype.updateReceivers = function (contributors) {
    //we do not want to use the reactive getReceivers since we are modifying it
    var receivers = this.receivers;

    var that = this;

    var receiversChanged = false;
    var contributorEmails = _.pluck(contributors, "email");

    var receiverEmails = _.pluck(receivers, "email");

    var r = 0;
    //remove receivers that are not contributors
    _.each(receiverEmails, function (receiverEmail) {
        if (!_.contains(contributorEmails, receiverEmail)) {
            receivers.splice(r, 1);
            receiversChanged = true;
        }

        r++;
    });

    //add contributors that are not receivers
    _.each(contributorEmails, function (contributorEmail) {
        if (!_.contains(receiverEmails, contributorEmail)) {
            receivers.push(new Receiver(contributorEmail, new Big(0), that.currency));
            receiversChanged = true;
        }
    });

    if (receiversChanged)
        that._receiversDep.changed();

    return receiversChanged;
};