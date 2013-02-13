Meteor.Router.add({
    '/processBounty': function () {
        BOUNTY.Create();
        return "processBountyView";
    },
    '/logout': function () {
        Meteor.logout();
        window.close();
    },
    '/confirm': function () {
        var token = url("?token");
        var payerId = url("?PayerID");

        Meteor.call('storeBounty', token, payerId, function (error) {
            //TODO error handling

        });

        window.close();
    }
});