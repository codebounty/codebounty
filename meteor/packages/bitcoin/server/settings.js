Bitcoin.IPNSecret = Meteor.settings["BITCOIN_SECRET"];

Bitcoin.Settings = {
    "callbackURI": Meteor.settings["ROOT_URL"] + "bitcoin-ipn?secret=" + Bitcoin.IPNSecret,
    "minimumAddresses": 50,
    "maximumAddresses": 100,
    "addressRefillInterval": 600000, // In milliseconds.
    "maximumErrors": 10,
    "client": Meteor.settings["BITCOIN_CLIENT"],
    "minimumConfirmations": 6,
    "minimumFundAmount": 0.043, // Roughly 0.04 / 0.95. The actual figure is awkwardly long.
    "walletPassphrase": "0GeaTJCJoVjP4XUSzpIKClG", // This cannot be the best way to store this...
    "walletLockInterval": 10 // In seconds
};

Bitcoin.Emails = {
    insufficient_funds: {
        subject: "You did not send enough bitcoin.",
        text: "Your bounty will not show up until you've sent at least "
            + Bitcoin.Settings.minimumFundAmount + " BTC. If you would "
            + "prefer a refund, please contact customer support."
    },
    
    transaction_received: {
        subject: "Bitcoin received.",
        text: "We received the BTC you sent! It will show up on the "
            + "issue page once the transaction has received "
            + Bitcoin.Settings.minimumConfirmations + " confirmations."
        }
}
