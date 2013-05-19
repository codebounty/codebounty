//TODO before publish: remove Bounties / Responses / rewards subscription, packages: autosubscribe and insecure
Bounties = new Meteor.Collection("bounties");
Responses = new Meteor.Collection("responses");
Rewards = new Meteor.Collection("rewards");

Meteor.subscribe("allUserData");

Meteor.Router.add({
    "/btcAddressForIssue": function () {
        var url = window.url;
    },
    "/addFunds": function () {
        var amount = window.url("?amount");
        var currency = window.url("?currency");
        var url = window.url("?url");
        var currency = window.url("?currency");

        Meteor.call("addFunds", amount, currency, url, function (error, result) {
            if (!ErrorUtils.handle(error))
                return;

            window.location.href = result;
        });

        return "processingView";
    },
    "/cancelFunds": function () {
        var id = window.url("?id");

        Meteor.call("cancelFunds", id, function (error) {
            if (!ErrorUtils.handle(error))
                return;

            window.close();
        });

        return "cancelFundsView";
    },
    "/confirmFunds": function () {
        window.close();
        return "confirmFundsView";
    },
    //used by a hidden iframe view inserted into the GitHub issue page
    "/messenger": function () {
        AuthUtils.afterLogin(function () {
            Messenger.listen();

            Messenger.send({event: "authenticated"});
        });

        //track the total reward even before logged in
        var url = window.url("?url");
        RewardUtils.trackTotal(url);

        return "messengerView";
    },
    "/reward": function () {
        var url = window.url("?url");
        Session.set("url", url);

        Meteor.call("getRewards", url, function (error, result) {
            if (!ErrorUtils.handle(error))
                return;

            //TODO change this to accept multiple rewards
            var reward = result[0];
            Session.set("reward", reward);
        });

        return "rewardView";
    },
    "/logout": function () {
        Meteor.logout();
        window.close();
    }
});

//TODO force the user to login on every action
