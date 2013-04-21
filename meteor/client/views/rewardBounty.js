var getContributors = function () {
    var contributors = Session.get("contributors");
    if (!contributors)
        return [];

    return contributors;
};
Template.rewardBountyView.contributors = getContributors;

/**
 * The bounty minus the fee
 * @returns {number}
 */
var getTotalBounty = function () {
    var rewardableBounties = Session.get("rewardableBounties");
    if (!rewardableBounties)
        return 0;

    var totalBounty = _.reduce(rewardableBounties, function (memo, bounty) {
        return memo + bounty.amount;
    }, 0);

    var minusFee = totalBounty - CB.Payout.Fee(totalBounty);

    return CB.Tools.Truncate(minusFee, 2);
};
Template.rewardBountyView.totalBounty = getTotalBounty;

Template.rewardBountyView.minimum = CB.Payout.Minimum;

Template.rewardBountyView.rendered = function () {
    var total = getTotalBounty();
    var minimum = CB.Payout.Minimum();

    var amountToPercent = function (amount) {
        return ( (amount / total) * 100);
    };

    var setAmount = function (row, amount) {
        //Move the current amount to previousAmount
        row.data("previousAmount", row.data("currentAmount"));
        //Set the currentAmount.
        row.data("currentAmount", amount);

        var percent;
        if (total !== minimum) {
            percent = amountToPercent(amount);
        } else {
            percent = 100;
        }
        row.find(".rewardSlider").slider("value", CB.Tools.Truncate(amount, 2));
        row.find(".rewardInput").val(CB.Tools.Truncate(amount, 2));
        row.find(".rewardPercent").text(CB.Tools.Truncate(percent, 2));
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

    var getEqualSplit = function () {
        var usersEnabled = $(".contributorRow.enabled").length;
        var equalSplit = minimum;
        if (usersEnabled !== 0) {
            equalSplit = total / usersEnabled;
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
            var max = total - (minimum * (usersEnabled - 1));
            row.find(".rewardSlider").slider("option", "max", max);

            var amount = 0;
            if (row.hasClass("enabled")) {
                amount = getEqualSplit();
            }
            setAmount(row, amount);
        });

        updateTotal();

        //Update checkboxes
        if ((minimum * (usersEnabled + 1)) >= total) {
            $(".shouldPay").not(":checked").prop("disabled", true);
        } else {
            $(".shouldPay").prop("disabled", false);
        }
    };

    var updateTotal = function () {
        var t = 0;
        $(".contributorRow.enabled").each(function (index, row) {
            row = $(row);
            var amount = row.data("currentAmount");
            t += amount;
        });
        var calcTotal = $(".calculatedTotal");
        calcTotal.find(".calculatedTotalAmount").text(t);
        if(t !== total){
            calcTotal.addClass("invalid");
            //TODO: Implement form validity
        } else {
            calcTotal.removeClass("invalid");
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
            min: minimum,
            max: total,
            disabled: true,
            slide: function (event, ui) {
                var amount = ui.value;
                setAmount(row, amount);
                updateTotal();
            }
        });

        //Input change listener
        row.find(".rewardInput")
            .change(function () {
                var amount = parseFloat($(this).val());
                setAmount(row, amount);
                updateTotal();
            }
        );
    });
};

Template.rewardBountyView.events({
    "click #closeButton": function () {
        Messenger.send({event: "closeOverlay"});
    },

    "click #rewardButton": function (event) {
        //for now hard code an equal reward for each person
        //TODO ui. ui should show prevent payout for people without email on commit
        var contributors = Session.get("contributors");
        if (contributors.length <= 0)
            return;

        var totalBounty = getTotalBounty();

        var payout = [];
        var equalSplit = CB.Tools.Truncate(totalBounty / contributors.length, 2);
        contributors.forEach(function (contributor) {
            payout.push({email: contributor.email, amount: equalSplit});
        });

        var url = Session.get("url");
        var bounties = Session.get("rewardableBounties");

        $.blockUI();
        var ids = _.pluck(bounties, "_id");
        Meteor.call("rewardBounty", ids, payout, function (error, success) {
            $.unblockUI();
            Messenger.send({event: "closeOverlay"});
            if (!Tools.HandleError(error)) {
                return;
            }

            if (success) {
                Messenger.send({event: "bountyRewarded"});
            }
        });
    }
});