//TODO setup deploySettings.json

Meteor.startup(function () {
    //setup authentication Provider
    Accounts.loginServiceConfiguration.remove({
        service: "github"
    });

    Accounts.loginServiceConfiguration.insert({
        service: "github",
        clientId: Meteor.settings["GITHUB_CLIENTID"],
        secret: Meteor.settings["GITHUB_SECRET"]
    });
});