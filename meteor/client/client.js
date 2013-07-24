Meteor.Router.add({
    //----------------- admin dashboard --------------------
    //
    "/admin": function () {
        return "adminView";
    },
    "/admin/rewards": function () {
        Messenger.listen(Messenger.target.application);
        return "adminRewardsView";
    },
    "/admin/users": function () {
        return "adminUsersView";
    },

    //----------------- funds ------------------------------
    "/addFunds": function () {
        if (Meteor.loggingIn())
            return "loadingView";

        var amount = window.url("?amount");
        var url = window.url("?url");
        var currency = window.url("?currency");

        Meteor.call("addFunds", amount, currency, url, function (error, result) {
            if (error) {
                TL.error(error, Modules.Bounty);
                return;
            }

            window.location.href = result;
        });

        return "processingView";
    },
    "/cancelFunds": function () {
        if (Meteor.loggingIn())
            return "loadingView";

        var id = window.url("?id");

        Meteor.call("cancelFunds", id, function (error) {
            if (error)
                TL.error(error, Modules.Bounty);

            window.close();
        });

        return "cancelFundsView";
    },
    "/confirmFunds": function () {
        window.close();
        return "confirmFundsView";
    },

    //bitcoin
    "/addBitcoinFunds": function () {
        Session.set("issueAddress", window.url("?issueAddress"));
        return "addBitcoinFundsView";
    },
    "/setupReceiverAddress": function () {
        var redirect = decodeURIComponent(window.url("?redirect"));
        Session.set("redirect", redirect);
        return "setupReceiverAddressView";
    },

    //-------------------------------------------------------

    //used by a hidden iframe view inserted into the GitHub issue page
    "/messenger": function () {
        var url = window.url("?url");
        Messenger.listen(Messenger.target.plugin);
        RewardUtils.trackTotal(url);

        AuthUtils.afterLogin(function () {
            Messenger.send({ event: "authenticated" }, Messenger.target.plugin);
        });

        return "messengerView";
    },

    "/reward": function () {
        if (Meteor.loggingIn())
            return "loadingView";

        var url = window.url("?url");
        Session.set("url", url);

        var admin = window.url("?admin");
        Meteor.call("getReward", url, admin, function (error, result) {
            if (error) {
                TL.error(error, Modules.Reward);
                return;
            }

            Session.set("reward", result);
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
