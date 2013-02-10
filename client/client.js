///////////////////////////////////////////////////////////////////////////////
// General

Meteor.Router.add({
    '/addBounty': function () {
        return "addBountyView";
    },
    '/login': function () {
        return "loginView";
    },
    '/logout': function () {
        Meteor.logout();
        return "loginView";
    }
});


Meteor.startup(function () {
    Meteor.autorun(function () {
        //when logged out, switch to login
        if (!Meteor.userId()) {
            Meteor.Router.to("/login");
//            Meteor.loginWithGithub({});
        }
        //when logged out, switch to add bounty
        else {
            Meteor.Router.to("/addBounty");
        }
    });
});