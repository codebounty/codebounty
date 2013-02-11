Meteor.Router.add({
    '/processBounty': function () {
        BOUNTY.Create();
        return "processBountyView";
    },
    '/logout': function () {
        Meteor.logout();
        window.close();
    }
});