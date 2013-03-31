//contains all scheduling logic

CB.Schedule = (function () {
    var my = {};

    var cronJob = NodeModules.require("cron").CronJob;

    //load all the jobs from the database
    var initialize = function () {
        //TODO change this to be smart, and do a collection observechanges instead
        CB.Bounty.ReschedulePayments();
    };

    //schedule a function to run on the passed date
    my.On = function (date, func) {
        new cronJob(date,
            function () {
                //run function in the fiber
                Fiber(function () {
                    func();
                }).run()
            }, null, true);
    };

    Meteor.startup(function () {
        initialize();
    });

    return my;
})();