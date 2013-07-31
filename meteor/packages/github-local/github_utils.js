GitHubUtils.Local = {};

GitHubUtils.Local.Logging = {
    onError: (function (err) {
        TL.error(err, Modules.Github);
        }),
    onSuccess: (function (res, that) {
            TL.verbose("Remaining requests: "
                + that.remainingRequests, Modules.Github);
        })
};
