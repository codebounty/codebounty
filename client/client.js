///////////////////////////////////////////////////////////////////////////////
// General

Meteor.Router.add({
    '/processBounty': function () {
        //TODO start paypal flow
        TRANSACTION.StartTransaction();

        return "processBountyView";
    },
    '/logout': function () {
        Meteor.logout();
        window.close();
    }
});

Meteor.startup(function () {
    //add stripe library
    document.body.appendChild(document.createElement('script')).src = 'https://checkout.stripe.com/v2/checkout.js';
});