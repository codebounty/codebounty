//contains all bounty logic

CB.Bounty = (function () {
    var my = {};

    var url = NodeModules.require("url");

    /**
     * A bounty can be rewarded if the user has not yet rewarded the bounty
     * and at least one commit from a different user is referenced on the issue
     * @param bounty The bounty
     * @param callback (canReward) returns true if it is eligible, false if not
     */
    my.CanReward = function (bounty, callback) {
        if (!bounty)
            CB.Error.Bounty.DoesNotExist();

        if (bounty.reward) {
            callback(false);
            return;
        }

        CB.Bounty.Contributors(bounty, function (contributors) {
            callback(contributors.length > 0);
        });
    };


    //parses bounty data from the url
    //callback passes an error or the bounty data
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
     * all authors of code references on the issue excluding the user
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
     * @param id to retrieve the bounty so the data is up-to-date
     */
    my.Pay = function (id) {
        //for testing
//        var bounty = id;

        var bounty = Bounties.findOne({_id: id});

        var receiverList = _.map(bounty.reward.payout, function (payout) {
            var receiver = {email: payout.email, amount: bounty.amount * (payout.rate / 100)};

            return receiver;
        });

        receiverList = {"receiver": receiverList};

        CB.PayPal.Pay(bounty.preapprovalKey, receiverList, function (error, data) {
            console.log("error");
            console.log(error);
            console.log("data");
            console.log(data);
        });

        //TODO if there was an error, log it

        console.log("PAID ");
    };

    /**
     * Set the payout rates when a backer rewards a bounty
     * post a comment on the issue with the payout rate
     * and after one week if no one disputes, the bounty will automatically be paid out with this rate
     * @param bounties the bounties to payout
     * @param {Array.<{email, rate}>} payout [{email: "perl.jonathan@gmail.com", rate: 50}, ..] and their payouts
     * Ex. {"email": percentageHere, "perl.jonathan@gmail.com": 50 }
     */
    my.InitiatePayout = function (bounties, payout) {
        //check the bounty payout totals to 100%
        var totalPayout = _.reduce(_.pluck(payout, "rate"), function (memo, num) {
            return memo + num;
        }, 0);

        if (totalPayout !== 100)
            CB.Error.Bounty.Reward.NotOneHundredPercent();


        //TODO make sure each user gets paid > $0.30 so they can pay the fee (including us). maybe set that minimum higher
        //TODO pay us and do all teh payment calculations

        //confirm the payout rate is only to users who have contributed
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
            //distribute the percentages across each bounty
            //schedule the payment with cron

            var now = new Date();
//            var oneWeek = new Date(now.setDate(now.getDate() + 7));
            now.setSeconds(now.getSeconds() + 15);
            var oneWeek = now;
            _.each(bounties, function (bounty) {
                var reward = {
                    updated: new Date(),
                    planned: oneWeek,
                    payout: payout,
                    paid: null,
                    hold: false
                };

                bounty.reward = reward;

                //for testing
//                CB.Bounty.Pay(bounty);

                Fiber(function () {
                    Bounties.update(bounty._id, {$set: {reward: reward}});
                }).run();
                CB.Bounty.SchedulePayment(bounty);
            });

            //TODO write a comment on the issue "paid out"
        });
    };


    /**
     * Schedules payments to be made on reward planned date
     * @param bounty
     */
    my.SchedulePayment = function (bounty) {
        CB.Schedule.On(bounty.reward.planned, function () {
            CB.Bounty.Pay(bounty._id);
        });
    };

    /**
     * used by the scheduler whenever the server restarts to re-schedule payments
     * for bounties that are planned to be rewarded, that have not been paid, and are not on hold
     */
    my.ReschedulePayments = function () {
        var bounties = Bounties.find({"reward.planned": {$ne: null}, "reward.paid": null, "reward.hold": false}).fetch();
        console.log("bounties schedules reloaded " + bounties.length);

        _.each(bounties, function (bounty) {
            CB.Bounty.SchedulePayment(bounty);
        });
    };

    return my;
})();