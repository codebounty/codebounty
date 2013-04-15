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
    var openBounties = Session.get("openBounties");
    if (!openBounties)
        return 0;

    var totalBounty = _.reduce(openBounties, function (memo, bounty) {
        return memo + bounty.amount;
    }, 0);

    var minusFee = totalBounty - CB.Payout.Fee(totalBounty);

    return CB.Tools.Truncate(minusFee, 2);
};
Template.rewardBountyView.totalBounty = getTotalBounty;

Template.rewardBountyView.minimum = CB.Payout.Minimum;

//TODO if the total bounty can pay each person the minimum, check everyone
//otherwise check no one

Template.rewardBountyView.rendered = function () {
    var contributors = getContributors();
    var total = getTotalBounty();
    var minimum = CB.Payout.Minimum();
    var numberContributors = contributors.length;

    var setAmount = function (row, amount) {
        //Move the current amount to previousAmount
        row.data("previousAmount", row.data("currentAmount"));
        //Set the currentAmount.
        row.data("currentAmount", amount);//CB.Tools.Truncate(amount, 2));

        var percent = (amount / total) * 100;
        row.find(".rewardSlider").slider("value", CB.Tools.Truncate(percent, 2));
        row.find(".rewardInput").val(CB.Tools.Truncate(amount, 2));
        row.find(".rewardPercent").val(CB.Tools.Truncate(percent, 2));
    };

    var updateOtherSliders = function (rowToExclude) {
        var currentAmount = rowToExclude.data("currentAmount");
        var previousAmount = rowToExclude.data("previousAmount");
        var enabledContributors = $(".contributorRow.enabled").length;

        //Update all rows aside from the one being modified directly.
        $(".contributorRow.enabled").not(rowToExclude).each(function (index, row) {
            row = $(row);

            var changedAmount;
            if (previousAmount !== total) {
                var delta = (total - currentAmount) / (total - previousAmount);
                changedAmount = delta * row.data("currentAmount");
            } else {
                //When max reached.
                changedAmount = (total - currentAmount) / (enabledContributors - 1)
            }

            setAmount(row, changedAmount);
        });
    };

    var getEqualSplit = function () {
        var usersEnabled = $(".contributorRow.enabled").length;
        var equalSplit = 0;
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
        row.find(".rewardPercent").prop("disabled", disabled);

        //Redistribute contributor amounts
        $(".contributorRow").each(function (index, row) {
            row = $(row);
            var amount = 0;
            if (row.hasClass("enabled")) {
                amount = getEqualSplit()
            }
            setAmount(row, amount);
        });

        //Update checkboxes
        var usersEnabled = $(".contributorRow.enabled").length;
        if((minimum*(usersEnabled+1))>total){
            $(".shouldPay").not(":checked").prop("disabled", true);
        }else{
            $(".shouldPay").prop("disabled", false);
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
            min: 0,
            max: 100,
            disabled: true,
            slide: function (event, ui) {
                var amount = (ui.value / 100) * total;
                setAmount(row, amount);
                updateOtherSliders(row);
            }
        });

        //Input change listener
        row.find(".rewardInput")
            .change(function () {
                var amount = parseFloat($(this).val());
                setAmount(row, amount);
                updateOtherSliders(row);
            }
        );

        //Percent input change listener
        row.find(".rewardPercent")
            .change(function () {
                var amount = (parseFloat($(this).val()) / 100) * total;
                setAmount(row, amount);
                updateOtherSliders(row);
            }
        );

        //Set the row initially to an equal split
        var equalSplit = getEqualSplit();

        setAmount(row, equalSplit);
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
        var bounties = Session.get("openBounties");

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