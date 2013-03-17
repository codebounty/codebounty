//the injected github UI
//isolated: all code / styles required for the extension should be in this file

//TODO replace bookmark w Chrome Extension
//bookmark for testing: javascript:(function(){document.body.appendChild(document.createElement("script")).src="https://localhost/meteor/public/github.js";})()

var CODEBOUNTY = (function (undefined) {
    var my = {}, rootUrl = "http://localhost:3000", thisIssueUrl = encodeURI(window.location.href);

    //region Messenger

    var iframe, iframeLoaded = false, messageId = 0,
    //any messages that haven't been sent yet because the iframe hasn't loaded yet
        payloadQueue = [],
    //callbacks listed by their message id
        messageCallbacks = [];

    var messenger = {
        initialize: function () {
            iframe = document.createElement("iframe");
            iframe.style.display = "none";
            iframe.src = rootUrl + "/messenger";

            //when the iframe is ready clear and send the payload queue
            iframe.onload = function () {
                var payloadLength = payloadQueue.length;

                for (var i = 0; i < payloadLength; i++)
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

    //endregion

    var ui = {
        addStyles: function () {
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
                ".inputWrapper {" +
                "position: relative;" +
                "}" +
                ".bountyCurrency {" +
                "position: absolute;" +
                "font-size: 18px;" +
                "font-weight: bold;" +
                "padding-top: 8px;" +
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
        },

        openPopup: function (url) {
            window.open(url, "window", "width=1000,height=650,status=yes");
        },

        /**
         * Sets how much the total bounty is
         * @param amount
         */
        setBountyAmount: function (amount) {
            $(".state-indicator.open").html("Open $" + amount);
        },

        /**
         * Creates the add a bounty button and a numeric up / down (for setting the bounty amount)
         * @param {Number} initValue
         */
        setupAddBounty: function (initValue) {
            var bountyDiv = "" +
                "<div class='inputWrapper'><label for='bountyInput' class='bountyCurrency'>$</label>" +
                "<input id='bountyInput' type='number' value='" + initValue + "' min='0' step='5'/></div>" +
                "<a id='addBounty' class='bountyButton button minibutton bigger' href='#'>" +
                "Place Bounty" +
                "</a>";

            $(bountyDiv).insertAfter(".discussion-stats .state-indicator");

            $("#addBounty").click(function (e) {
                //TODO: Input validation.
                var amount = $("#bountyInput").val();
                var target = rootUrl + "/createBounty?amount=" + amount + "&url=" + thisIssueUrl;
                ui.openPopup(target);
                e.stopPropagation();
                e.preventDefault();
            });
        },

        /**
         * Sets up the reward button
         */
        setupRewardBounty: function () {
            var bountyDiv = "" +
                "<a id='rewardBounty' class='bountyButton button minibutton bigger' style='text-align: center' href='#'>" +
                "Reward" +
                "</a>";

            $(bountyDiv).insertAfter(".discussion-stats .state-indicator");

            $("#rewardBounty").click(function (e) {
                var target = rootUrl + "/rewardBounty?url=" + thisIssueUrl;
                ui.openPopup(target);
                e.stopPropagation();
                e.preventDefault();
            });
        },

        initialize: function () {
            ui.addStyles();
            ui.setupAddBounty(5);

            //find the total bounty reward for this issue, and show it
            messenger.sendMessage(
                {
                    method: "totalReward",
                    params: [thisIssueUrl]
                },
                function (message) {
                    if (message.error)
                        return;

                    ui.setBountyAmount(message.result);
                }
            );

            //check if the user can reward and setup the reward button if they can
                messenger.sendMessage(
                    {
                        method: "canReward",
                        params: [thisIssueUrl]
                    },
                    function (message) {
                        if (message.error)
                            return;

                        ui.setupRewardBounty();
                    }
                );
        }
    };

    messenger.initialize();
    ui.initialize();

    return my;
})();