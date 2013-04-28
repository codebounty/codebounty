//the generated bounty image route
Meteor.Router.add("/bounty/:id", function (id) {
    var response = this.response;

    //just using the first bounty for now
    var bounty = Bounties.findOne();

    //TODO generate real bounty image
    var canvas = new Canvas(200, 200),
        ctx = canvas.getContext("2d");

    ctx.font = "30px Impact";
    ctx.rotate(.1);

    var text = "Amount $" + bounty.amount;
    ctx.fillText(text, 50, 100);
    var te = ctx.measureText(text);
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.lineTo(50, 102);
    ctx.lineTo(50 + te.width, 102);
    ctx.stroke();

    response.writeHead(200, {"Content-Type": "image/png" });
    var buffer = canvas.toBuffer();
    response.write(buffer);
    response.end();
});

//the paypal IPN callback
//https://www.x.com/developers/paypal/documentation-tools/ipn/integration-guide/IPNIntro
//http://jsfiddle.net/zkcb6/1/
Meteor.Router.add("/ipn", function () {
    PayPal.verify(this.request, this.response, function (error, params) {
        if (error)
            return;

        if (params)
            Bounty.PayPal.confirm(params);
    });

    //prevents paypal from continually sending message
    //from http://stackoverflow.com/a/15847900/230462
    return [200];
});