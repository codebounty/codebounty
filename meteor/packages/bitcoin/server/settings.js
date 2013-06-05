Bitcoin.IPNSecret = Meteor.settings["BITCOIN_SECRET"];

Bitcoin.Settings = {
    "callbackURI": Meteor.settings["ROOT_URL"] + "bitcoin-ipn?secret=" + Bitcoin.IPNSecret,
    "minimumAddresses": 300,
    "maximumAddresses": 600,
    "addressRefillInterval": 1000, // In milliseconds.
    "maximumErrors": 10,
    "client": Meteor.settings["BITCOIN_CLIENT"],
    "minimumConfirmations": 6
};