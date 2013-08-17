//only allow login prompt once
AuthUtils.promptLogin = _.once(function () {
    //wait until the auth services info is loaded
    _.delay(function () {
        Meteor.loginWithGithub({requestPermissions: Environment.githubScopes});
    }, 2500);
});