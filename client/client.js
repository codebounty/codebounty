///////////////////////////////////////////////////////////////////////////////
// General

Meteor.Router.add({
    '/addBounty': function () {
        //if no user return no view, the user will be redirected to login automatically
        if (!Meteor.userId())
            return;

        //TODO setup paypal flow
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

    //add stripe library
    document.body.appendChild(document.createElement('script')).src = 'https://checkout.stripe.com/v2/checkout.js';
});