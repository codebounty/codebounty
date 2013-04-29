//todo bitcoin this file contains bitcoin todos
//contains all non-payment bounty functions / properties

//the # days bounties expire after
Bounty.expiresAfterDays = 90;

/**
 * if the bounty created date is older (<) this date, it is expired
 * @returns {Date} the first date where bounties are expired
 */
Bounty.expiredDate = function () {
    var now = new Date();
    var expiredDate = now.setDate(now.getDate() - Bounty.expiresAfterDays);
    expiredDate = new Date(expiredDate);
    return expiredDate;
};

//parses bounty data from the url, and creates a bounty
//callback passes an error or the bounty
var parse = function (amount, bountyUrl, callback) {
    if ((!_.isNumber(amount)) || _.isNaN(amount)) {
        callback("Need to specify an amount");
        return;
    }

    var repoIssue;
    try {
        repoIssue = GitHubUtils.parseUrl(bountyUrl);
    } catch (error) {
        callback(error);
    }

    var bounty = {
        created: new Date(),
        type: "github",
        amount: amount,
        url: bountyUrl,
        issue: repoIssue.issue,
        repo: repoIssue.repo,
        desc: "$" + amount + " bounty for Issue #" + repoIssue.issue + " in " + repoIssue.repo.name,
        reward: null
    };

    callback(null, bounty);
};

/**
 * create a bounty
 * @param userId User to create the bounty for
 * @param amount
 * @param bountyUrl The url of the bounty issue
 * @param callback returns the paypal authorization url
 */
Bounty.create = function (userId, amount, bountyUrl, callback) {
    parse(amount, bountyUrl, function (error, bounty) {
        if (error)
            Bounty.errors.parsing();

        bounty.userId = userId;

        bounty._id = Bounties.insert(bounty);

        //todo bitcoin check type and choose bitcoin.create here if the bounty type is bitcoin
        Bounty.PayPal.create(bounty, callback);
    });
};

/**
 * all authors of code references on the bounty issue excluding the user
 * @param [gitHubInstance] If not passed, will create one with the current user
 * @param bounty to get the repo & issue to lookup contributors for
 * @param callback (authors) Ex. [{name: "Jonathan Perl", email: "perl.jonathan@gmail.com", date: '2013-03-17T00:27:42Z'}, ..]
 */
Bounty.contributors = function (gitHubInstance, bounty, callback) {
    if (!bounty)
        Bounty.errors.doesNotExist();

    var gitHub = gitHubInstance || new GitHub(Meteor.user());
    gitHub.getContributorsCommits(bounty, function (error, result) {
        if (error)
            throw error;

        if (result) {
            var authors = _.map(result, function (commit) {
                return commit.author;
            });

            callback(authors);
        }
    });
};

/**
 * Various selectors to use for collection querying
 */
Bounty.selectors = {
    /**
     * the bounty is: approved, not expired, not yet been paid,
     * the backer has not already rewarded the bounty
     * @param [backerId] If passed, only return bounties from this backer id
     */
    canBeManuallyRewarded: function (backerId) {
        var selector = {
            approved: true,
            created: {"$gt": Bounty.expiredDate()},
            $and: [
                {$or: [
                    { reward: null },
                    { "reward.paid": null }
                ]},
                {$or: [
                    {reward: null},
                    {"reward.by": "system" }
                ]}
            ]
        };

        if (backerId)
            selector.userId = backerId;

        return selector;
    }
};