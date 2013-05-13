Package.describe({
    summary: "Manages bounties, rewards, and their payment"
});

Npm.depends({
    "paypal-ipn": "1.0.1"
});

Package.on_use(function (api) {
    api.use("fibers");
    api.use("underscore");
    api.use("canvas");
    api.use("big");
    api.use("errorutils");
    api.use("tools");
    api.use("paypal");
    api.use("github");

    api.add_files("bounty.js", ["client", "server"]);
    api.add_files("receiver.js", ["client", "server"]);
    api.add_files("reward.js", ["client", "server"]);

    api.add_files("client/bounty_client.js", "client");

    api.add_files("server/bounty_art.js", "server");
    api.add_files("server/bounty_paypal.js", "server");
    api.add_files("server/bounty_utils.js", "server");

    api.add_files("server/reward_payment.js", "server");
    api.add_files("server/reward_server.js", "server");
    api.add_files("server/reward_utils.js", "server");
});