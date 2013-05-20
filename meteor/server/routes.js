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
    Bitcoin.verify(this.request, this.response, function (error, params) {
        if (error)
            return;
            
        if (params)
            Bounty.Bitcoin.create(params);
    });
    
    // To prevent Blockchain.info from resending the transaction.
   return [200, "*ok*"];
});
