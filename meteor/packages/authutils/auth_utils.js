AuthUtils = {};

/**
 * Return the user's email
 * @param user
 */
AuthUtils.email = function (user) {
    if (user && user.services && user.services.github && user.services.github.email)
        return user.services.github.email;

    return "";
};

AuthUtils.isActive = function (user) {
    return user && user.active;
};

AuthUtils.isAdmin = function (user) {
    return user && user.role === "admin";
};

/**
 * Throw an error if the user is not authorized
 * @param user
 * @param [role] If passed, require this role
 */
AuthUtils.requireAuthorization = function (user, role) {
    if (!user || !user.active || (role && user.role !== role))
        throw new Meteor.Error(404, "Not authorized");
};

AuthUtils.username = function (user) {
    if (user && user.services && user.services.github && user.services.github.username)
        return user.services.github.username;

    return "";
};