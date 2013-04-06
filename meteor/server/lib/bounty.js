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
     * @param bounty to get the repo & issue to lookup contributors for
     * @param callback (authors) Ex. [{name: "Jonathan Perl", email: "perl.jonathan@gmail.com", date: '2013-03-17T00:27:42Z'}, ..]
     */
    my.Contributors = function (bounty, callback) {
        if (!bounty)
            CB.Error.Bounty.DoesNotExist();

        var gitHub = new CB.GitHub(Meteor.user());

        gitHub.GetContributorsCommits(bounty.repo, bounty.issue, function (error, result) {
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

                //TODO if there was an error, log it
                console.log("error", error);
            } else {
                update["reward.paid"] = new Date();

                console.log("Paid");
                console.log(receiverList);
            }

            Fiber(function () {
                Bounties.update(bounty._id, {$set: update});
            }).run();
        });
    };

    /**
     * Set the payout amounts when a backer rewards a bounty
     * post a comment on the issue with the payout amounts
     * and after one week if no one disputes, the bounty will automatically be paid out with this amount
     * @param bounties the bounties to payout
     * @param {Array.<{email, amount}>} payout [{email: "perl.jonathan@gmail.com", amount: 50}, ..] and their payouts
     * @param callback Called if there is no error
     * Ex. {"email": amount, "perl.jonathan@gmail.com": 51.50 }
     */
    my.InitiatePayout = function (bounties, payout, callback) {
        var totalUserPayout = 0;
        //remove any extra decimals on the user payouts
        _.each(payout, function (userPayout) {
            userPayout.amount = CB.Tools.Truncate(userPayout.amount, 2);
            totalUserPayout += userPayout.amount;
        });

        CB.Payout.CheckValidity(bounties, payout);

        //confirm the payout amount is only to users who have contributed
        //all the bounties on the issue will have the same contributors, so lookup the first bounty's contributors
        CB.Bounty.Contributors(bounties[0], function (contributors) {
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

            //TODO change 15 seconds back to 72 hours
            //var seventyTwoHours = new Date(now.setDate(now.getDate() + 7));
            var now = new Date();
            now.setSeconds(now.getSeconds() + 15);
            var seventyTwoHours = now;
            _.each(bounties, function (bounty) {
                var reward = {
                    updated: new Date(),
                    planned: seventyTwoHours,
                    payout: payout,
                    paid: null,
                    started: null,
                    hold: false
                };

                bounty.reward = reward;

                Fiber(function () {
                    Bounties.update(bounty._id, {$set: {reward: reward}});
                }).run();
            });

            //TODO write a comment on the issue planned contribution split
            callback();
        });
    };

    //check every 10 seconds for bounties that should be paid
    var processBountyPayments = function () {
        //todo when we scale: move this to separate process
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
                console.log("about to pay", bounty, bounty.reward);
                Bounties.update(bounty._id, {$set: {"reward.started": new Date()}});
                CB.Bounty.Pay(bounty);
            });
        }, 10000);
    };

    Meteor.startup(function () {
        processBountyPayments();
    });

    return my;
})();