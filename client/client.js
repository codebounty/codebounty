Meteor.Router.add({
    '/processBounty': function () {
        var amount = window.url("?amount");
        var url = window.url("?url");

        BOUNTY.Create(parseFloat(amount), url);
        return "processBountyView";
    },
    '/logout': function () {
        Meteor.logout();
        window.close();
    },
    '/cancel': function () {
        return "cancelView";
    },
    '/confirm': function () {
        window.close();
    }
});

Template.cancelView.rendered = function () {
    _.delay(window.close, 5000);
};