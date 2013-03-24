CB.Schedule = (function () {
    var my = {};

//    var cronJob = NodeModules.require("cron").CronJob;

    //TODO
    var initialize = function () {
        //load all the jobs from the database

    };

    /**
     * Schedules a payment to be made one week from now
     * @param bounty
     */
    my.payment = function (bounty) {
        var job = new cronJob(new Date(), function () {
                console.log("A");
                //runs once at the specified date.
            }, function () {
                console.log("B");
                // This function is executed when the job stops
            },
            true);

        job.start();
    };

    initialize();

    return my;
})();