Meteor.methods({
    //Authorize bounty payment, capture later
    //see https://www.x.com/developers/paypal/documentation-tools/express-checkout/how-to/ht_ec-singleAuthPayment-curl-etc
    'processTransaction': function () {
        //Start SetExpressCheckout API Operation
        //TODO return url use https://github.com/andzdroid/paypal-express

        //node capturing payment happens after the bounty is confirmed
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