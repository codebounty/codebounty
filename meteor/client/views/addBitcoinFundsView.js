var getIssueAddress = Template.addBitcoinFundsView.issueAddress = function () {
    return Session.get("issueAddress");
};

Template.addBitcoinFundsView.minimumPayment = function () {
    return 0.043; // TODO: Get this figure from bitcoin/server/settings.js
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
