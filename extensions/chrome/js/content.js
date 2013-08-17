requirejs.config(requirejsConfig);

requirejs(["config", "server", "github", "messenger"],
    function (config, server, github, messenger) {
        var onConnected = function () {
            //subscribe and watch the total reward for this issue
            server.ddp.subscribe("totalReward", [config.issueUrl]);
            server.ddp.watch("totalReward", function (message) {
                github.setBountyAmount(message);
            });
        };

        var onAuthorized = function () {
            server.ddp.call("canPostBounty", [config.issueUrl]).done(function (result) {
                if (result)
                    github.renderPostBounty(5);
            });

            server.ddp.call("canReward", [config.issueUrl]).done(function (result) {
                if (result)
                    github.renderRewardBounty();
            });
        };

        server.connect(onConnected, null, onAuthorized);

        messenger.registerEvent("closeOverlay", github.closeOverlay);
        messenger.registerEvent("bountyRewarded", github.removeRewardButton);
    });