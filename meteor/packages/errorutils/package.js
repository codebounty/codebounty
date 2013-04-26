Package.describe({
    summary: "Errors utilities"
});

Package.on_use(function (api) {
    api.add_files('error_utils.js', ['client', 'server']);
});