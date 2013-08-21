Template.setupReceiverAddressView.events({
    "submit": function ($event) {
        var receiverAddress = $("[name=receiverAddress]").val();

        Meteor.call("setupReceiverAddress", receiverAddress, function (error, result) {
            if (error) {
                TL.error(EJSON.stringify(error), Modules.Bitcoin);
                return;
            }

            window.location.href = Session.get("redirect");
        });

        $event.preventDefault();
    }
});