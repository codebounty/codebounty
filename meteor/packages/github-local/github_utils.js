GitHubUtils.Local = {};

GitHubUtils.Local.Logging = {
    onError: (function (err) {
        Fiber(function () {
            TL.error(err, Modules.Github);
        }).run()
    }),
    onSuccess: (function (res, that) {
        Fiber(function () {
            TL.verbose("Remaining requests: "
                + that.remainingRequests, Modules.Github);
        }).run();
    })
};
