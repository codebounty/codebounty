Package.describe({
    summary: "Github interactions"
});

Npm.depends({
    "async": "0.2.7",
    "github": "https://github.com/piascikj/node-github-1/tarball/b80e6e290e0c9b977272368fd47233155e5b1c8d"
});

Package.on_use(function (api) {
    api.use('fibers');
    api.use('tools');

    api.add_files('github.js', 'server');
});