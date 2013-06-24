Handlebars.registerHelper("active", function(url) {
    return Tools.endsWith(window.url(), url) ? "active" : "";
});

Handlebars.registerHelper("isAdmin", function() {
    return AuthUtils.isAdmin(Meteor.user());
});