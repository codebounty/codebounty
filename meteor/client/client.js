//TODO before publish: remove these and autosubscribe and insecure
Meteor.subscribe("allUserData");

Meteor.Router.add({
    "/createBounty": function () {
        var amount = window.url("?amount");
        var url = window.url("?url");

        Bounty.Create(parseFloat(amount), url);

        return "processBountyView";
    },
    "/cancelCreateBounty": function () {
        var id = window.url("?id");

        Bounty.Cancel(id, function (error) {
            if (!error)
                window.close();
        });

        return "cancelCreateBountyView";
    },
    "/confirmBounty": function () {
        var id = window.url("?id");

        Bounty.Confirm(id, function (error) {
            if (!error)
                window.close();
        });

        return "confirmBountyView";
    },

    //a hidden iframe view inserted into the GitHub issue page
    "/messenger": function () {
        Messenger.listen();

        var url = window.url("?url");
        Bounty.TrackReward(url);

        return "messengerView";
    },
    "/rewardBounty": function () {
        return "rewardBountyView";
    },
    "/logout": function () {
        Meteor.logout();
        window.close();
    }
});