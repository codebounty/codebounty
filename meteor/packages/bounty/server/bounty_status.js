//contains all bounty status payment logic

//check if the status changed on any related bounties (whenever GitHub.GetIssueEvents is called)
//only check bounties that have not been paid, and have not been rewarded by the user
//then if the status changed to
// - closed: initiate the payout
// - reopened: cancel the payout (this will only happen during the hold period)
var watchStatusToInitiateOrCancelPayout = function () {
    GitHub.onGetBountyIssueEvents(function (gitHubInstance, bounty, error, result) {
        if (error)
            return;

        //find the last closed or reopened event
        var last = _.last(_.filter(result.data, function (item) {
            return item.event === "closed" || item.event === "reopened";
        }));
        if (!last || (last.event !== "closed" && last.event !== "reopened"))
            return;

        Fiber(function () {
            //find all bounties that should be updated for the issue
            var selector = Bounty.selectors.canBeManuallyRewarded();
            selector.repo = bounty.repo;
            selector.issue = bounty.issue;

            var bounties = Bounties.find(selector).fetch();

            if (bounties.length <= 0)
                return;

            var changedBounties = [];

            //update each bounty's status
            //(also prevents infinite loop)
            _.each(bounties, function (bounty) {
                if (!bounty.status || bounty.status.event !== last.event) {
                    changedBounties.push(bounty);
                    console.log("Bounty", bounty._id, "status changed to", last.event);
                }

                bounty.status = last.event;
                Bounties.update({_id: bounty._id}, {
                    $set: {
                        status: {
                            updated: new Date(),
                            event: last.event
                        }
                    }
                });
            });

            //only deal with bounties whose status has changed
            bounties = changedBounties;
            if (bounties.length <= 0)
                return;

            var bountyIds = _.pluck(bounties, "_id").join(",");

            //if the issue's status is closed: initiate an equal payout
            if (last.event === "closed") {
                console.log("initiate payout", bounties);

                Bounty.contributors(gitHubInstance, bounties[0], function (contributors) {
                    //if there are no contributors, do nothing
                    if (contributors.length <= 0) {
                        //TODO post comment or send email, there were no contributors when the issue was closed
                        //please reopen the issue and associate code, to reward the bounty
                        return;
                    }

                    //TODO remove the bounty backers?
                    //split the total bounty amount
                    contributors = _.uniq(contributors, false, function (contributor) {
                        return contributor.email;
                    });

                    var total = Payout.sum(bounties);
                    total -= Payout.fee(total);

                    var split = total / contributors.length;

                    //[{email: "perl.jonathan@gmail.com", amount: 50}, ..]
                    var payout = [];

                    //if the minimum is greater than the equal split
                    //split the minimum it among as many as possible (based on who committed first)
                    //TODO: think more on this?
                    var minimum = Payout.minimum();
                    if (split < minimum) {
                        var numberContributorsToPayout = Tools.truncate(total / minimum);
                        split = total / numberContributorsToPayout;
                        split = Tools.truncate(split, 2);
                        for (var i = 0; i < numberContributorsToPayout; i++) {
                            payout.push({email: contributors[i].email, amount: split});
                        }
                    } else {
                        split = Tools.truncate(split, 2);
                        for (var j = 0; j < contributors.length; j++) {
                            payout.push({email: contributors[j].email, amount: split});
                        }
                    }

                    console.log("System initiated payout", bountyIds, payout);
                    Bounty.initiatePayout(gitHubInstance, bounties, payout, "system", function () {
                        //TODO do something?
                    });
                });
            }
            //if the issue's status is reopened: cancel the payout
            else if (last.event === "reopened") {
                Bounty.cancelPayout(bounties, function () {
                    console.log("payout cancelled, issue reopened", bountyIds);
                });
            }
        }).run();
    });
};

/**
 * check every 10 seconds for bounty's who's status should be updated
 * note: limited at 300 updates/minute (6/minute * 50/time)
 * todo scalability: move this to separate process
 */
var updateBountyStatuses = function () {
    Meteor.setInterval(function () {
        var selector = Bounty.selectors.canBeManuallyRewarded();
        //status has not been updated within the past 10 minutes
        selector.$or = [
            { status: null },
            { "status.updated": null },
            { "status.updated": { $lte: Tools.addMinutes(-10) }}
        ];

        var bountiesToUpdate = Bounties.find(selector, {
            limit: 50
        }).fetch();

        //only update one bounty for each unique issue
        var uniqueIssueBounties = [];
        _.each(bountiesToUpdate, function (bounty) {
            var unique = !_.some(uniqueIssueBounties, function (uBounty) {
                return _.isEqual(uBounty.repo, bounty.repo) && _.isEqual(uBounty.issue, bounty.issue);
            });

            if (unique)
                uniqueIssueBounties.push(bounty);
        });

        //update the status by loading the issue events for the bounty
        //then watchStatusToInitiateOrCancelPayout (above) will auto-update the statuses
        uniqueIssueBounties.forEach(function (bounty) {
            //use the backer's key to check the issue status
            //TODO what happens if there are problems checking the status because the backer revoked access?
            var bountyBacker = Meteor.users.findOne(bounty.userId);
            var gitHub = new GitHub(bountyBacker);
            gitHub.getBountyIssueEvents(bounty);
        });
    }, 5000);
};

Meteor.startup(function () {
    watchStatusToInitiateOrCancelPayout();
    updateBountyStatuses();
});