Accounts.onCreateUser(function (options, user) {
    // We still want the default hook's 'profile' behavior.
    if (options.profile)
        user.profile = options.profile;

    user.active = true;
    user.log = [];

    user.role = (Environment.isLocal || Environment.isQa) ? "admin" : "user";

    return user;
});