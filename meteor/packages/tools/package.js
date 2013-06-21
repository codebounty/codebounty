Package.describe({
    summary: "General tools"
});

Package.on_use(function (api) {
    api.use("underscore");
    api.add_files("tools.js", ["client", "server"]);
    api.add_files("tools_server.js", "server");
});