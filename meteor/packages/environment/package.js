Package.describe({
    summary: "Environment settings for code bounty"
});

Package.on_use(function (api) {
    api.add_files("environment.js", ["client", "server"]);
});