Package.describe({
    summary: "Interactions with the Bitcoin network"
});

Npm.depends({
});

Package.on_use(function (api) {
    api.add_files("server/address.js", "server");
});
