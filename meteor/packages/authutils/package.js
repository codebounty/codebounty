Package.describe({
    summary: "Authentication utilities"
});

Package.on_use(function (api) {
    api.use("environment", "client");

    api.add_files("auth_utils.js", ["client", "server"]);
    api.add_files("auth_utils_client.js", "client");
});