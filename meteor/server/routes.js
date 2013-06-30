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

    var imagePath = "rewards/" + id + ".png";

    //find if there is already a matching image
    var url = ImageCacheTools.get(imagePath, rewardDetails);
    if (url)
        return [302, { "Location": url }, null];

    //generate and cache this image, and delete the old one
    var canvas = RewardUtils.statusComment(rewardDetails);
    var imageBuffer = canvas.toBuffer();

    ImageCacheTools.set(imagePath, imageBuffer, rewardDetails, true);

    var response = this.response;
    response.writeHead(200, {"Content-Type": "image/png" });
    response.write(imageBuffer);
    response.end();
});

//the generated repo badge route
Meteor.Router.add("/badge/:user/:repo", function (user, repo) {
    var repoUrl = GitHubUtils.repoUrl(user, repo);

    var openRewards = Rewards.find({
        issueUrl: new RegExp("^" + repoUrl, "i"), //regex is starts with
        status: { $in: ["open", "reopened"] }
    }).count();

    var badgeDetails = {
        open: openRewards
    };

    var imagePath = "badges/" + openRewards + ".png";
    //find if there is already a matching image
    var url = ImageCacheTools.get(imagePath, badgeDetails);
    if (url)
        return [302, { "Location": url }, null];

    var canvas = RewardUtils.repoBadge(badgeDetails);
    var imageBuffer = canvas.toBuffer();

    ImageCacheTools.set(imagePath, imageBuffer, badgeDetails, true);

    var response = this.response;
    response.writeHead(200, {"Content-Type": "image/png" });
    response.write(imageBuffer);
    response.end();
});

//the paypal IPN callback
//https://www.x.com/developers/paypal/documentation-tools/ipn/integration-guide/IPNIntro
Meteor.Router.add("/ipn", function () {
    PayPal.verify(this.request, this.response, function (error, params) {
        if (error)
            return;

        if (params.transaction_type === "Adaptive Payment PREAPPROVAL") {
            if (params.status === "ACTIVE") {
                Fiber(function () {
                    var reward = Rewards.findOne({
                        funds: { $elemMatch: { preapprovalKey: params.preapproval_key }}
                    });

                    if (!reward) {
                        TL.error("PayPalFund approved but not found " + EJSON.stringify(params), Modules.Paypal);
                        return;
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

// The Blockchain.info IPN callback - http://blockchain.info/api/api_receive
// test with http://jsfiddle.net/jperl/KzAjx/
Meteor.Router.add("/bitcoin-ipn", function () {
    var fut = new Future();

    Bitcoin.verify(this.request, this.response, function (error, params) {
        if (error)
            return;

        Bitcoin.getTransaction(params.transaction_hash, function (error, transaction) {

            // Exit the function if the transaction specified isn't in our wallet,
            // or if the transaction hasn't received enough confirmations.
            if (params.confirmations < Bitcoin.Settings.minimumConfirmations
                || !transaction || transaction.confirmations < Bitcoin.Settings.minimumConfirmations) {
                // No *ok* token means Blockchain.info will resend this notification
                // every time more confirmations are added to the transactions.
                fut.ret([200]);
                return;
            }

            Fiber(function () {
                //check if this has already been recorded
                var existing = Rewards.findOne({
                    funds: {
                        $elemMatch: {
                            transactionHash: params.transaction_hash
                        }
                    }
                });
                //this transactionHash was already recorded so we have a problem
                if (existing)
                    throw "BitcoinFund approval already recorded " + EJSON.stringify(params);

                //find an open reward with a matching address
                var proxyAddress = params.input_address;
                var reward = Rewards.findOne({
                    $or: [
                        { status: { $in: [ "open", "reopened" ] }},
                        { $and: [
                            { status: "initiated" },
                            { "payout.by": "system" }
                        ]}
                    ],
                    funds: {
                        $elemMatch: {
                            proxyAddress: proxyAddress
                        }
                    }
                });
                if (!reward)
                    throw "No eligible reward found " + EJSON.stringify(params); //should we just insert a new reward if one does not exist?

                //get the bitcoin fund if there is not a transaction hash (probably the first fund)
                var bitcoinFund = _.find(reward.funds, function (fund) {
                    return !fund.transactionHash && fund.proxyAddress === proxyAddress;
                });

                // If the reward amount is less than the minimum required
                // amount, send the user an alert.
                var totalReward = BigUtils.sum(reward.availableFundAmounts());

                if (totalReward < Bitcoin.Settings.minimumFundAmount) {
                    Email.send({
                        to: AuthUtils.email(
                            Meteor.users.find({_id: reward.userId})),
                        from: Meteor.settings["ALERTS_EMAIL"],
                        subject: Bitcoin.Emails.insufficient_funds.subject,
                        text: Bitcoin.Emails.insufficient_funds.text
                    });
                }

                var destinationAddress = params.destination_address;
                var insertNewFund = false;

                // add a new fund for this transaction if one doesn't exist already.
                if (!bitcoinFund) {
                    var expires = Tools.addDays(FundUtils.expiresAfterDays);
                    bitcoinFund = new BitcoinFund({
                        address: destinationAddress,
                        amount: new Big(0), //the amount will be set in the confirm method below
                        expires: expires,
                        proxyAddress: proxyAddress,
                        userId: reward.userId
                    });
                    reward.funds.push(bitcoinFund);
                    insertNewFund = true;
                }

                bitcoinFund.confirm(reward, params, insertNewFund);

                // If the reward amount is less than the minimum required
                // amount, send the user an alert.
                var totalReward = BigUtils.sum(reward.availableFundAmounts());

                if (totalReward < Bitcoin.Settings.minimumFundAmount) {
                    Email.send({
                        to: AuthUtils.email(
                            Meteor.users.find({_id: reward.userId})),
                        from: Meteor.settings["ALERTS_EMAIL"],
                        subject: Bitcoin.Emails.insufficient_funds.subject,
                        text: Bitcoin.Emails.insufficient_funds.text
                    });
                }
            }).run();

            // To prevent Blockchain.info from continually resending the transaction.
            fut.ret([200, "*ok*"]);
        });
    });

    return fut.wait();
});