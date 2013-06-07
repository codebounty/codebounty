//TODO setup deploySettings.json
Meteor.startup(function () {
    var githubServiceSetup = Accounts.loginServiceConfiguration.find({service: "github"}).count() === 1;
    if (!githubServiceSetup) {
        //setup authentication Provider
        Accounts.loginServiceConfiguration.remove({
            service: "github"
        });

        Accounts.loginServiceConfiguration.insert({
            service: "github",
            clientId: Meteor.settings["GITHUB_CLIENTID"],
            secret: Meteor.settings["GITHUB_SECRET"]
        });
    }
});