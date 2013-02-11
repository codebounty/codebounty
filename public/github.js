//the injected github UI
//located under public so it is not run
//bookmark for testing: javascript:(function(){document.body.appendChild(document.createElement('script')).src='http://localhost:3000/github.js';})()
//when running bookmark need to use this chrome flag --allow-running-insecure-content

var CODEBOUNTY = (function () {
    var my = {};

    my.OpenPopup = function (url) {
        window.open(url, 'window', 'width=480,height=480,scrollbars=yes,status=yes');
    };

    function createBountyButton(amount) {
        var url = window.location.href;
        $("<a href='http://localhost:3000/addBounty?amount=" + amount + "&url=" + encodeURI(url) +
            "' onclick='CODEBOUNTY.OpenPopup(this.href); return false'>Add Bounty</a>")
            .insertAfter(".discussion-stats");
    }

    function setupBountyButtons() {

    }

    my.SetIssueBounty = function (amount) {
        //TODO touchup ui
        $(".state-indicator.open").html("Open $" + amount);
    };

    //static for now
    createBountyButton(500);
    createBountyButton(1000);
    createBountyButton(1500);

    my.SetIssueBounty(35);

    return my;
})();