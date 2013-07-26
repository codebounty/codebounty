var fs = Npm.require("fs");

//the generated bounty image route
Meteor.Router.add("/reward/image/:id", function (id) {
    var reward = Rewards.findOne(id);

    //todo better error image
    if (!reward)
        return "No reward found";

    var status = reward.status;
    if (_.contains(["initiated", "expired", "paying", "held", "refunded"], status))
        status = "closed";
    else if (status === "paid")
        status = "claimed";

    var rewardAmount = parseFloat(reward.total().toString());

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

Meteor.Router.add("/reward/link/:id", function () {
    return [302, { "Location": Meteor.settings["ROOT_URL"] }, null];
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
        if (error) {
            fut.ret([404]);
            return;
        }
            
        Bitcoin.getTransaction(params.transaction_hash, function (error, transaction) {
            if (error) {
                fut.ret([404]);
                return;
            }
            
            Fiber(function () {
                // Check if this transaction has already been recorded
                var existing = Rewards.findOne({
                    funds: {
                        $elemMatch: {
                            transactionHash: params.transaction_hash,
                            approved: true
                        }
                    }
                });
                
                // Make sure this transaction is in our wallet and was not already approved.
                if (!existing && transaction) {
                    
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
                    
                    if (reward) {
                        
                        // Get the BitcoinFund that this notification is for.
                        var bitcoinFund = _.find(reward.funds, function (fund) {
                            return (!fund.transactionHash
                                    || fund.transactionHash == params.transaction_hash)
                                && fund.proxyAddress === proxyAddress
                                && !fund.approved;
                        });
                        
                        // add a new fund for this transaction if an unassigned
                        // one doesn't exist already.
                        if (!bitcoinFund) {
                            var expires = Tools.addDays(FundUtils.expiresAfterDays);
                            bitcoinFund = new BitcoinFund({
                                address: params.destination_address,
                                amount: (new Big(0)),
                                expires: expires,
                                proxyAddress: proxyAddress,
                                userId: reward.userId,
                                transactionHash: null
                            });
                            reward.funds.push(bitcoinFund);
                        }
                        
                        if (!bitcoinFund.transactionHash) {
                            // Save the transaciton hash.
                            bitcoinFund.setAmount((new Big(params.value).div(Bitcoin.SATOSHI_PER_BITCOIN)))
                            bitcoinFund.transactionHash = params.transaction_hash;
                            reward.saveFunds();
                        
                            // Figure out how much this BTC payment will bring the
                            // total BTC paid on this issue to.
                            var totalPaid = BigUtils
                                .sum(reward.availableFundAmounts())
                                .plus(bitcoinFund.amount);
                            
                            // Send the user different notification emails depending
                            // on whether there is enough BTC to fund a full bounty.
                            if (totalPaid >= Bitcoin.Settings.minimumFundAmount) {
                                Email.send({
                                    to: AuthUtils.email(
                                        Meteor.users.find({_id: reward.userId})),
                                    from: Meteor.settings["ALERTS_EMAIL"],
                                    subject: Bitcoin.Emails.transaction_received.subject,
                                    text: Bitcoin.Emails.transaction_received.text
                                });
                                
                            } else {
                                Email.send({
                                    to: AuthUtils.email(
                                        Meteor.users.find({_id: reward.userId})),
                                    from: Meteor.settings["ALERTS_EMAIL"],
                                    subject: Bitcoin.Emails.insufficient_funds.subject,
                                    text: Bitcoin.Emails.insufficient_funds.text
                                });
                            }
                        }
                        
                        // If Blockchain.info says we've got enough confirmations,
                        //  and the transaction is in our wallet and also has enough
                        // confirmations...
                        if (params.confirmations >= Bitcoin.Settings.minimumConfirmations
                            && transaction.confirmations >= Bitcoin.Settings.minimumConfirmations) {
                                
                            // ...go ahead and mark the BitcoinFund confirmed.
                            bitcoinFund.confirm(reward, params, false);
                        
                            // Prevent Blockchain.info from continually resending the transaction.
                            fut.ret([200, "*ok*"]);
                        } else {
                            // Keep Blockchain.info sending notifications.
                            fut.ret([200]);
                        }
                    } else { // if (reward)
                        TL.error("No eligible reward found " + EJSON.stringify(params));
                        fut.ret([404]); // Someone's probably screwing with us.
                    }
                } else { // if (!existing && transaction)
                    TL.error("BitcoinFund approval already recorded " + EJSON.stringify(params));
                    fut.ret([200, "*ok*"]); // Have BitPay stop sending notifications.
                }
            }).run();
        });
    });

    return fut.wait();
});
