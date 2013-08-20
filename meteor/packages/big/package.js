Package.describe({
    summary: "Meteor smart package for big node.js package"
});

Npm.depends({
    "big.js": "2.1.0"
});

Package.on_use(function (api) {
    api.add_files("big.js", "server");
    api.add_files(".npm/package/node_modules/big.js/big.js", "client");
    api.add_files("big_utils.js", ["client", "server"]);

    api.export("Big");
    api.export("BigUtils");
});