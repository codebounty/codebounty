Package.describe({
    summary: "Communication with the browser extension"
});

Package.on_use(function (api) {
    api.use("environment", "client");

    api.export("Messenger", "client");

    api.add_files("messenger.js", "client");
});