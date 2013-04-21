//contains all bounty logic
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
     * Pay a bounty
     * @param bounty
     */
    my.Pay = function (bounty) {
        var receiverList = _.map(bounty.reward.payout, function (payout) {
            var receiver = {email: payout.email, amount: payout.amount};
            return receiver;
        });

        CB.PayPal.Pay(bounty.preapprovalKey, receiverList, function (error, data) {
            var update = {};

            if (error) {
                update["reward.error"] = error;

                console.log("ERROR: PayPal Payment", error);
            } else {
                update["reward.paid"] = new Date();

                console.log("Paid", bounty);
            }

            Fiber(function () {
                Bounties.update(bounty._id, {$set: update});
            }).run();
        });
    };

    /**
     * Set the payout amounts when a backer rewards a bounty
     * post a comment on the issue with the payout amounts
     * and after 72 hours if no one disputes, the bounty will automatically be paid out with this amount
     * @param [gitHubInstance] If not passed, will create one with the current user
     * @param bounties the bounties to payout
     * @param {Array.<{email, amount}>} payout [{email: "perl.jonathan@gmail.com", amount: 50}, ..] and their payouts
     * @param by Who the reward was initiated by (the backer userId, "system", future: "moderator")
     * @param callback Called if there is no error
     * Ex. {"email": amount, "perl.jonathan@gmail.com": 51.50 }
     */
    my.InitiatePayout = function (gitHubInstance, bounties, payout, by, callback) {
        var totalUserPayout = 0;
        //remove any extra decimals on the user payouts
        _.each(payout, function (userPayout) {
            userPayout.amount = CB.Tools.Truncate(userPayout.amount, 2);
            totalUserPayout += userPayout.amount;
        });

        CB.Payout.CheckValidity(bounties, payout);

        //confirm the payout amount is only to users who have contributed
        //all the bounties on the issue will have the same contributors, so lookup the first bounty's contributors
        CB.Bounty.Contributors(gitHubInstance, bounties[0], function (contributors) {
            var assignedPayouts = _.pluck(payout, "email");

            //make sure every user that has contributed code has been assigned a bounty (even if it is 0)
            var allAssignedPayouts = _.every(contributors, function (contributor) {
                var assignedPayout = _.some(assignedPayouts, function (payoutEmail) {
                    return contributor.email === payoutEmail;
                });

                return assignedPayout;
            });

            //and no one else has been assigned a bounty
            if (!(allAssignedPayouts && contributors.length === assignedPayouts.length))
                CB.Error.Bounty.Reward.NotEligible();

            //everything is a-okay

            //pay codebounty it's fee
            var bountyAmount = CB.Payout.Sum(bounties);
            var fee = CB.Payout.Fee(bountyAmount, totalUserPayout);
            var codeBountyPayout = {email: Meteor.settings["PAYPAL_PAYMENTS_EMAIL"], amount: fee};
            payout.push(codeBountyPayout);

            var seventyTwoHours = CB.Tools.AddMinutes(60 * 72);
//            var seventyTwoHours = CB.Tools.AddMinutes(1);

            var bountyIds = _.pluck(bounties, "_id").join(",");

            console.log("Initiating payout for", bountyIds, "total", payout);

            var payoutDistribution = CB.Payout.Distribute(bounties, payout);
            var payoutIndex = 0;

            //payout group id (for the aggregated comment)
            var groupId = new Meteor.Collection.ObjectID();

            //used for grouping
            _.each(bounties, function (bounty) {
                var payout = payoutDistribution[payoutIndex];

                var reward = {
                    by: by,
                    updated: new Date(),
                    planned: seventyTwoHours,
                    payout: payout,
                    group: groupId,
                    paid: null,
                    started: null,
                    hold: false
                };

                bounty.reward = reward;

                console.log("split for", bounty._id, "is", payout);

                //after the reward is planned it will automatically be scheduled for payout in processBountyPayments
                Fiber(function () {
                    Bounties.update(bounty._id, {$set: {reward: reward}});
                }).run();

                payoutIndex++;
            });

            //TODO comment on the issue w planned contribution split
            callback();
        });
    };

    /**
     * Cancel a payout because an issue got reopened before the hold period was over
     */
    my.CancelPayout = function (bounties, callback) {
        _.each(bounties, function (bounty) {
            Bounties.update(bounty._id, {$set: {reward: null}});
        });

        if (callback)
            callback();
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

    /**
     * check every 10 seconds for bounties that should be paid
     * note: limited at 60 payments/minute (6/minute * 10/time)
     * todo scalability: move this to separate process
     */
    var processBountyPayments = function () {
        Meteor.setInterval(function () {
            //all bounties ready to be paid out
            var bountiesToPay = Bounties.find({
                "reward.paid": null,
                "reward.hold": false,
                "reward.planned": {$lte: new Date()},
                "reward.started": null
            }, {
                limit: 10
            }).fetch();

            bountiesToPay.forEach(function (bounty) {
                Bounties.update(bounty._id, {$set: {"reward.started": new Date()}});
                CB.Bounty.Pay(bounty);
            });
        }, 10000);
    };

    //check if the status changed on any related bounties (whenever GitHub.GetIssueEvents is called)
    //only check bounties that have not been paid, and have not been rewarded by the user
    //then if the status changed to
    // - closed: initiate the payout
    // - reopened: cancel the payout (this will only happen during the hold period)
    var watchStatusToInitiateOrCancelPayout = function () {
        CB.GitHub.onGetIssueEvents(function (gitHubInstance, bounty, error, result) {
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
                var selector = CB.Bounty.Selectors.CanBeManuallyRewarded();
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

                    CB.Bounty.Contributors(gitHubInstance, bounties[0], function (contributors) {
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

                        var total = CB.Payout.Sum(bounties);
                        total -= CB.Payout.Fee(total);

                        var split = total / contributors.length;

                        //[{email: "perl.jonathan@gmail.com", amount: 50}, ..]
                        var payout = [];

                        //if the minimum is greater than the equal split
                        //split the minimum it among as many as possible (based on who committed first)
                        //TODO: think more on this?
                        var minimum = CB.Payout.Minimum();
                        if (split < minimum) {
                            var numberContributorsToPayout = CB.Tools.Truncate(total / minimum);
                            split = total / numberContributorsToPayout;
                            split = CB.Tools.Truncate(split, 2);
                            for (var i = 0; i < numberContributorsToPayout; i++) {
                                payout.push({email: contributors[i].email, amount: split});
                            }
                        } else {
                            split = CB.Tools.Truncate(split, 2);
                            for (var j = 0; j < contributors.length; j++) {
                                payout.push({email: contributors[j].email, amount: split});
                            }
                        }

                        console.log("System initiated payout", bountyIds, payout);
                        CB.Bounty.InitiatePayout(gitHubInstance, bounties, payout, "system", function () {
                            //TODO do something?
                        });
                    });
                }
                //if the issue's status is reopened: cancel the payout
                else if (last.event === "reopened") {
                    CB.Bounty.CancelPayout(bounties, function () {
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
            var selector = CB.Bounty.Selectors.CanBeManuallyRewarded();
            //status has not been updated within the past 10 minutes
            selector.$or = [
                { status: null },
                { "status.updated": null },
                { "status.updated": { $lte: CB.Tools.AddMinutes(-10) }}
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
                var gitHub = new CB.GitHub(bountyBacker);
                gitHub.GetIssueEvents(bounty);
            });
        }, 5000);
    };

    Meteor.startup(function () {
        processBountyPayments();

        watchStatusToInitiateOrCancelPayout();
        updateBountyStatuses();
    });

    return my;
})();