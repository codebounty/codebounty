//TODO before publish: remove these and autosubscribe and insecure
Meteor.subscribe("allUserData");

Meteor.Router.add({
    "/createBounty": function () {
        var amount = window.url("?amount");
        var url = window.url("?url");

        BOUNTY.Create(parseFloat(amount), url);

        return "processBountyView";
    },
    "/cancelCreateBounty": function () {
        var id = window.url("?id");

        BOUNTY.Cancel(id, function (error) {
            if (!error)
                window.close();
        });

        return "cancelCreateBountyView";
    },
    "/confirmBounty": function () {
        var id = window.url("?id");

        BOUNTY.Confirm(id, function (error) {
            if (!error)
                window.close();
        });

        return "confirmBountyView";
    },

    //a hidden iframe view inserted into the GitHub issue page
    "/messenger": function () {
        MESSENGER.listen();

        var url = window.url("?url");
        BOUNTY.TrackReward(url);

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