//the injected github UI
//located under public so it is not run
//bookmark for testing: javascript:(function(){document.body.appendChild(document.createElement('script')).src='http://localhost:3000/github.js';})()
//when running bookmark need to use this chrome flag --allow-running-insecure-content

var CODEBOUNTY = (function () {
    var my = {};

    my.SetIssueBounty = function (amount) {
        //TODO touchup ui
        $("<a>Add Bounty</a>").insertAfter(".discussion-stats");
        $(".state-indicator.open").html("Open $" + amount);
    };

    my.Loaded = function () {
        //TODO checking the current page url and set up the proper issue bounty

    };

    //static for now
    my.SetIssueBounty(35);

    return my;
})();