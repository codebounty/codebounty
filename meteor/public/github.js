//the injected github UI
//isolated: all code / styles required for the extension should be in this file

//bookmark for testing: javascript:(function(){document.body.appendChild(document.createElement("script")).src="https://localhost/meteor/public/github.js";})()

var CODEBOUNTY = (function (undefined) {
    var my = {}, rootUrl = "http://localhost:3000", thisIssueUrl = encodeURI(window.location.href);

    //region Messenger

    var messengerIFrame, messengerIFrameLoaded = false, messageId = 0,
    //any messages that haven't been sent yet because the iframe hasn't loaded yet
        messageQueue = [],
    //callbacks listed by their message id
        messageCallbacks = [], eventRegistry = [];

    var messenger = {
        initialize: function () {
            messengerIFrame = document.createElement("iframe");
            messengerIFrame.style.display = "none";
            messengerIFrame.src = rootUrl + "/messenger?url=" + thisIssueUrl;

            //when the iframe is ready clear and send the message queue
            messengerIFrame.onload = function () {
                var queueLength = messageQueue.length;

                for (var i = 0; i < queueLength; i++)
                    messenger.post(messageQueue.shift());

                messengerIFrameLoaded = true;
            };
            document.body.appendChild(messengerIFrame);

            window.addEventListener("message", function (evt) {
                if (evt.origin !== rootUrl)
                    return;

                //if the message has an id, find the stored callback
                if (typeof evt.data.id !== "undefined") {
                    var callback = messageCallbacks[evt.data.id];
                    if (callback)
                        callback(evt.data);
                }
                //if the message has a registered event, trigger it's callback function
                else if (evt.data.event) {
                    var eventCallback = eventRegistry[evt.data.event];
                    if (eventCallback) {
                        //pass a function (handle) to stop the listener and the message
                        eventCallback(function () {
                            delete eventRegistry[evt.data.event];
                        }, evt.data);
                    }
                }
            }, false);
        },
        //internal function to do a postMessage
        post: function (message) {
            messengerIFrame.contentWindow.postMessage(message, rootUrl + "/");
        },
        /**
         * Communicates with the codebounty app (inside the hidden iframe)
         * @param message the only message type is one that calls Meteor.call: { method: "methodToCall", params: ["paramOne", "paramTwo"] }
         * @param {Function} callback returns the param (message) which has properties {error, result}
         */
        sendMessage: function (message, callback) {
            messageCallbacks[messageId] = callback;

            message.id = messageId;

            if (messengerIFrameLoaded)
                messenger.post(message);
            else
                messageQueue.push(message);

            messageId++;
        },
        /**
         * Register a codebounty app event
         * @param event the event to register ex. "close"
         * @param {Function} callback returns the param (message)
         */
        registerEvent: function (event, callback) {
            eventRegistry[event] = callback;
        }
    };

    //endregion

    var ui = {
        setupStyles: function () {
            //Inject css
            var link = document.createElement("link");
            link.href = "https://localhost/meteor/public/codebounty.css";
            link.type = "text/css";
            link.rel = "stylesheet";
            document.getElementsByTagName("head")[0].appendChild(link);
        },
        setupOverlay: function () {
            var overlayDiv = "" +
                "<div id='block'></div>" +
                "<div id='iframecontainer'>" +
                "<div id='loader'></div>" +
                "<iframe></iframe>" +
                "</div>";

            $(overlayDiv).insertBefore(document.body);
        },

        openWindow: function (url) {
            window.open(url, "window", "width=1000,height=650,status=yes");
        },

        openOverlay: function (url) {
            var container = $("#iframecontainer"), iFrame = container.find("iframe");
            iFrame.attr("src", url);
            $("#block").fadeIn();
            container.fadeIn();

            iFrame.load(function () {
                $("#loader").fadeOut(function () {
                    iFrame.fadeIn();
                });
            });
        },

        closeOverlay: function () {
            var container = $("#iframecontainer"), iFrame = container.find("iframe");
            iFrame.attr("src", "about:blank");
            iFrame.fadeOut();
            container.fadeOut();
            $("#block").fadeOut();
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
                ui.openWindow(target);
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
                ui.openOverlay(target);
                e.stopPropagation();
                e.preventDefault();
            });
        },

        initialize: function () {
            ui.setupStyles();
            ui.setupOverlay();
            ui.setupAddBounty(5);

            //check if the user can reward and setup the reward button if they can
            messenger.sendMessage(
                {
                    method: "canReward",
                    params: [thisIssueUrl]
                },
                function (message) {
                    if (message.error)
                        return;

                    if (message.result)
                        ui.setupRewardBounty();
                }
            );
        }
    };

    messenger.initialize();
    messenger.registerEvent("closeOverlay", ui.closeOverlay);

    messenger.registerEvent("authorized", function (handle) {
        //only handle authorization once
        handle();

        //synchronize the total bounty reward for this issue, and show it
        messenger.registerEvent("rewardChanged", function (handle, message) {
            if (!message.amount)
                return;

            ui.setBountyAmount(message.amount);
        });

        ui.initialize();
    });

    return my;
})();