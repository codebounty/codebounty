//TODO before publish: remove this and autosubscribe and insecure
Bounties = new Meteor.Collection("bounties");

Meteor.Router.add({
    '/createBounty': function () {
        var amount = window.url("?amount");
        var url = window.url("?url");

        BOUNTY.Create(parseFloat(amount), url);

        return "processBountyView";
    },
    '/logout': function () {
        Meteor.logout();
        window.close();
    },
    '/cancelBounty': function () {
        var id = window.url("?id");

        BOUNTY.Cancel(id, function (error) {
            window.close();
        });

        return "cancelBountyView";
    },
    '/confirmBounty': function () {
        var id = window.url("?id");

        BOUNTY.Confirm(id, function (error) {
            window.close();
        });

        return "confirmBountyView";
    }
});