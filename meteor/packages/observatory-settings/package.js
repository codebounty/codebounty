Package.describe({
    summary: "Settings for the observatory logging and monitoring package"
});

Package.on_use(function (api) {
    api.use('coffeescript', ['client', 'server']);

    api.add_files('ObservatorySettings.js', ['client', 'server']);
});