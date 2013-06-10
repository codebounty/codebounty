Package.describe({
    summary: "noUiSlider packaged for meteor."
});

Package.on_use(function (api) {
    api.use("jquery", "client");
    api.add_files([
        "jquery.noUiSlider.js",
        "nouislider.fox.css"
    ], "client");
});