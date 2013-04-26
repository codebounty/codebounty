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

        console.log(error);

        //TODO some nice error redirect page?
        if (Meteor.isClient)
            alert("Error :(");

        return false;
    }

    return true;
};