Accounts.onCreateUser(function (options, user) {
    // We still want the default hook's 'profile' behavior.
    if (options.profile)
        user.profile = options.profile;

    user.active = true;
    user.log = [];

    //TODO before publish: switch this
    user.role = "admin";
    //user.role = "user";

    return user;
});