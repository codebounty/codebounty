var address = Session.getter("address");
Template.bitcoinFundView.address = address;
Template.bitcoinFundView.minimumPayment = function () { return 0.04; }

Template.bitcoinFundView.rendered = function () {
    if (address() != undefined) {
        $('#qrCode').qrcode({
            width: 250,
            height: 250,
            text: address()
        });
        
        $("#loadingMessage").hide();
        $("#paymentMessage").show();
    }
}
