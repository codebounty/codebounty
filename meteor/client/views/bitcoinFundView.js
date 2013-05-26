var _result = Session.getter("result");
Template.bitcoinFundView.result = _result;
Template.bitcoinFundView.minimumPayment = function () { return 0.04; }

Template.bitcoinFundView.rendered = function () {
    var result = _result();
    
    if (result && result.address) {
        $('#qrCode').qrcode({
            width: 250,
            height: 250,
            text: result.address
        });
        
        $("#loadingMessage").hide();
        $("#paymentMessage").show();
    } else {
        $("#loadingMessage").hide();
        $("#setupRefundAddress").show();
    }
}
