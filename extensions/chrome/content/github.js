//the injected github UI
(function (undefined) {
    var rootUrl = "/* @echo ROOTURL */",
        thisIssueUrl = encodeURI(window.location.href);

    //region Messenger

    var events = {
        //where the callbacks are stored
        _registry: [],

        /**
         * Called when an event message is received
         * @param name
         * @param message
         */
        received: function (name, message) {
            //get the event callback
            var callback = events._registry[name];
            if (!callback)
                return;

            //pass a function (handle) to stop the listener and the message
            callback(function () {
                delete events._registry[name];
            }, message);
        },

        /**
         * Register a codebounty app event
         * and check the mailbox for that event to see if there are already any messages
         * @param name the event to register ex. "close"
         * @param {Function} callback returns the param (message)
         */
        register: function (name, callback) {
            events._registry[name] = callback;
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
                "<iframe id='overlayIframe'></iframe>" +
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
                    return renderObject.tag !== tag;
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
        },

        _validateInput: function (currency) {
            var valid = false;

            var inputVal = $("#bountyInput").val();

            //there is not input
            if (currency === "btc")
                valid = true;
            else if (currency !== "usd" || !inputVal)
                valid = false;
            else {
                var value = parseFloat(inputVal);
                valid = value % 1 === 0 && value >= 5;
            }

            if (valid)
                ui.enablePostBounty();
            else
                ui.disablePostBounty();

            return valid;
        },
        /**
         * Creates the post a bounty button and a numeric up / down (for setting the bounty amount)
         * @param {number} initValue
         */
        setupPostBounty: function (initValue) {
            ui.render(function () {
                var currencyToggle = "<div id='currencyToggle' class='toggle-github'></div>";

                var $usdDiv = $("" +
                    "<div class='inputWrapper'><label for='bountyInput' class='bountyCurrency'>" +
                    "<span class='usd currencySymbol'>$</span>" +
                    "</label><input id='bountyInput' type='number' value='" + initValue + "' min='5' step='1'/></div>" +
                    "<input id='currencyInput' type='hidden' value='usd' />" +
                    "<a id='postBounty' class='bountyButton button minibutton bigger' href='#'>" +
                    "Post Bounty" +
                    "</a>");

                $usdDiv.insertAfter(ui._container);
                $(currencyToggle).insertBefore(".discussion-stats .inputWrapper");

                $("#currencyToggle")
                    .on("toggle", function (e, usd) {
                        var currency = usd ? "usd" : "btc";
                        $("#currencyInput").val(currency);

                        $(".btc.currencySymbol").toggle(!usd);
                        $(".usd.currencySymbol").toggle(usd);
                        $(".inputWrapper").toggle(usd);

                        ui._validateInput(currency);
                    })
                    .toggles({
                        animate: 0,
                        type: "select",
                        text: {on: "USD", off: "BTC"},
                        on: true
                    });

                $("#postBounty").click(function (e) {
                    e.stopPropagation();
                    e.preventDefault();

                    var amount = $("#bountyInput").val();
                    var currency = $("#currencyInput").val();
                    if (!ui._validateInput(currency))
                        return;

                    var target = rootUrl + "/addFunds?amount=" + amount + "&currency=" + currency + "&url=" + thisIssueUrl;
                    ui.openWindow(target);
                });

                $("#bountyInput").keyup(function () {
                    var amountUsd = $("#bountyInput").val();
                    if (!ui._validateInput("usd"))
                        return;

                    ui.enablePostBounty();
                    ui.changeBountyStatusIcon(amountUsd);
                });
            }, "setupPostBounty");
        },

        disablePostBounty: function () {
            if (!($("#postBounty").hasClass("disabled")))
                $("#postBounty").addClass("disabled");
        },

        enablePostBounty: function () {
            if ($("#postBounty").hasClass("disabled"))
                $("#postBounty").removeClass("disabled");
        },

        setupRewardBounty: function () {
            ui.render(function () {
                var bountyDiv = "" +
                    "<a id='rewardBounty' class='bountyButton button minibutton bigger' style='text-align: center' href='#'>" +
                    "Reward" +
                    "</a>";

                $(bountyDiv).insertAfter(ui._container);

                $("#rewardBounty").click(function (e) {
                    var target = rootUrl + "/reward?url=" + thisIssueUrl;
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
         * @param {{btc: string, usd: string}} amount
         */
        setBountyAmount: function (amount) {
            ui.render(function () {
                var text = "Open $" + amount.usd;

                if (amount.btc > 0) {
                    text += " + " + amount.btc.substr(0, 4) + " BTC";
                }

                $(".state-indicator.open").html(text);
            }, "setBountyAmount");
        },

        /**
         * @param amount (In USD, cannot choose BTC amount here)
         */
        changeBountyStatusIcon: function () {
            var getCashLevel = function (amount) {
                if (amount < 20)
                    return 0;
                else if (20 <= amount && amount < 50)
                    return 1;
                else if (50 <= amount && amount < 100)
                    return 2;
                else if (100 <= amount && amount < 250)
                    return 3;
                else
                    return 4;
            };
            var statusClasses = {
                "0": "statusCoins",
                "1": "statusMoneybag",
                "2": "statusMoneybags",
                "3": "statusBars",
                "4": "statusJackpot"
            };
            return function (amount) {
                var cashLevel = getCashLevel(amount);
                var statusClass = statusClasses[cashLevel];
                var statusIcon = $("#statusIcon");

                if (statusIcon.length) {
                    if (statusIcon.attr("cashLevel") !== cashLevel) {
                        statusIcon.attr("class", statusClass);
                        statusIcon.attr("cashLevel", cashLevel);
                    }
                } else {
                    var statusIconSrc = "" +
                        "<img id='statusIcon' class='" + statusClass + "' " +
                        "width=100 height=100 cashLevel=" + cashLevel +
                        ">";
                    $(statusIconSrc).insertBefore($("#postBounty"));
                }
            };
        }(),

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

                    if (message.result) {
                        ui.setupPostBounty(5);
                        ui.changeBountyStatusIcon(5);
                    }
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

    events.register("closeOverlay", ui.closeOverlay);
    events.register("bountyRewarded", ui.removeRewardButton);
    //synchronize the total bounty reward for this issue, and show it
    events.register("rewardChanged", function (handle, message) {
        ui.setBountyAmount(message);
    });

    messenger.initialize();

    events.register("authenticated", function (handle) {
        //only initialize once
        handle();

        ui.initialize();
    });
})();
