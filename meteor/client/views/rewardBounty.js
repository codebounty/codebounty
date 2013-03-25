var contributors = [];

Template.rewardBountyView.contributors = function () {
    return Session.get("contributors");
};

Template.rewardBountyView.rendered = function () {
    Meteor.call("contributors", Session.get("url"), function (error, result) {
        if (error) //TODO error handling
            return;

        Session.set("contributors", result);
    });

    var bountyTotal = 200;
    var currentVal = 45;
    $(".contributorRow").each(function (index) {
        var thisRow = this;
        $(this).find(".rewardSlider").slider({
            animate: "fast",
            value: currentVal,
            max: bountyTotal,
            slide: function (event, ui) {
                var max = $(this).slider("option", "max");
                $(thisRow).find(".rewardInput").val(ui.value.toFixed(2));
                $(thisRow).find(".rewardPercent").val(((ui.value / max) * 100).toFixed(2));
            }
        });
        $(this).find(".rewardInput")
            .val(currentVal)
            .change(function () {
                var val = parseInt($(this).val());
                var max = $(thisRow).find(".rewardSlider").slider("option", "max");
                //TODO: Input validation
                $(".rewardSlider").slider('value', val);
                $(thisRow).find(".rewardPercent").val(((val / max) * 100).toFixed(2));
            }
        );
        $(this).find(".rewardPercent")
            .val(((currentVal / $(thisRow).find(".rewardSlider").slider("option", "max")) * 100).toFixed(2))
            .change(function () {
                var max = $(thisRow).find(".rewardSlider").slider("option", "max");
                var val = parseFloat(($(this).val() / 100) * max);
                //TODO: Input validation
                $(".rewardSlider").slider('value', val);
                $(thisRow).find(".rewardInput").val(val.toFixed(2));
            }
        );
        
    Meteor.call("openBounties", Session.get("url"), true, function (error, result) {
        if (error) //TODO error handling
            return;

        console.log(result);

        Session.set("myOpenBounties", result);
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
        var bounties = Session.get("myOpenBounties");

        var ids = _.pluck(bounties, "_id");
        Meteor.call("rewardBounty", ids, payout, function (error, result) {

        });
    }
});

//Template.rewardBountyView.rendered = function () {
//    alert("Reward!");
//};

//var id = window.url("?id");