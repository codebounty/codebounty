var Tools = (function () {
    var my = {};

    var loginPrompted = false, promptLogin = function () {
        loginPrompted = true;
        Meteor.loginWithGithub({requestPermissions: ["user", "repo"]});
    };

    /**
     * Checks the user is logged in and has given the required scopes
     * @param func
     * @constructor
     */
    my.AfterLogin = function (func) {
        //wait till everything is loaded
        Meteor.startup(function () {
            _.delay(function () {
                Meteor.autorun(function (handle) {
                    //if the current user has properly authorized this application: all is swell proceed
                    if (Session.get("UserAuthorized")) {
                        func();
                        handle.stop();
                    }
                    //if the current user has not logged in: prompt a login
                    else if (!Meteor.userId()) {
                        debugger;
                        //only prompt for login once
                        if (!loginPrompted)
                            promptLogin();
                    }
                    //check the user's authorization
                    else {
                        Meteor.call("checkAuthorization", function (error, hasAccess) {
                            debugger;
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
            }, 1000);
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