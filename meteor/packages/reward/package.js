Package.describe({
    summary: "Manages rewards and their payment"
});

Npm.depends({
    "paypal-ipn": "1.0.1"
});

Package.on_use(function (api) {
    api.use("canvas", "server");
    api.use("fibers", "server");
    api.use("github", "server");
    api.use("paypal", "server");

    api.use("big", ["client", "server"]);
    api.use("tools", ["client", "server"]);
    api.use("underscore", ["client", "server"]);

    api.add_files("receiver.js", ["client", "server"]);
    api.add_files("reward.js", ["client", "server"]);
    api.add_files("settings.js", ["client", "server"]);

    api.add_files("server/settings.js", "server");
    api.add_files("server/reward_utils.js", "server");

    api.add_files("server/fund.js", "server");
    api.add_files("server/bitcoinfund.js", "server");
    api.add_files("server/paypalfund.js", "server");

    api.add_files("server/reward_status_comment.js", "server");
    api.add_files("server/reward_repo_badge.js", "server");

    api.add_files("server/reward_payment.js", "server");
    api.add_files("server/reward_server.js", "server");
});
