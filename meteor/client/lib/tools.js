var Tools = (function () {
    var my = {};

    my.AfterLogin = function (func) {
        Meteor.autorun(function (handle) {
            //force the user to login
            if (!Meteor.userId()) {
                Meteor.loginWithGithub({requestPermissions: ["user", "repo"]});
            } else {
                handle.stop();

                func();
            }
        });
    };

    //TODO some nice error redirect page?
    /**
     * If the error could not be handled it returns false
     * and redirects the user to an error page
     * @param error
     * @returns {boolean}
     */
    my.HandleError = function (error) {
        if (error) {
            //TODO some errors might be okay, so return true for those

            console.log(error);
            alert("Error :(");
            return false;
        }

        return true;
    };

    return my;
})();