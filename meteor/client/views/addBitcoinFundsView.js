var getIssueAddress = Template.addBitcoinFundsView.issueAddress = function () {
    return Session.get("issueAddress");
};

Template.addBitcoinFundsView.minimumPayment = function () {
    return 0.04;
};

Template.addBitcoinFundsView.rendered = function () {
    var issueAddress = getIssueAddress();
    if (issueAddress)
        $('#qrCode').qrcode({
            width: 250,
            height: 250,
            text: issueAddress
        });
};