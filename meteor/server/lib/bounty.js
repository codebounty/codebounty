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
    my.canReward = function (bounty, callback) {
        if (bounty.reward) {
            callback(false);
            return;
        }

        CB.Bounty.contributors(bounty, function (contributors) {
            callback(contributors.length > 0);
        });
    };

    /**
     * all authors of code references on the issue excluding the user
     * @param bounty to get the repo & issue to lookup contributors for
     * @param callback (authors) Ex. [{name: "Jonathan Perl", email: "perl.jonathan@gmail.com", date: '2013-03-17T00:27:42Z'}, ..]
     */
    my.contributors = function (bounty, callback) {
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
    my.pay = function (id) {
        var bounty = Bounties.findOne({_id: id});

        console.log("PAID ");
        console.log(bounty);
    };

    /**
     * Schedules payments to be made on reward planned date
     * @param bounty
     */
    my.schedulePayment = function (bounty) {
        CB.Schedule.on(bounty.reward.planned, function () {
            CB.Bounty.pay(bounty._id);
        });
    };

    /**
     * used by the scheduler whenever the server restarts to re-schedule payments
     * for bounties that are planned to be rewarded, that have not been paid, and are not on hold
     */
    my.reschedulePayments = function () {
        var bounties = Bounties.find({"reward.planned": {$ne: null}, "reward.paid": null, "reward.hold": false}).fetch();
        console.log("bounties schedules reloaded " + bounties.length);

        _.each(bounties, function (bounty) {
            CB.Bounty.schedulePayment(bounty);
        });
    };

    //parses bounty data from the url
    //callback passes an error or the bounty data
    my.parse = function (amount, bountyUrl, callback) {
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

    return my;
})();