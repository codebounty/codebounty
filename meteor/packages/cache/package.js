Package.describe({
    summary: "Cache images"
});

Npm.depends({
    "aws-sdk": "1.3.1"
});

Package.on_use(function (api) {
    api.add_files("image_cache.js", "server");
});