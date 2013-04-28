//TODO before publish: remove Bounties / Responses subscription, packages: autosubscribe and insecure
Bounties = new Meteor.Collection("bounties");
Responses = new Meteor.Collection("responses");

Meteor.subscribe("allUserData");

Meteor.Router.add({
    "/createBounty": function () {
        var amount = window.url("?amount");
        var url = window.url("?url");

        Bounty.create(parseFloat(amount), url);

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

            Messenger.send({event: "authorized"});
        });

        //track reward even before logged in
        var url = window.url("?url");
        Bounty.trackReward(url);

        return "messengerView";
    },
    "/rewardBounty": function () {
        var url = window.url("?url");
        Session.set("url", url);

        Meteor.call("contributors", Session.get("url"), function (error, result) {
            if (!ErrorUtils.handle(error))
                return;

            Session.set("contributors", result);
        });

        Meteor.call("rewardableBounties", Session.get("url"), function (error, result) {
            if (!ErrorUtils.handle(error))
                return;

            Session.set("rewardableBounties", result);
        });

        return "rewardBountyView";
    },
    "/logout": function () {
        Meteor.logout();
        window.close();
    }
});

//TODO force the user to login on every action