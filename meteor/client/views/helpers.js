Handlebars.registerHelper("active", function(url) {
    return Tools.endsWith(window.url(), url) ? "active" : "";
});