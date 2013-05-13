Package.describe({
    summary: "Meteor smart package for big node.js package"
});

Npm.depends({
    "big.js": "https://github.com/MikeMcl/big.js/tarball/6b9ba43e6cf296a9dfd82bbe7a34855d35634e4c"
});

Package.on_use(function (api) {
    api.add_files("big.js", "server");
    api.add_files(".npm/node_modules/big.js/big.js", "client");
    api.add_files("big_utils.js", ["client", "server"]);
});