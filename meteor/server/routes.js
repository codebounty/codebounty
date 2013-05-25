//the generated bounty image route
Meteor.Router.add("/reward/:id", function (id) {
    var reward = Rewards.findOne(id);

    //todo better error image
    if (!reward)
        return "No reward found";

    var status = reward.status;
    if (_.contains(["initiated", "expired", "paying", "hold"], status))
        status = "closed";
    else if (status === "paid")
        status = "claimed";

    var rewardAmount = parseFloat(reward.total(true).toString());

    var claimedBy = _.map(reward.getReceivers(), function (receiver) {
        return {userName: receiver.email, amount: parseFloat(receiver.getReward().toString())};
    });

    var user = Meteor.users.findOne(reward.userId);

    var rewardDetails = {
        status: status,
        amount: rewardAmount,
        currency: reward.currency,
        expiredDate: reward.expires(),
        userName: GitHubUtils.username(user),
        claimedBy: claimedBy
    };

    var canvas = RewardUtils.statusComment(rewardDetails);

    var response = this.response;
    response.writeHead(200, {"Content-Type": "image/png" });
    response.write(canvas.toBuffer());
    response.end();
});

//the generated repo badge route
Meteor.Router.add("/badge/:user/:repo", function (user, repo) {
    var repoUrl = GitHubUtils.repoUrl(user, repo);

    var openRewards = Rewards.find({
        issueUrl: new RegExp("^" + repoUrl, "i"), //regex is starts with
        status: { $in: ["open", "reopened"] }
    }).count();

    var repoStatus = {
        open: openRewards
    };
    var canvas = RewardUtils.repoBadge(repoStatus);

    var response = this.response;
    response.writeHead(200, {"Content-Type": "image/png" });
    response.write(canvas.toBuffer());
    response.end();
});

//the paypal IPN callback
//https://www.x.com/developers/paypal/documentation-tools/ipn/integration-guide/IPNIntro
//http://jsfiddle.net/zkcb6/1/
Meteor.Router.add("/ipn", function () {
    PayPal.verify(this.request, this.response, function (error, params) {
        if (error)
            throw error;

        Fiber(function () {
            var reward = Rewards.findOne({
                funds: { $elemMatch: { preapprovalKey: params.preapproval_key }}
            });

            if (!reward) {
                error = "PayPalFund approved but not found " + EJSON.stringify(params);
                throw error;
            }

            var paypalFund = _.find(reward.funds, function (fund) {
                return fund.preapprovalKey === params.preapproval_key;
            });
            paypalFund.confirm(reward, params);
        }).run();
    });

    //prevents paypal from continually sending message
    //from http://stackoverflow.com/a/15847900/230462
    return [200];
});