Package.describe({
    summary: "Meteor smart package for canvas node.js package"
});

Npm.depends({
    "canvas": "1.0.2"
});

Package.on_use(function (api) {
    api.add_files("canvas.js", "server");
});