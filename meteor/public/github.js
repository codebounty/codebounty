//the injected github UI
//isolated: all code / styles required for the extension should be in this file

//bookmark for testing: javascript:(function(){document.body.appendChild(document.createElement("script")).src="https://localhost/meteor/public/github.js";})()

var CODEBOUNTY = (function (undefined) {
    var my = {}, rootUrl = "http://localhost:3000", thisIssueUrl = encodeURI(window.location.href);

    //region Messenger

    var events = {
        //where the callbacks are stored
        _registry: [],
        //store messages until callbacks are associated
        _mailbox: [],
        //get the event callback
        _callback: function (name) {
            var callback = events._registry[name];
            return callback;
        },
        /**
         * Trigger the callback for an event
         * @param name The event name
         * @param message
         * @returns {Boolean} whether there is a registered callback
         */
        _triggerCallback: function (name, message) {
            var callback = events._callback(name);

            if (!callback)
                return false;

            //pass a function (handle) to stop the listener and the message
            callback(function () {
                delete events._registry[name];
            }, message);

            return true;
        },

        /**
         * Called when an event message is received
         * @param name
         * @param message
         */
        received: function (name, message) {
            if (!events._triggerCallback(name, message)) {
                var mailbox = events._mailbox[name];
                if (!mailbox)
                    events._mailbox[name] = mailbox = [];

                mailbox.push(message);
            }
        },

        /**
         * Register a codebounty app event
         * and check the mailbox for that event to see if there are already any messages
         * @param name the event to register ex. "close"
         * @param {Function} callback returns the param (message)
         */
        register: function (name, callback) {
            events._registry[name] = callback;

            //check the mailbox
            var mailbox = events._mailbox[name];
            if (mailbox) {
                mailbox.forEach(function (message) {
                    events._triggerCallback(name, message);
                });

                delete events._mailbox[name];
            }
        }
    };

    var messengerIFrame, messengerIFrameLoaded = false, messageId = 0,
    //any messages that haven't been sent yet because the iframe hasn't loaded yet
        messageQueue = [],
    //callbacks listed by their message id
        messageCallbacks = [];

    var messenger = {
        //internal function to do a postMessage
        _post: function (message) {
            messengerIFrame.contentWindow.postMessage(message, rootUrl + "/");
        },
        initialize: function () {
            var that = this;
            messengerIFrame = document.createElement("iframe");
            messengerIFrame.style.display = "none";
            messengerIFrame.src = rootUrl + "/messenger?url=" + thisIssueUrl;

            //when the iframe is ready clear and send the message queue
            messengerIFrame.onload = function () {
                var queueLength = messageQueue.length;

                for (var i = 0; i < queueLength; i++)
                    messenger._post(messageQueue.shift());

                messengerIFrameLoaded = true;
            };
            document.body.appendChild(messengerIFrame);

            window.addEventListener("message", function (evt) {
                if (evt.origin !== rootUrl)
                    return;

                var message = evt.data;

                //if the message has an id, find the stored callback
                if (typeof message.id !== "undefined") {
                    var callback = messageCallbacks[evt.data.id];
                    if (callback)
                        callback(message);
                }
                //if the message has an event, trigger events received
                else if (message.event)
                    events.received(message.event, message);
            }, false);
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
                messenger._post(message);
            else
                messageQueue.push(message);

            messageId++;
        }
    };

    //endregion

    var ui = {
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

        _renderFunctions: [],
        /**
         * Stores changes to the code bounty container
         * so they can be reapplied when GitHub removes it (when a comment changes)
         * then invokes the function
         * @param func Render function to store / run that affects the container
         * @param [tag] If there is a tag, it will only store the latest of this tag
         */
        render: function (func, tag) {
            //if there is a tag, remove any render functions with the same tag
            if (typeof tag !== "undefined" && tag !== null)
                ui._renderFunctions = ui._renderFunctions.filter(function (renderObject) {
                    return renderObject.tag !== tag
                });

            ui._renderFunctions.push({tag: tag, render: func});

            //run the function
            func();
        },

        _container: null,
        /**
         * Inject the code bounty element and re-render any changes
         */
        setupContainer: function () {
            ui._container = $("<div id='codeBountyContainer'></div>");
            ui._container.insertAfter(".discussion-stats .state-indicator");

            //go through and run the render functions
            ui._renderFunctions.forEach(function (renderFunction) {
                renderFunction.render();
            });
        },

        /**
         * Creates the add a bounty button and a numeric up / down (for setting the bounty amount)
         * @param {Number} initValue
         */
        setupAddBounty: function (initValue) {
            ui.render(function () {
                var bountyDiv = "" +
                    "<div class='inputWrapper'><label for='bountyInput' class='bountyCurrency'>$</label>" +
                    "<input id='bountyInput' type='number' value='" + initValue + "' min='0' step='5'/></div>" +
                    "<a id='addBounty' class='bountyButton button minibutton bigger' href='#'>" +
                    "Place Bounty" +
                    "</a>";

                $(bountyDiv).insertAfter(ui._container);

                $("#addBounty").click(function (e) {
                    //TODO: Input validation.
                    var amount = $("#bountyInput").val();
                    var target = rootUrl + "/createBounty?amount=" + amount + "&url=" + thisIssueUrl;
                    ui.openWindow(target);
                    e.stopPropagation();
                    e.preventDefault();
                });
            }, "setupAddBounty");
        },

        /**
         * Sets up the reward button
         */
        setupRewardBounty: function () {
            ui.render(function () {
                var bountyDiv = "" +
                    "<a id='rewardBounty' class='bountyButton button minibutton bigger' style='text-align: center' href='#'>" +
                    "Reward" +
                    "</a>";

                $(bountyDiv).insertAfter(ui._container);

                $("#rewardBounty").click(function (e) {
                    var target = rootUrl + "/rewardBounty?url=" + thisIssueUrl;
                    ui.openOverlay(target);
                    e.stopPropagation();
                    e.preventDefault();
                });
            }, "setupRewardBounty");
        },

        removeRewardButton: function () {
            $("#rewardBounty").remove();
        },

        /**
         * Sets how much the total bounty is
         * @param amount
         */
        setBountyAmount: function (amount) {
            ui.render(function () {
                $(".state-indicator.open").html("Open $" + amount);
            }, "setBountyAmount");
        },

        initialize: function () {
            ui.setupOverlay();

            ui.setupContainer();

            //watch if the container gets removed / replaced (GitHub does it when a comment is updated)
            //then set it up again
            setInterval(function () {
                if (ui._container.closest('body').length <= 0)
                    ui.setupContainer();
            }, 1000);

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
    events.register("closeOverlay", ui.closeOverlay);
    events.register("bountyRewarded", ui.removeRewardButton);

    events.register("authorized", function (handle) {
        //only handle authorization event once
        handle();

        //synchronize the total bounty reward for this issue, and show it
        events.register("rewardChanged", function (handle, message) {
            ui.setBountyAmount(message.amount);
        });

        ui.initialize();
    });

    return my;
})();