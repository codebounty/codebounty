AuthUtils = {};

/**
 * Return the user's email
 * @param user
 */
AuthUtils.email = function (user) {
    return user.services.github.email;
};