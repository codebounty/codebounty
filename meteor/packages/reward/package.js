Package.describe({
    summary: "Manages rewards and their payment"
});

Npm.depends({
    "paypal-ipn": "1.0.1"
});

Package.on_use(function (api) {
    api.use("fibers");
    api.use("underscore");
    api.use("canvas");
    api.use("big");
    api.use("tools");
    api.use("paypal");
    api.use("github");
    
    api.add_files("receiver.js", ["client", "server"]);
    api.add_files("reward.js", ["client", "server"]);

    api.add_files("client/reward_client.js", "client");

    api.add_files("server/settings.js", ["server"]);
    api.add_files("server/reward_utils.js", "server");

    api.add_files("server/fund.js", "server");
    api.add_files("server/bitcoinfund.js", "server");
    api.add_files("server/paypalfund.js", "server");

    api.add_files("server/reward_status_comment.js", "server");
    api.add_files("server/reward_repo_badge.js", "server");

    api.add_files("server/reward_payment.js", "server");
    api.add_files("server/reward_server.js", "server");
});
