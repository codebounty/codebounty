//TODO before publish: remove Bounties / Responses subscription, packages: autosubscribe and insecure
Bounties = new Meteor.Collection("bounties");
Responses = new Meteor.Collection("responses");

Meteor.subscribe("allUserData");

Meteor.Router.add({
    "/createBounty": function () {
        var amount = window.url("?amount");
        var url = window.url("?url");

        Bounty.create(parseFloat(amount), url, "usd");

        return "processBountyView";
    },
    "/cancelCreateBounty": function () {
        var id = window.url("?id");

        Bounty.cancel(id, function (error) {
            if (!ErrorUtils.handle(error))
                return;

            window.close();
        });

        return "cancelCreateBountyView";
    },
    "/confirmBounty": function () {
        window.close();
        return "confirmBountyView";
    },
    //used by a hidden iframe view inserted into the GitHub issue page
    "/messenger": function () {
        AuthUtils.afterLogin(function () {
            Messenger.listen();

            Messenger.send({event: "authenticated"});
        });

        //track the total reward even before logged in
        var url = window.url("?url");
        Bounty.trackTotalReward(url);

        return "messengerView";
    },
    "/rewardBounty": function () {
        var url = window.url("?url");
        Session.set("url", url);

        Meteor.call("getRewards", url, function (error, result) {
            if (!ErrorUtils.handle(error))
                return;

            //TODO change this to accept multiple rewards
            Session.set("reward", result[0]);
        });

        return "rewardBountyView";
    },
    "/logout": function () {
        Meteor.logout();
        window.close();
    }
});

//TODO force the user to login on every action