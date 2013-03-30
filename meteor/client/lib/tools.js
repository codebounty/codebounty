var Tools = (function () {
    var my = {};

    var loginPrompted = false, promptLogin = function () {
        loginPrompted = true;
        Meteor.loginWithGithub({requestPermissions: ["user", "repo"]});
    };

    /**
     * Checks the user is logged in and has given the required scopes
     * otherwise prompt them to login once.
     * Should only be used by the messenger, because after UI will not be setup until authorization has been succesful
     * @param func Run this after logged in. TODO figure out why func subscriptions seem to be cancelled
     */
    my.AfterLogin = function (func) {
        //wait till everything is loaded (startup + 1/2 second delay)
        Meteor.startup(function () {
            _.delay(function () {
                Meteor.autorun(function (handle) {
                    //if the current user has properly authorized this application: all is swell proceed
                    if (Session.get("UserAuthorized")) {
                        //must do this before the function, or else it will stop calculations inside the function
                        handle.stop();
                        func();
                    }
                    //if the current user has not logged in: prompt a login
                    else if (!Meteor.userId()) {
                        //only prompt for login once
                        if (!loginPrompted)
                            promptLogin();
                    }
                    //check the user's authorization
                    else {
                        Meteor.call("checkAuthorization", function (error, hasAccess) {
                            //all is swell proceed
                            //(setting UserAuthorized will jump the code to the first if which runs the function)
                            if (hasAccess) {
                                Session.set("UserAuthorized", true);
                            }
                            //all is not swell, try to re-authenticate by forcing a login
                            else {
                                Meteor.logout();
                            }
                        });
                    }
                });
            }, 500);
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