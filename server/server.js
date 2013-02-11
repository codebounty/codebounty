var Future = NodeModules.require('fibers/future');

Meteor.methods({
    //Authorize bounty payment, then capture later
    //returns the express checkout url
    'processBounty': function () {

        var fut = new Future();

        //Start SetExpressCheckout API Operation
        PAYPAL.StartCheckout(function (url) {
            fut.ret(url);
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