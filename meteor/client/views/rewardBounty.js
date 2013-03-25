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
    });
};

Template.rewardBountyView.events({
    "click #closeButton": function () {
        Messenger.send({event: "closeOverlay"});
    },

    "click #rewardButton": function (event) {

    }
});

//Template.rewardBountyView.rendered = function () {
//    alert("Reward!");
//};

//var id = window.url("?id");