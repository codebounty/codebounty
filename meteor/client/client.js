//TODO before publish: remove Bounties / Responses / rewards, packages: autosubscribe and insecure
Bounties = new Meteor.Collection("bounties");
Responses = new Meteor.Collection("responses");
Rewards = new Meteor.Collection("rewards");

Meteor.Router.add({
    //admin dashboard
    "/admin": function () {
        return "adminView";
    },
    "/admin/rewards": function () {
        return "adminRewardsView";
    },
    "/admin/users": function () {
        return "adminUsersView";
    },
   
    // Bitcoin setup
    "/btcAddressForIssue": function () {
        var url = window.url;
    },
    
    "/setupReceiverAddress": function () {
        var redirect = window.url("?redirect");
        var address = window.url("?receiverAddress");
        
        Meteor.call("setupReceiverAddress", address, redirect,
            function (error, result) {
                window.location.href = decodeURIComponent(result);
            });
    },

    //funds
    "/addFunds": function () {
        var amount = window.url("?amount");
        var url = window.url("?url");
        var currency = window.url("?currency");

        Meteor.call("addFunds", amount, currency, url, function (error, result) {
            if (!ErrorUtils.handle(error))
                return;
            
            if (currency == "usd") {
                window.location.href = result;
            } else if (currency == "btc") {
                Session.set("result", result);
            }
        });

        if (currency == "usd") {
            return "processingView";
        } else if (currency == "btc") {
            return "bitcoinFundView";
        }
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
        var url = window.url("?url");
        RewardUtils.trackTotal(url);

        AuthUtils.afterLogin(function () {
            Messenger.listen();
            Messenger.send({event: "authenticated"});
        });

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

Meteor.Router.filters({
    "checkLoggedIn": function (page) {
        var user = Meteor.user();

        if (Meteor.loggingIn())
            return "loadingView";
        else if (user && !user.active)
            return "contactAdminView";
        else if (user && user.active)
            return page;
        else {
            AuthUtils.promptLogin();
            return "signInView";
        }
    }
});

Meteor.Router.filter("checkLoggedIn", {except: "/messenger"});
