Package.describe({
    summary: "General tools"
});

Package.on_use(function (api) {
    api.add_files("tools.js", ["client", "server"]);
});