define(["config"], function (config) {
    var renderFunctions = [],
        container = null,
        github = {};  //this is the module that we will export

    /**
     * Stores DOM changes to the code bounty container
     * so they can be reapplied when GitHub removes it (when a comment changes)
     * then invokes the function
     * @param func Render function to store / run that affects the container
     * @param [tag] If there is a tag, it will only store the latest of this tag
     */
    function render(func, tag) {
        //if there is a tag, remove any render functions with the same tag
        if (typeof tag !== "undefined" && tag !== null)
            renderFunctions = renderFunctions.filter(function (renderObject) {
                return renderObject.tag !== tag;
            });

        renderFunctions.push({tag: tag, render: func});

        //run the function
        func();
    }

    /**
     * Inject the code bounty element and re-render any changes
     */
    function renderContainer() {
        container = $("<div id='codeBountyContainer'></div>");
        container.insertAfter(".discussion-stats .state-indicator");

        //TODO re-render any renderFunctions
    }

    renderContainer();

    //watch if the container gets removed / replaced (GitHub does it when a comment is updated)
    //then set it up again
    setInterval(function () {
        if (container.closest("body").length <= 0)
            renderContainer();
    }, 1000);

    //--------------------- issue status ------------------------

    /**
     * Sets how much the total bounty is
     * @param {{btc: string, usd: string}} amount
     */
    github.setBountyAmount = function (amount) {
        render(function () {
            var text = "Open $" + amount.usd;

            if (amount.btc > 0)
                text += " + " + amount.btc.substr(0, 4) + " BTC";

            $(".state-indicator.open").html(text);
        }, "setBountyAmount");
    };

    //--------------------- post bounty ------------------------

    function enablePostBounty(enable) {
        var hasDisabledClass = $("#postBounty").hasClass("disabled");

        if (enable && hasDisabledClass)
            $("#postBounty").removeClass("disabled");
        else if (!enable && !hasDisabledClass)
            $("#postBounty").addClass("disabled");
    }

    /**
     * Check if the input is valid for the currency
     * then enable or disable the post bounty button
     * @param currency
     * @returns {boolean}
     */
    function validatePostBountyInput(currency) {
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

        enablePostBounty(valid);

        return valid;
    }

    var statusClasses = {
            "0": "statusCoins",
            "1": "statusMoneybag",
            "2": "statusMoneybags",
            "3": "statusBars",
            "4": "statusJackpot"
        },
        getCashLevel = function (amount) {
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

    /**
     * Changes the status image for posting a bounty based on the amount
     */
    function updateBountyStatusIcon() {
        var amountUsd = $("#bountyInput").val();

        var cashLevel = getCashLevel(amountUsd);
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
    }

    github.renderPostBounty = function (initialAmount) {
        /**
         * Creates the post a bounty button and a numeric up / down (for setting the bounty amount)
         * @param {number} initialAmount
         */
        render(function () {
            var currencyToggle = "<div id='currencyToggle' class='toggle-github'></div>";

            var $usdDiv = $("" +
                "<div class='inputWrapper'><label for='bountyInput' class='bountyCurrency'>" +
                "<span class='usd currencySymbol'>$</span>" +
                "</label><input id='bountyInput' type='number' value='" + initialAmount + "' min='5' step='1'/></div>" +
                "<input id='currencyInput' type='hidden' value='usd' />" +
                "<a id='postBounty' class='bountyButton button minibutton bigger' href='#'>" +
                "Post Bounty" +
                "</a>");

            $usdDiv.insertAfter(container);
            $(currencyToggle).insertBefore(".discussion-stats .inputWrapper");
            updateBountyStatusIcon();

            $("#currencyToggle")
                .on("toggle", function (e, usd) {
                    var currency = usd ? "usd" : "btc";
                    $("#currencyInput").val(currency);

                    $(".btc.currencySymbol").toggle(!usd);
                    $(".usd.currencySymbol").toggle(usd);
                    $(".inputWrapper").toggle(usd);

                    validatePostBountyInput(currency);
                })
                .toggles({
                    animate: 0,
                    on: true,
                    text: {on: "USD", off: "BTC"},
                    type: "select"
                });

            $("#postBounty").click(function (e) {
                e.stopPropagation();
                e.preventDefault();

                var amount = $("#bountyInput").val();
                var currency = $("#currencyInput").val();
                if (!validatePostBountyInput(currency))
                    return;

                var target = config.rootUrl + "/addFunds?amount=" + amount + "&currency=" + currency
                    + "&url=" + config.issueUrl;
                github.openWindow(target);
            });

            $("#bountyInput").keyup(function () {
                if (!validatePostBountyInput("usd"))
                    return;

                enablePostBounty(true);
                updateBountyStatusIcon();
            });
        }, "postBounty");
    };

    //--------------------- reward bounty ------------------------

    github.renderRewardBounty = function () {
        render(function () {
            var bountyDiv = "" +
                "<a id='rewardBounty' class='bountyButton button minibutton bigger' style='text-align: center' href='#'>" +
                "Reward" +
                "</a>";

            $(bountyDiv).insertAfter(container);

            $("#rewardBounty").click(function (e) {
                var target = config.rootUrl + "/reward?url=" + config.issueUrl;
                github.openOverlay(target);
                e.stopPropagation();
                e.preventDefault();
            });
        }, "rewardBounty");
    };

    github.removeRewardButton = function () {
        $("#rewardBounty").remove();
    };

    //--------------------- overlay and popup window ------------------------

    //setup the overlay div
    var overlayDiv = "" +
        "<div id='block'></div>" +
        "<div id='iframecontainer'>" +
        "<div id='loader'></div>" +
        "<iframe id='overlayIframe'></iframe>" +
        "</div>";
    $(overlayDiv).insertBefore(document.body);

    github.openOverlay = function (url) {
        var container = $("#iframecontainer"), iFrame = container.find("iframe");
        iFrame.attr("src", url);
        $("#block").fadeIn();
        container.fadeIn();

        iFrame.load(function () {
            $("#loader").fadeOut(function () {
                iFrame.fadeIn();
            });
        });
    };

    github.closeOverlay = function () {
        var container = $("#iframecontainer"), iFrame = container.find("iframe");
        iFrame.attr("src", "about:blank");
        iFrame.fadeOut();
        container.fadeOut();
        $("#block").fadeOut();
    };

    github.openWindow = function (url) {
        window.open(url, "window", "width=1000,height=650,status=yes");
    };

    return github;
});