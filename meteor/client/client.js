//TODO before publish: remove these and autosubscribe and insecure
Meteor.subscribe("allUserData");
Bounties = new Meteor.Collection("bounties");

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
    "/messenger": function () {
        //listen for messages

        window.addEventListener("message", function (evt) {
            if (evt.origin !== "https://github.com")
                return;

            var message = evt.data.message;

            if (message.method) {
                var callParams = [message.method];
                callParams = _.union(callParams, message.params);

                //add the callback
                callParams.push(function (error, result) {
                    top.postMessage({id: evt.data.id, message: {error: error, result: result}}, "https://github.com")
                });

                Meteor.call.apply(null, callParams);
            }
        }, false);

        return "messengerView";
    },
    "/logout": function () {
        Meteor.logout();
        window.close();
    }
});