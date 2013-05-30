var fs = Npm.require("fs");

//the generated bounty image route
Meteor.Router.add("/reward/:id", function (id) {
    var fut = new Future();
    var response = this.response;

    RewardUtils.statusImage(id, function (canvas) {
        var buffer = canvas.toBuffer();

        response.writeHead(200, {"Content-Type": "image/png" });
        response.write(buffer);
        response.end();

        fut.ret();
    });

    return fut.wait();
});

//the generated repo badge route
Meteor.Router.add("/badge/:id", function (id) {
    var response = this.response;

    // TODO: Hook up with db
    var repoStatus = {
        open: 9
    };

    var canvas = RewardUtils.repoBadge(repoStatus);
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
                console.log(reward);
                if (!reward) {
                    error = "BitcoinFund approved but not found " + EJSON.stringify(params);
                    throw error;
                }

                var bitcoinFund = _.find(reward.funds, function (fund) {
                    return fund.proxyAddress === params.input_address;
                });
                bitcoinFund.confirm(reward, params);
                console.log(bitcoinFund.toString());
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
