Package.describe({
    summary: "Interactions with PayPal"
});

Npm.depends({
    "paypal-ipn": "1.0.1"
});

Package.on_use(function (api) {
    api.use("environment", "server");

    api.add_files("paypal.js", "server");
});