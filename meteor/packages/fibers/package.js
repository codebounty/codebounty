Package.describe({
    summary: "Meteor smart package for Fibers"
});

Package.on_use(function (api) {
    api.add_files('fibers.js', 'server');
});