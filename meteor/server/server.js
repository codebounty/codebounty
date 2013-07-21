Meteor.startup(function () {
    Accounts.loginServiceConfiguration.remove({
        service: "github"
    });

    Accounts.loginServiceConfiguration.insert({
        service: "github",
        clientId: Meteor.settings["GITHUB_CLIENTID"],
        secret: Meteor.settings["GITHUB_SECRET"]
    });
});