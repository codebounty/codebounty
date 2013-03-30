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

    return _.reduce(openBounties, function (memo, bounty) {
        return memo + bounty.amount;
    }, 0);
};
Template.rewardBountyView.totalBounty = getTotalBounty;

/**
 * TODO
 * Whenever an amount is increased/decreased for a contributor
 * adjust the other contributor's rewards equally by removing / adding the difference
 */
var setAmount = function () {

};

Template.rewardBountyView.rendered = function () {
    var contributors = getContributors();
    var total = getTotalBounty();
    var numberContributors = contributors.length;

    var equalSplit = total / numberContributors;

    $(".contributorRow").each(function (index) {
        var thisRow = this;
        $(this).find(".rewardSlider").slider({
            animate: "fast",
            max: total,
            slide: function (event, ui) {
                var max = $(this).slider("option", "max");
                $(thisRow).find(".rewardInput").val(ui.value.toFixed(2));
                $(thisRow).find(".rewardPercent").val(((ui.value / max) * 100).toFixed(2));
            },
            value: equalSplit
        });
        $(this).find(".rewardInput")
            .val(equalSplit)
            .change(function () {
                var val = parseInt($(this).val());
                var max = $(thisRow).find(".rewardSlider").slider("option", "max");
                //TODO: Input validation
                $(".rewardSlider").slider('value', val);
                $(thisRow).find(".rewardPercent").val(((val / max) * 100).toFixed(2));
            }
        );
        $(this).find(".rewardPercent")
            .val(((equalSplit / $(thisRow).find(".rewardSlider").slider("option", "max")) * 100).toFixed(2))
            .change(function () {
                var max = $(thisRow).find(".rewardSlider").slider("option", "max");
                var val = parseFloat(($(this).val() / 100) * max);
                //TODO: Input validation
                $(".rewardSlider").slider('value', val);
                $(thisRow).find(".rewardInput").val(val.toFixed(2));
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

        var payout = [];
        contributors.forEach(function (contributor) {
            payout.push({email: contributor.email, rate: 100 / contributors.length});
        });

        var url = Session.get("url");
        var bounties = Session.get("openBounties");

        //TODO show loading / waiting ui
        var ids = _.pluck(bounties, "_id");
        Meteor.call("rewardBounty", ids, payout, function (error, success) {
            //TODO stop loading / waiting ui
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

//Template.rewardBountyView.rendered = function () {
//    alert("Reward!");
//};

//var id = window.url("?id");