Environment = {
    isLocal: Meteor.settings.public.environment === "local",
    isQa: Meteor.settings.public.environment === "qa",
    isProduction: Meteor.settings.public.environment === "production"
};