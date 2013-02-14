var Future = NodeModules.require('fibers/future');

Meteor.methods({
    //return the paypal express checkout url for the bounty
    'processBounty': function (amount, bountyUrl) {
        var fut = new Future();

        BOUNTY.parse(amount, bountyUrl, function (error, bounty) {
            if (error)
                throw new Meteor.Error(404, "Incorrect parameters");

            //Start pre-approval process
            PAYPAL.GetApproval(bounty.amount, bounty.desc, function (error, url) {
                if (error)
                    throw new Meteor.Error(500, "Error starting checkout");

                //TODO store bounty and payment info
                //TODO add comment to GitHub
                fut.ret(url);
            });
        });

        return fut.wait();
    }
});

Meteor.Router.add({
    //the IPN for paypal preapprovals
    '/approved': function () {
        console.log(this);
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