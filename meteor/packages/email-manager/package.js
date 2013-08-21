Package.describe({
    summary: "Handle emails for code bounty"
});

Package.on_use(function (api) {
    api.add_files("emailManager.js", "server");
});