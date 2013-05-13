var getReward = Template.rewardBountyView.reward = function () {
    return Session.get("reward");
};

var getMinimum = function () {
    var reward = getReward();
    return reward ? ReceiverUtils.minimum(reward.currency) : new Big(0);
};
Template.rewardBountyView.minimum = function () {
    return getMinimum();
};

var getTotal = function () {
    var reward = getReward();
    return reward ? reward.total() : new Big(0);
};
Template.rewardBountyView.total = function () {
    return getTotal().toString();
};

Template.rewardBountyView.rendered = function () {
    var total = getTotal();
    var minimum = getMinimum();

    var amountToPercent = function (amount) {
        return amount.div(total).times(100);
    };

    var setAmount = function (row, amount) {
        //Move the current amount to previousAmount
        row.data("previousAmount", row.data("currentAmount"));
        //Set the currentAmount.
        row.data("currentAmount", amount);

        var percent;
        if (total.cmp(minimum) !== 0) {
            percent = amountToPercent(amount);
        } else {
            percent = new Big(100);
        }

        row.find(".rewardSlider").slider("value", amount.toFixed(2));
        row.find(".rewardInput").val(amount.toFixed(2));
        row.find(".rewardPercent").text(percent.toFixed(2));
    };

//    var updateOtherSliders = function (rowToExclude) {
//        var currentAmount = rowToExclude.data("currentAmount");
//        var previousAmount = rowToExclude.data("previousAmount");
//        var enabledContributors = $(".contributorRow.enabled");
//
//        //Update all rows aside from the one being modified directly.
//        var currentRemaining = total - currentAmount;
//        var previousRemaining = total - previousAmount;
//        enabledContributors.not(rowToExclude).each(function (index, row) {
//            row = $(row);
//
////            var changedAmount;
////            if (previousAmount !== total) {
////                var delta = (total - currentAmount) / (total - previousAmount);
////                changedAmount = delta * row.data("currentAmount");
////            } else {
////                //When max reached.
////                changedAmount = (total - currentAmount) / (enabledContributors.length - 1)
////            }
////            if(changedAmount < minimum){
////                changedAmount = minimum;
////            }
//            var changedAmount;
//            if (previousAmount !== total) {
//                changedAmount = (currentRemaining / previousRemaining) * row.data("currentAmount");
//            }
//
//            setAmount(row, changedAmount);
//        });
//    };
    var showStatusBox = function () {
        $(".statusBox").stop(false, true)
            .addClass("invalid")
            .fadeIn("fast");
    };

    var hideStatusBox = function () {
        $(".statusBox").stop(true, false)
            .fadeOut("fast", function () {
                $(this).removeClass("invalid");
            });
    };

    var enableSubmit = function () {
        $(".rewardButton")
            .prop("disabled", false)
            .removeClass("disabled");
    };

    var disableSubmit = function () {
        $(".rewardButton")
            .prop("disabled", true)
            .addClass("disabled");
    };

    var getEqualSplit = function () {
        var usersEnabled = $(".contributorRow.enabled").length;
        var equalSplit = minimum;
        if (usersEnabled !== 0) {
            equalSplit = total.div(usersEnabled);
        }
        return equalSplit;
    };

    var toggleRow = function (row) {
        row.toggleClass("enabled");
        var disabled = !row.hasClass("enabled");
        row.find(".rewardSlider").slider("option", "disabled", disabled);
        row.find(".rewardInput").prop("disabled", disabled);

        var usersEnabled = $(".contributorRow.enabled").length;
        //Redistribute contributor amounts
        $(".contributorRow").each(function (index, row) {
            row = $(row);
            var max = total.minus(minimum.times(usersEnabled - 1));
            row.find(".rewardSlider").slider("option", "max", max.toString());

            var amount = new Big(0);
            if (row.hasClass("enabled")) {
                amount = getEqualSplit();
            }
            setAmount(row, amount);
        });

        updateTotal();

        //Update checkboxes
        if ((minimum.times(usersEnabled + 1)).cmp(total) >= 0) {
            $(".shouldPay").not(":checked").prop("disabled", true);
        } else {
            $(".shouldPay").prop("disabled", false);
        }
    };

    var updateTotal = function () {
        var t = new Big(0);
        $(".contributorRow.enabled").each(function (index, row) {
            row = $(row);
            var amount = row.data("currentAmount");
            t = t.plus(amount);
        });
        var calcTotal = $(".calculatedTotal");
        calcTotal.find(".calculatedTotalAmount").text(t);
        if (t.cmp(total) !== 0) {
            calcTotal.addClass("invalid");
            showStatusBox();
            disableSubmit();
        } else {
            calcTotal.removeClass("invalid");
            hideStatusBox();
            enableSubmit();
        }
    };

    $(".contributorRow").each(function (index, row) {
        row = $(row);
        //Slider slide listener
        //Note: Chrome bug steals drag event from slider.
        row.find(".shouldPay").click(function (event) {
            var checkBox = $(event.toElement);
            var row = checkBox.parent(".contributorRow");
            toggleRow(row);
        });

        row.find(".rewardSlider").slider({
            animate: "fast",
            min: parseFloat(minimum.toString()),
            max: parseFloat(total.toString()),
            disabled: true,
            slide: function (event, ui) {
                var amount = ui.value;
                setAmount(row, new Big(amount));
                updateTotal();
            }
        });

        //Input change listener
        row.find(".rewardInput")
            .change(function () {
                var amount = new Big($(this).val());
                setAmount(row, amount);
                updateTotal();
            }
        );

        updateTotal();
    });
};

Template.rewardBountyView.events({
    "click .closeButton": function () {
        Messenger.send({event: "closeOverlay"});
    },

    "click .rewardButton": function (event) {
        var url = Session.get("url");

        $.blockUI();
        Meteor.call("rewardBounty", getReward(), function (error, success) {
            $.unblockUI();
            Messenger.send({event: "closeOverlay"});
            if (!ErrorUtils.handle(error)) {
                return;
            }

            if (success) {
                Messenger.send({event: "bountyRewarded"});
            }
        });
    }
});