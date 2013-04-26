Package.describe({
    summary: "Authentication utilities"
});

Package.on_use(function (api) {
    api.add_files('auth_utils.js', ['client']);
});