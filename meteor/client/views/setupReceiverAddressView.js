Template.setupReceiverAddressView.events({
    "submit": function ($event) {
        var receiverAddress = $("[name=receiverAddress]").val();

        Meteor.call("setupReceiverAddress", receiverAddress, function (error, result) {
            if (!ErrorUtils.handle(error))
                return;

            window.location.href = Session.get("redirect");
        });

        $event.preventDefault();
    }
});