var fs = Npm.require("fs");

//the generated bounty image route
Meteor.Router.add("/reward/:id", function (id) {
    var reward = Rewards.findOne(id);

    //todo better error image
    if (!reward)
        return "No reward found";

    var status = reward.status;
    if (_.contains(["initiated", "expired", "paying", "held", "refunded"], status))
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
        userName: AuthUtils.username(user),
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

        if (params.transaction_type === "Adaptive Payment PREAPPROVAL") {
            if (params.status === "ACTIVE") {
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
            } else if (params.status === "CANCELED") {
                //TODO unless refund, shame status

            }
        }
    });

    //prevents paypal from continually sending message
    //from http://stackoverflow.com/a/15847900/230462
    return [200];
});

// The Blockchain.info IPN callback.
// http://blockchain.info/api/api_receive
Meteor.Router.add("/bitcoin-ipn", function () {
    var fut = new Future();
    
    Bitcoin.verify(this.request, this.response, function (error, params) {
        if (error)
            throw error;
            
        if (params.confirmations >= Bitcoin.Settings.minimumConfirmations) {
            Fiber(function () {
                var reward = Rewards.findOne({
                    funds: { $elemMatch:
                        { address: params.destination_address,
                          proxyAddress: params.input_address
                        }
                    }
                });
                
                if (!reward) {
                    error = "BitcoinFund approved but not found " + EJSON.stringify(params);
                    throw error;
                }

                var bitcoinFund = _.find(reward.funds, function (fund) {
                    return fund.proxyAddress === params.input_address;
                });
                bitcoinFund.confirm(reward, params);
            }).run();
            
            // To prevent Blockchain.info from continually resending the transaction.
            fut.ret([200, "*ok*"]);
        } else {
            // No *ok* token means Blockchain.info will resend this notification
            // every time more confirmations are added to the transactions.
            fut.ret([200]);
        }
    });
    
    return fut.wait();
});
