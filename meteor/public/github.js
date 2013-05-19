//the injected github UI
(function (undefined) {
    var rootUrl = "http://localhost:3000",
        thisIssueUrl = encodeURI(window.location.href);

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
         * Creates the post a bounty button and a numeric up / down (for setting the bounty amount)
         * @param {Number} initValue
         */
        setupPostBounty: function (initValue) {
            ui.render(function () {
                
                var btcSymbol = "\
                    <svg version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px'\
                         viewBox='0 0 273.6 360' enable-background='new 0 0 273.6 360' xml:space='preserve'\
                         id='btcSymbol'>\
                    <g>\
                        <g>\
                            <path fill='#333' d='M217.021,167.042c18.631-9.483,30.288-26.184,27.565-54.007c-3.667-38.023-36.526-50.773-78.006-54.404l-0.008-52.741\
                                h-32.139l-0.009,51.354c-8.456,0-17.076,0.166-25.657,0.338L108.76,5.897l-32.11-0.003l-0.006,52.728\
                                c-6.959,0.142-13.793,0.277-20.466,0.277v-0.156l-44.33-0.018l0.006,34.282c0,0,23.734-0.446,23.343-0.013\
                                c13.013,0.009,17.262,7.559,18.484,14.076l0.01,60.083v84.397c-0.573,4.09-2.984,10.625-12.083,10.637\
                                c0.414,0.364-23.379-0.004-23.379-0.004l-6.375,38.335h41.817c7.792,0.009,15.448,0.13,22.959,0.19l0.028,53.338l32.102,0.009\
                                l-0.009-52.779c8.832,0.18,17.357,0.258,25.684,0.247l-0.009,52.532h32.138l0.018-53.249c54.022-3.1,91.842-16.697,96.544-67.385\
                                C266.916,192.612,247.692,174.396,217.021,167.042z M109.535,95.321c18.126,0,75.132-5.767,75.14,32.064\
                                c-0.008,36.269-56.996,32.032-75.14,32.032V95.321z M109.521,262.447l0.014-70.672c21.778-0.006,90.085-6.261,90.094,35.32\
                                C199.638,266.971,131.313,262.431,109.521,262.447z'/>\
                        </g>\
                    </g>\
                    </svg>";
                
                var currencyToggle = "<div id='currencyToggle' class='toggle-light'></div>";
                $(currencyToggle).insertAfter(ui._container);
                
                var bountyDiv = "" +
                    "<div class='inputWrapper'><label for='bountyInput' class='bountyCurrency'>" +
                    "<span id='usdSymbol'>$</span>" +
                    btcSymbol +
                    "</label>" +
                    "<input id='bountyInput' type='number' value='" + initValue + "' min='0' step='5'/></div>" +
                    "<input id='currencyInput' type='hidden' value='usd' />" + 
                    "<a id='addBounty' class='bountyButton button minibutton bigger' href='#'>" +
                    "Post Bounty" +
                    "</a>";

                $(bountyDiv).insertAfter(ui._container);
                
                
                $("#currencyToggle")
                .on('toggle', function (e, usd) {
                    $("#usdSymbol").toggle(usd);
                    $("#btcSymbol").toggle(!usd);
                    $("#currencyInput").val(usd ? "usd" : "btc");
                })
                .toggles({
                    animate: 0,
                    type: "select", 
                    text: {on: "USD", off: "BTC"},
                    on: true
                });

                $("#addBounty").click(function (e) {
                    //TODO: Input validation.
                    var amount = $("#bountyInput").val();
                    var target = rootUrl + "/createBounty?amount=" + amount + "&url=" + thisIssueUrl;
                    ui.openWindow(target);
                    e.stopPropagation();
                    e.preventDefault();
                });
            }, "setupPostBounty");
        },

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

        /**
         * Initialize the ui (after the user is authenticated)
         */
        initialize: function () {
            ui.setupOverlay();
            ui.setupContainer();

            //watch if the container gets removed / replaced (GitHub does it when a comment is updated)
            //then set it up again
            setInterval(function () {
                if (ui._container.closest("body").length <= 0)
                    ui.setupContainer();
            }, 1000);

            //setup the post bounty button if the user can
            messenger.sendMessage(
                {
                    method: "canPostBounty",
                    params: [thisIssueUrl]
                },
                function (message) {
                    if (message.error)
                        return;

                    if (message.result)
                        ui.setupPostBounty(5);
                }
            );

            //setup the reward button if the user can
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

    events.register("authenticated", function (handle) {
        //only handle authentication event once
        handle();

        ui.initialize();

        //synchronize the total bounty reward for this issue, and show it
        events.register("rewardChanged", function (handle, message) {
            ui.setBountyAmount(message.amount);
        });
    });
})();
