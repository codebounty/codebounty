//contains all non-payment bounty functions / properties
CB.Bounty = (function () {
    var my = {};
    var url = NodeModules.require("url");

    //the # days bounties expire after
    my.ExpiresAfterDays = 90;

    /**
     * if the bounty created date is older (<) this date, it is expired
     * @returns {Date} the first date where bounties are expired
     */
    my.ExpiredDate = function () {
        var now = new Date();
        var expiredDate = now.setDate(now.getDate() - my.ExpiresAfterDays);
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

        var parsedUrl = url.parse(bountyUrl, true);
        var path = parsedUrl.pathname;

        if (parsedUrl.hostname !== "github.com" || path.indexOf("/issues") < 0) {
            callback("Only accepting bounties for github issues currently");
            return;
        }

        var paths = path.split("/");

        //parse repository and issue
        var repo = {user: paths[1], name: paths[2]};
        var issue = parseFloat(paths[4]);

        //TODO check repo exists with GitHub

        var bounty = {
            created: new Date(),
            type: "github",
            amount: amount,
            url: bountyUrl,
            issue: issue,
            repo: repo,
            desc: "$" + amount + " bounty for Issue #" + issue + " in " + repo.name,
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
    my.Create = function (userId, amount, bountyUrl, callback) {
        parse(amount, bountyUrl, function (error, bounty) {
            if (error)
                CB.Error.Bounty.Parsing();

            //store the bounty
            bounty.userId = userId;

            var id = Bounties.insert(bounty);

            var cancel = Meteor.settings["ROOT_URL"] + "cancelCreateBounty?id=" + id;
            var confirm = Meteor.settings["ROOT_URL"] + "confirmBounty?id=" + id;

            //Start pre-approval process
            CB.PayPal.GetApproval(bounty.amount, bounty.desc, cancel, confirm, function (error, data, approvalUrl) {
                if (error) {
                    Bounties.remove({_id: id});
                    CB.Error.PayPal.PreApproval();
                }

                Fiber(function () {
                    Bounties.update({_id: id}, {$set: {preapprovalKey: data.preapprovalKey}})
                }).run();

                callback(approvalUrl);
            });
        });
    };

    /**
     * all authors of code references on the bounty issue excluding the user
     * @param [gitHubInstance] If not passed, will create one with the current user
     * @param bounty to get the repo & issue to lookup contributors for
     * @param callback (authors) Ex. [{name: "Jonathan Perl", email: "perl.jonathan@gmail.com", date: '2013-03-17T00:27:42Z'}, ..]
     */
    my.Contributors = function (gitHubInstance, bounty, callback) {
        if (!bounty)
            CB.Error.Bounty.DoesNotExist();

        var gitHub = gitHubInstance || new CB.GitHub(Meteor.user());
        gitHub.GetContributorsCommits(bounty, function (error, result) {
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
    my.Selectors = {
        /**
         * the bounty is: approved, not expired, not yet been paid,
         * the backer has not already rewarded the bounty
         * @param [backerId] If passed, only return bounties from this backer id
         */
        CanBeManuallyRewarded: function (backerId) {
            var selector = {
                approved: true,
                created: {"$gt": CB.Bounty.ExpiredDate()},
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

    return my;
})();