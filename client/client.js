///////////////////////////////////////////////////////////////////////////////
// General

Meteor.Router.add({
    '/addBounty': function () {
        return "addBountyView";
    }
});


Meteor.startup(function () {
    Meteor.autorun(function () {
        //when logged out, switch to login
        if (!Meteor.userId()) {
//            Meteor.Router.to("/login");
        }
    });
});