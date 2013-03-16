//the injected github UI
//isolated: all code / styles required for the extension should be in this file

//TODO replace bookmark w Chrome Extension
//bookmark for testing: javascript:(function(){document.body.appendChild(document.createElement("script")).src="https://localhost/meteor/public/github.js";})()

var CODEBOUNTY = (function (undefined) {
    var my = {}, rootUrl = "http://localhost:3000", thisIssueUrl = encodeURI(window.location.href);

    my.OpenPopup = function (url) {
        window.open(url, "window", "width=1000,height=650,status=yes");
    };

    var messenger, iframe, iframeLoaded = false, messageId = 0,
    //any messages that haven't been sent yet because the iframe hasn't loaded yet
        payloadQueue = [],
    //callbacks listed by their message id
        messageCallbacks = [];

    messenger = {
        setup: function () {
            iframe = document.createElement("iframe");
            iframe.style.display = "none";
            iframe.src = rootUrl + "/messenger";

            //when the iframe is ready clear and send the payload queue
            iframe.onload = function () {
                for (var i = 0; i < payloadQueue.length; i++)
                    messenger.post(payloadQueue.shift());

                iframeLoaded = true;
            };
            document.body.appendChild(iframe);

            window.addEventListener("message", function (evt) {
                if (evt.origin !== rootUrl)
                    return;

                var callback = messageCallbacks[evt.data.id];
                if (callback)
                    callback(evt.data.message);
            }, false);
        },
        //internal function to do a postMessage
        //a payload is just message and an id { id: messageId, message: message }
        post: function (payload) {
            iframe.contentWindow.postMessage(payload, rootUrl + "/");
        },
        /**
         * Communicates with the codebounty app (inside the hidden iframe)
         * @param message the only message type is one that calls Meteor.call: { method: "methodToCall", params: ["paramOne", "paramTwo"] }
         * @param {Function} callback returns the param (message) which has properties {error, result}
         */
        sendMessage: function (message, callback) {
            messageCallbacks[messageId] = callback;

            if (iframeLoaded)
                messenger.post({id: messageId, message: message});
            else
                payloadQueue.push({id: messageId, message: message});

            messageId++;
        }
    };

    /**
     * Creates the add a bounty button
     * @param {Number} initValue
     */
    function createAddBountyButton(initValue) {
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
            "pointer-events: none;" +
            "}" +
            "#bountyInput {" +
            "margin-bottom: 8px;" +
            "width: 100%;" +
            "text-align: center;" +
            "font-weight: bold;" +
            "font-size: 18px;" +
            "-moz-box-sizing: border-box;" +
            "-webkit-box-sizing: border-box;" +
            "box-sizing: border-box;" +
            "padding-left: 20px;" +
            "}";
        var customStyles = document.createElement("style");
        customStyles.appendChild(document.createTextNode(style));
        document.body.appendChild(customStyles);
        /*var link = document.createElement("link");
         link.href =  "http://localhost:3000/codebounty.css";
         link.rel = "stylesheet";
         document.documentElement.insertBefore(link);*/

        var bountyDiv = "" +
            "<label for='bountyInput' class='bountyCurrency'>$</label>" +
            "<input id='bountyInput' type='number' value='" + initValue + "' min='0' step='5'/>" +
            "<a class='bountyButton button minibutton bigger' href='#'>" +
            "Place Bounty" +
            "</a>";

        $(bountyDiv).insertAfter(".discussion-stats .state-indicator");
        var $bountyButton = $(".bountyButton");
        $bountyButton.click(function (e) {
            //TODO: Maybe encodeURIComponent
            var url = encodeURI(window.location.href);
            //TODO: Input validation.
            var amount = $("#bountyInput").val();
            var target = rootUrl + "/createBounty?amount=" + amount + "&url=" + url;
            CODEBOUNTY.OpenPopup(target);
            e.stopPropagation();
            e.preventDefault();
        });
    }

    /**
     * Sets how much the total bounty is
     * @param amount
     */
    function setBountyAmount(amount) {
        //TODO touchup ui
        $(".state-indicator.open").html("Open $" + amount);
    }

    /**
     * Sets up the reward button
     */
    function createRewardButton() {
        //TODO make this work when the button gets regenerated (the issue is reopened)
        $("button[name='comment_and_close']").click(function () {
            var reward = confirm("Would you like to reward the bounty?");
            if (reward) {
                //TODO trigger reward (make sure currently logged in user can reward)
            }
        });

        //TODO on reopen, ask to postpone bounty?
    }

    messenger.setup();

    createAddBountyButton(5);

    window.sendMessage = messenger.sendMessage;

    //find the total bounty reward for this issue, and show it
    messenger.sendMessage(
        {
            method: "totalReward",
            params: [thisIssueUrl]
        },
        function (message) {
            if (message.error)
                return;

            setBountyAmount(message.result);
        }
    );

    //check if the user can reward
    //and setup the reward button if they can
//    sendMessage({
//        method: "canReward",
//        params: [target]
//    }, function (callback) {

    return my;
})();