var rootUrl = Meteor.settings["ROOT_URL"];

/**
 * Add the bounty to an existing reward or if one does not exist add it to a new reward.
 * Distribute the reward equally among all the contributors.
 * This is used after a bounty has been approved
 * @param bounty
 */
RewardUtils.addBounty = function (bounty) {
    //find an eligible reward to add to
    var currency = bounty.currency;
    var selector = {
        currency: currency,
        userId: bounty.userId
    };

    var user = Meteor.users.findOne({_id: bounty.userId});
    var gitHub = new GitHub(user);

    RewardUtils.eligibleForManualReward(selector, {}, bounty.issueUrl, gitHub, function (rewards, contributors) {
        //TODO try and consolidate them if there are rewards of the same currency
        var reward;

        //add to the existing reward
        if (rewards.length > 0) {
            reward = rewards[0];
            reward.addBounty(bounty);

            Fiber(function () {
                Rewards.update({_id: reward._id}, reward.toJSONValue());
                Bounties.update({_id: bounty._id}, {reward: reward._id});
            }).run();

            return;
        }

        var options = {
            bountyIds: [bounty._id],
            bountyAmounts: [new Big(bounty.amount)],
            currency: currency,
            issueUrl: bounty.issueUrl,
            receivers: [],
            status: "open",
            userId: bounty.userId
        };

        reward = new Reward(options);
        reward.updateReceivers(contributors);
        reward.distributeEqually();

        Fiber(function () {
            var rewardId = Rewards.insert(reward.toJSONValue());
            Bounties.update({_id: bounty._id}, {reward: rewardId});

            //post the reward comment using codebounty charlie
            var imageUrl = rootUrl + "reward/" + rewardId;
            var commentBody = "[![Code Bounty](" + imageUrl + ")](" + rootUrl + ")";

            //post as charlie
            var gitHub = new GitHub();
            gitHub.postComment(bounty.issueUrl, commentBody);
        }).run();
    });
};

/**
 * Make sure to update the diagram here https://codebounty.hackpad.com/Reward-yN7ydM3LIjy whenever you use this method
 * ----------------------------------------------
 * Find rewards that are open, reopened, or initiated by the system (not by a user)
 * - TODO not expired (created: {"$gt": BountyUtils.expiredDate()}
 * @param [selector] If passed, use this selector as a base
 * @param [options] If passed, use these options for the Collection.find
 * @param [contributorsIssueUrl] If passed, only load rewards for this issueUrl and load the contributors
 * @param gitHub The gitHub api instance to use for loading the contributors commits
 * @param {function(Array.<Reward>, Array.<{name, email, date}>)} callback (rewards, contributors)
 */
RewardUtils.eligibleForManualReward = function (selector, options, contributorsIssueUrl, gitHub, callback) {
    selector = selector || {};
    selector.$or = [
        { status: { $in: [ "open", "reopened" ] }},
        { $and: [
            { status: "initiated" },
            { "payout.by": "system" }
        ]}
    ];

    if (contributorsIssueUrl)
        selector.issueUrl = contributorsIssueUrl;

    options = options || {};

    var rewards = Rewards.find(selector, options).fetch();

    //if the contributorsIssueUrl was not passed just return the rewards
    if (!contributorsIssueUrl) {
        callback(rewards);
    }
    //if the contributorsIssueUrl was passed, also load the contributors / issue events
    else {
        gitHub.getContributorsCommits(contributorsIssueUrl, function (error, issueEvents, commits) {
            var contributors = _.map(commits, function (commit) {
                return commit.author;
            });
            contributors = _.uniq(contributors, false, function (contributor) {
                return contributor.email;
            });

            Fiber(function () {
                //update the status and receivers since we are already loading the issueEvents & contributors
                _.each(rewards, function (reward) {
                    //must update the receivers first, because check status relies on them being up to date
                    reward.updateReceivers(contributors);
                    reward.lastSync = new Date();

                    Rewards.update({_id: reward._id}, reward.toJSONValue());

                    reward.checkStatus(issueEvents);
                 });

                callback(rewards, contributors);
            }).run();
        });
    }
};