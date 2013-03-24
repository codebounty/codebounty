//contains all bounty logic

var Bounty = (function () {
    var my = {};

    var url = NodeModules.require("url");

    /**
     * A bounty can be rewarded if the user has not yet rewarded the bounty
     * and at least one commit from a different user is referenced on the issue
     * @param bounty The bounty
     * @param callback (canReward) returns true if it is eligible, false if not
     */
    my.canReward = function (bounty, callback) {
        if (bounty.rewarded) {
            callback(false);
            return;
        }

        Bounty.contributors(bounty, function (contributors) {
            callback(contributors.length > 0);
        });
    };

    /**
     * all authors of code references on the issue excluding the user
     * @param bounty to get the repo & issue to lookup contributors for
     * @param callback (authors) Ex. [{name: "Jonathan Perl", email: "perl.jonathan@gmail.com", date: '2013-03-17T00:27:42Z'}, ..]
     */
    my.contributors = function (bounty, callback) {
        var gitHub = new GitHub(Meteor.user());

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
            rewarded: null
        };

        callback(null, bounty);
    };

    return my;
})();