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
    '/confirm': function () {
        var token = window.url("?token");
        var payerId = window.url("?PayerID");

        Meteor.call('confirmBounty', token, payerId, function (error) {
            if (error) {
                //TODO error handling
            } else {
                window.close();
            }
        });

        return "confirmBountyView";
    }
});