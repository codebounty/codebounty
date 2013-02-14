//the injected github UI. should be isolated, all code required should fix in this file
//TODO replace bookmark w Chrome Extension
//bookmark for testing: javascript:(function(){document.body.appendChild(document.createElement('script')).src='http://localhost:3000/github.js';})()
//bookmark needs this chrome flag --allow-running-insecure-content

var CODEBOUNTY = (function () {
    var my = {};

    function createBountyButton(initValue) {
        //TODO: make style classes
        /*github style*/
        var style = "" +
        ".bountyButton {" +
            "box-sizing: border-box;" +
            "-moz-box-sizing: border-box;" +
            "-webkit-box-sizing: border-box;" +
            "margin-bottom: 8px;" +
            "width: 100%;" +
            "overflow: hidden;" +
            /*"display: block;"+
            "text-align: center;"+
            "padding: 7px 10px;"+
            "margin-bottom: 8px;"+
            "background: #6cc644;"+
            "color: #fff;"+
            "text-decoration: none;"+
            "font-weight: bold;"+
            "-webkit-border-radius: 3px;"+
            "-moz-border-radius: 3px;"+
            "border-radius: 3px;"+*/
        "}" +
        ".bountyCurrency {" +
            "position: absolute;" +
            "font-size: 18px;" +
            "font-weight: bold;" +
            "padding-top: 2px;" +
            "padding-left: 7px;" +
            "pointer-events: none;"+
        "}"+
        "#bountyInput {" +
            "margin-bottom: 8px;" +
            "width: 100%;" +
            "text-align: center;" +
            "font-weight: bold;" +
            "font-size: 18px;" +
            "-moz-box-sizing: border-box;" +
            "-webkit-box-sizing: border-box;" +
            "box-sizing: border-box;" +
            "padding-left: 20px;"+
        "}";
        var customStyles = document.createElement('style');
        customStyles.appendChild(document.createTextNode(style));
        document.body.appendChild(customStyles);
        /*var link = document.createElement('link');
        link.href =  "http://localhost:3000/codebounty.css";
        link.rel = 'stylesheet';
        document.documentElement.insertBefore(link);*/

        var bountyDiv = "" +
            "<label for='bountyInput' class='bountyCurrency'>$</label>" +
            "<input id='bountyInput' type='number' value='"+initValue+"' min='0' step='5'/>" +
            "<a class='bountyButton button minibutton bigger' href='#'>"+
                "Place Bounty"+
            "</a>";

        $(bountyDiv).insertAfter(".discussion-stats .state-indicator");
        var $bountyButton = $(".bountyButton");
        $bountyButton.click(function(e){
            //TODO: Maybe encodeURIComponent
            var url = encodeURI(window.location.href);
            //TODO: Input validation.
            var amount = $("#bountyInput").val();
            var target = "http://localhost:3000/processBounty?amount=" + amount + "&url=" + url;
            CODEBOUNTY.OpenPopup(target);
            e.stopPropagation();
            e.preventDefault();
        });
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
        window.open(url, 'window', 'width=1000,height=650,status=yes');
    };

    createBountyButton(5);
    setIssueBounty(35);
    setupReward();

    return my;
})();