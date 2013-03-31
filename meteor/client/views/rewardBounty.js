var getContributors = function () {
    var contributors = Session.get("contributors");
    if (!contributors)
        return [];

    return contributors;
};
Template.rewardBountyView.contributors = getContributors;

var getTotalBounty = function () {
    var openBounties = Session.get("openBounties");
    if (!openBounties)
        return 0;

    var totalBounty = _.reduce(openBounties, function (memo, bounty) {
        return memo + bounty.amount;
    }, 0);

    return totalBounty - CB.Payout.Fee(totalBounty);
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

    //initialize with an equal split
    var equalSplit = total / numberContributors;

    var _setHandled;
    /**
     * Change the current row's values to this amount. Adjust it if is is < minimum or > total
     * TODO adjust the other contributor's rewards equally by removing / adding the difference to the total
     * @param row
     * @param amount
     */
    var setAmount = function (row, amount) {
        //prevent infinite loop
        if (_setHandled)
            return;

        _setHandled = true;

        var row = $(row);

        if (amount > total)
            amount = total;
        else if (amount < minimum)
            amount = minimum;

        row.find(".rewardInput").val(amount);
        row.find(".rewardPercent").val(((amount / total) * 100).toFixed(2));
        row.find(".rewardSlider").slider("value", amount);

        _setHandled = false;
    };

    $(".contributorRow").each(function (index) {
        var thisRow = this;
        $(this).find(".rewardSlider").slider({
            animate: "fast",
            max: total,
            slide: function (event, ui) {
                var amount = ui.value.toFixed(2);
                setAmount(thisRow, amount);
            },
            value: equalSplit
        });
        $(this).find(".rewardInput")
            .val(equalSplit)
            .change(function () {
                var amount = parseInt($(this).val());
                setAmount(thisRow, amount);
            }
        );
        $(this).find(".rewardPercent")
            .val(((equalSplit / $(thisRow).find(".rewardSlider").slider("option", "max")) * 100).toFixed(2))
            .change(function () {
                var amount = parseFloat(($(this).val() / 100) * total);
                setAmount(thisRow, amount);
            }
        );
    });
};

Template.rewardBountyView.events({
    "click .shouldPay": function (event) {
        var checkBox = $(event.toElement);
        var rewardGroup = checkBox.siblings(".rewardInputGroup");

        if (checkBox.is(":checked"))
            rewardGroup.unblock();
        else
            rewardGroup.block({ message: null, overlayCSS: {cursor: 'default' }});
    },

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
        var equalSplit = parseFloat((totalBounty / contributors.length).toFixed(2));
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