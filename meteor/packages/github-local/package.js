Package.describe({
    summary: "Code Bounty-specific Github code"
});

Npm.depends({
    "github": "https://github.com/piascikj/node-github-1/tarball/b80e6e290e0c9b977272368fd47233155e5b1c8d"
});

Package.on_use(function (api) {
    api.use("github-utils", "server");

    api.add_files("github_utils.js", "server");
});
