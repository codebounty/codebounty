var path = Npm.require("path"),
    basepath = path.resolve(".") + "/packages/reward";

/**
 * Add the (not yet approved) funds to an existing reward or if one does not exist add it to a new reward
 * Then return the funding url to the callback
 * @param {Big} amount
 * @param {string} currency
 * @param {string} issueUrl
 * @param {User} user
 * @param {Function} callback (fundingUrl)
 */
RewardUtils.addFundsToIssue = function (amount, currency, issueUrl, user, callback) {
    //find an eligible reward to add to
    var selector = {
        currency: currency,
        userId: user._id
    };
    var gitHub = new GitHub(user);

    RewardUtils.eligibleForManualReward(selector, {}, issueUrl, gitHub, function (rewards, contributorsEmails) {
        //TODO try and consolidate them if there are rewards of the same currency
        var reward;

        //add to the existing reward
        if (rewards.length > 0) {
            reward = rewards[0];
            reward.addFund(amount, user, callback);

            Fiber(function () {
                Rewards.update(reward._id, reward.toJSONValue());
            }).run();

            return;
        }

        var options = {
            currency: currency,
            funds: [],
            issueUrl: issueUrl,
            receivers: [],
            status: "open",
            userId: user._id
        };

        reward = new Reward(options);
        reward.addFund(amount, user, callback);
        Fiber(function () {
            reward.updateReceivers(contributorsEmails);
            Rewards.insert(reward.toJSONValue());
        }).run();
    });
};

RewardUtils.cashLevel = function (amount, currency) {
    if (currency === "usd") {
        if (amount < 20)
            return 0;

        if (20 <= amount && amount < 50)
            return 1;

        if (50 <= amount && amount < 100)
            return 2;

        if (100 <= amount && amount < 250)
            return 3;

        return 4;
    }

    throw currency + " not implemented";
};

/**
 * Get asset file path
 * @param  {String} name Asset filename
 * @return {String}      File path
 */
RewardUtils.assetFile = function (name) {
    return path.join(basepath, "/assets/", name);
};

/**
 * @param {String} fontSize
 * @param {String} fontName
 * @param {String} [fontFace]
 * @return {String}
 */
RewardUtils.canvasFontString = function (fontSize, fontName, fontFace) {
    if (!fontSize || !fontName)
        throw "Missing argument.";

    return (fontFace ? fontFace + " " : "") + fontSize + " " + fontName;
};

/**
 * Make sure to update the diagram here https://codebounty.hackpad.com/Reward-yN7ydM3LIjy whenever you use this method
 * ----------------------------------------------
 * Find rewards that are open, reopened, or initiated by the system (not by a user)
 * @param [selector] If passed, use this selector as a base
 * @param [options] If passed, use these options for the Collection.find
 * @param [contributorsIssueUrl] If passed, only load rewards for this issueUrl and load the contributors
 * @param gitHub The gitHub api instance to use for loading the contributors commits
 * @param {function(Array.<Reward>, Array.<string>)} callback (rewards, contributorsEmails)
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
            var contributorsEmails = GitHubUtils.authorsEmails(commits, gitHub.user);
            Fiber(function () {
                //update the status and receivers since we are already loading the issueEvents & contributors
                _.each(rewards, function (reward) {
                    //must update the receivers first, because check status relies on them being up to date
                    reward.updateReceivers(contributorsEmails);
                    reward.lastSync = new Date();

                    Rewards.update({_id: reward._id}, reward.toJSONValue());

                    reward.checkStatus(issueEvents);
                });

                callback(rewards, contributorsEmails);
            }).run();
        });
    }
};
