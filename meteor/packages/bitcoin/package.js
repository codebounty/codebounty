Package.describe({
    summary: "Interactions with the Bitcoin network"
});

Npm.depends({
});

Package.on_use(function (api) {
    api.add_files("bitcoin.js", "server");
    api.add_files("server/settings.js", "server");
    api.add_files("server/bitcoin_client.js", "server");
    api.add_files("server/address.js", "server");
});
