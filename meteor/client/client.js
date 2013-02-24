//TODO before publish: remove these and autosubscribe and insecure
Meteor.subscribe("allUserData");
Bounties = new Meteor.Collection("bounties");

Meteor.Router.add({
    '/createBounty': function () {
        var amount = window.url("?amount");
        var url = window.url("?url");

        BOUNTY.Create(parseFloat(amount), url);

        return "processBountyView";
    },
    '/cancelBounty': function () {
        var id = window.url("?id");

        BOUNTY.Cancel(id, function (error) {
            if (!error)
                window.close();
        });

        return "cancelBountyView";
    },
    '/confirmBounty': function () {
        var id = window.url("?id");

        BOUNTY.Confirm(id, function (error) {
            if (!error)
                window.close();
        });

        return "confirmBountyView";
    },
    '/logout': function () {
        Meteor.logout();
        window.close();
    }
});