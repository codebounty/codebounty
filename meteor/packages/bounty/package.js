Package.describe({
    summary: "Manages bounties"
});

Npm.depends({
    "paypal-ipn": "1.0.1"
});

Package.on_use(function (api) {
    api.use("fibers");
    api.use("canvas");
    api.use("errorutils");
    api.use("tools");
    api.use("paypal");

    api.use("github");

    api.add_files("bounty_common.js", ["client", "server"]);

    api.add_files("client/bounty_client.js", "client");

    api.add_files("server/payout.js", ["client", "server"]);
    api.add_files("server/bounty.js", "server");
    api.add_files("server/bounty_art.js", "server");
    api.add_files("server/bounty_paypal.js", "server");
    api.add_files("server/bounty_payment.js", "server");
    api.add_files("server/bounty_status.js", "server");
});