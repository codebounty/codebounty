//TODO move all private info to root Meteor.settings settings.json?
Bitcoin.IPNSecret = "moEcxlV1bvVaXIqvAQ1NwF5ZtdMJeyrET5rRQtaWi32Qez3y82nEvEssDLw2Qq5";

Bitcoin.Settings = {
    "callbackURI": Meteor.settings["ROOT_URL"] + "bitcoin-ipn?secret=" + Bitcoin.IPNSecret,
    "minimumAddresses": 300,
    "maximumAddresses": 600,
    "addressRefillInterval": 1000, // In milliseconds.
    "maximumErrors": 10,
    "client": {
        "host": "localhost",
        "port": 18332,
        "username": "oldgregg",
        "password": "4Mr7LjcTbx66DpVvzkA93AvJesx6HpSY4974CXn57TXZ"
    },
    "minimumConfirmations": 6
};
