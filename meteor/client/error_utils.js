ErrorUtils = {};

/**
 * If the error could not be handled it returns false
 * and redirects the user to an error page
 * @param error
 * @returns {boolean}
 */
ErrorUtils.handle = function (error) {
    if (error) {
        //TODO some errors might be okay, so return true for those
        //TODO some nice error redirect page?
        alert("Agee, we've messed up. Please reload and try again. Don't go pitch a fit.");

        return false;
    }

    return true;
};