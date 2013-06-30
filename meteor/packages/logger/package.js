Package.describe({
    summary: "Logging for the client and server"
});

Package.on_use(function (api) {
    api.use("observatory");

    api.add_files("logger.js", ["client", "server"]);

    api.add_files("logger_client.js", "client");
});