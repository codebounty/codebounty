var Future = NodeModules.require('fibers/future');

Meteor.methods({
    //return the paypal express checkout url for the bounty
    'processBounty': function (amount, bountyUrl) {
        var fut = new Future();

        BOUNTY.parse(amount, bountyUrl, function (error, bounty) {
            if (error)
                throw new Meteor.Error(404, "Incorrect parameters");

            //Start SetExpressCheckout API Operation
            PAYPAL.StartCheckout(bounty.amount, bounty.desc, function (error, url) {
                if (error)
                    throw new Meteor.Error(500, "Error starting checkout");

                //TODO store bounty

                fut.ret(url);
            });
        });

        return fut.wait();
    },
    //after a bounty payment has been authorized
    //test the the token and payer id are valid (since the client passed them)
    //then store them to capture the payment later
    'confirmBounty': function (token, payerId) {
        var fut = new Future();

        PAYPAL.Confirm(token, payerId, function (error, data) {
            if (error)
                throw new Meteor.Error(404, "Error processing the transaction");

            //TODO update bounty with token and payerId
            console.log("Confirmed!");
            console.log(data);
            //TODO add comment to GitHub

            fut.ret(true);
        });

        return fut.wait();
    }
});

Meteor.startup(function () {
//Setup Authentication Providers
//TODO need to pass settings json with deploy http://docs.meteor.com/#meteor_settings ex: meteor deploy --settings deploySettings.json
    Accounts.loginServiceConfiguration.remove({
        service: "github"
    });

    Accounts.loginServiceConfiguration.insert({
        service: "github",
        clientId: "a2087b445e1e1493bb7b",
        secret: "74e9f41bd555149d3a546620f5a398ace8e1a34f"
        //clientId: Meteor.settings.GITHUB_CLIENT_ID,
        //secret: Meteor.settings.GITHUB_SECRET
    });
});