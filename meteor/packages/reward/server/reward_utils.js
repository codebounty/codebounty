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
    var gitHub = new GitHub({
        user: user,
        onError: GitHubUtils.Local.Logging.onError,
        onSuccess: GitHubUtils.Local.Logging.onSuccess
    });

    RewardUtils.eligibleForManualReward(selector, {}, issueUrl, false, gitHub, function (rewards, commits) {
        var reward;

        //add to the existing reward
        //TODO try and consolidate them if there are rewards of the same currency
        if (rewards.length > 0) {
            reward = rewards[0];

            reward.addFund(amount, user, function (fundingUrl) {
                reward.saveFunds(function () {
                    callback(fundingUrl);
                });
            });
        }
        //create a new reward
        else {
            var options = {
                currency: currency,
                funds: [],
                issueUrl: issueUrl,
                log: [],
                receivers: [],
                status: "open",
                userId: user._id
            };

            reward = new Reward(options);
            reward.updateReceivers(commits);

            reward.addFund(amount, user, function (fundingUrl) {
                Fiber(function () {
                    //insert the whole new reward (including the newly added fund)
                    Rewards.insert(reward.toJSONValue());
                    callback(fundingUrl);
                }).run();
            });
        }
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

    if (currency === "btc") {
        if (amount < 0.04)
            return 0;

        if (amount <= 0.15 && amount < 0.4)
            return 1;

        if (0.4 <= amount && amount < 0.8)
            return 2;

        if (0.8 <= amount && amount < 2)
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
    return Tools.publicFolder + "/assets/" + name;
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
 * @param selector If passed, use this selector as a base
 * @param options If passed, use these options for the Collection.find
 * @param contributorsIssueUrl If passed, only load rewards for this issueUrl and load the contributors
 * @param includeHeld If true, include the held rewards (ex. the admin is manually rewarding)
 * @param gitHub The gitHub api instance to use for loading the contributors commits
 * @param {function(Array.<Reward>, Array.<string>=)} callback (rewards, commits)
 */
RewardUtils.eligibleForManualReward = function (selector, options, contributorsIssueUrl, includeHeld, gitHub, callback) {
    selector = selector || {};
    selector.$or = [
        { status: { $in: [ "open", "reopened" ] }},
        { $and: [
            { status: "initiated" },
            { "payout.by": "system" }
        ]}
    ];

    if (includeHeld)
        selector.$or[0].status.$in.push("held");

    if (contributorsIssueUrl)
        selector.issueUrl = contributorsIssueUrl;

    options = options || {};

    var rewards = Rewards.find(selector, options).fetch();

    //if the contributorsIssueUrl was not passed just return the rewards
    if (!contributorsIssueUrl) {
        callback(rewards);
        return;
    }

    //if the contributorsIssueUrl was passed, also load the contributors / issue events
    gitHub.getContributorsCommits(contributorsIssueUrl, function (error, issueEvents, commits) {
            Fiber(function () {
                //update the status and receivers since we are already loading the issueEvents & contributors
                _.each(rewards, function (reward) {
                    //must update the receivers before doing checkStatus
                    //because it relies on them being up to date
                    reward.updateReceivers(commits);

                    var jsonReceivers = _.map(reward.receivers, function (receiver) {
                        return receiver.toJSONValue();
                    });
                    Rewards.update(reward._id, {
                        $set: {
                            receivers: jsonReceivers,
                            lastSync: new Date()
                        }
                    });

                    reward.checkStatus(issueEvents);
                });

                callback(rewards, commits);
            }).run();
        },
        //force load issue events so we know if the
        //issue closed for checkStatus in the callback
        true);
};
