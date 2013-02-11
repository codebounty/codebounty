//the injected github UI. should be isolated, all code required should fix in this file
//TODO replace bookmark w Chrome Extension
//bookmark for testing: javascript:(function(){document.body.appendChild(document.createElement('script')).src='http://localhost:3000/github.js';})()
//bookmark needs this chrome flag --allow-running-insecure-content

var CODEBOUNTY = (function () {
    var my = {};

    function createBountyButton(amount) {
        var url = window.location.href;
        $("<a href='http://localhost:3000/processBounty?amount=" + amount + "&url=" + encodeURI(url) +
            "' onclick='CODEBOUNTY.OpenPopup(this.href); return false'>$" + amount + "</a>")
            .insertAfter(".discussion-stats");
    }

    function setIssueBounty(amount) {
        //TODO touchup ui
        $(".state-indicator.open").html("Open $" + amount);
    }

    function setupReward() {
        //TODO make this work when the button gets regenerated (the issue is reopened)
        $("button[name='comment_and_close']").click(function () {
            var reward = confirm("Would you like to reward the bounty?");
            if (reward) {
                //TODO trigger reward (make sure currently logged in user can reward)
            }
        });

        //TODO on reopen, ask to postpone bounty?
    }

    my.OpenPopup = function (url) {
        window.open(url, 'window', 'width=480,height=480,scrollbars=yes,status=yes');
    };

    //static for now
    createBountyButton(15);
    createBountyButton(10);
    createBountyButton(5);
    setIssueBounty(35);
    setupReward();

    return my;
})();