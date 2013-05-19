var reward = Template.rewardView.reward = Session.getter("reward");
var updateReward = Session.setter("reward");

var rewardMinimum = Template.rewardView.minimum = function () {
    var myReward = reward();
    return myReward ? ReceiverUtils.minimum(myReward.currency) : new Big(0);
};
var rewardTotal = Template.rewardView.total = function () {
    var myReward = reward();
    return myReward ? myReward.total() : new Big(0);
};
var isValid = Template.rewardView.isValid = function () {
    var myReward = reward();
    return myReward && myReward.validationErrors().length === 0;
};

Template.rewardView.receiverTotal = function () {
    var myReward = reward();
    return myReward ? myReward.receiverTotal() : new Big(0);
};
Template.rewardView.receiverHasReward = function () {
    var receiver = this;
    return receiver.getReward().cmp(0) > 0;
};
Template.rewardView.receiverReward = function (percent) {
    var receiver = this;
    var receiverReward = receiver.getReward();

    if (percent !== true)
        return receiverReward;

    var total = rewardTotal();
    var percent = receiverReward.div(total).times(100);
    return percent.toFixed(0);
};

var rowReceiver = function (reward, row) {
    var index = row.index();
    var receivers = reward.getReceivers();
    return receivers[index];
};

var setRowAmount = function (row, amount) {
    var myReward = reward();

    var receiver = rowReceiver(myReward, row);

    var total = rewardTotal();
    var minimum = rewardMinimum();

    //if the new amount is > the max, set the amount to the max
    if (amount.cmp(total) > 0)
        amount = total;

    //if the new amount is < than the minimum and not 0, set the amount to the minimum
    if (amount.cmp(minimum) < 0 && amount.cmp(0) !== 0)
        amount = minimum;

    //need to manually update the slider since it is not bound
    row.find(".rewardSlider").slider("value", amount.toString());

    receiver.setReward(amount);
    updateReward(myReward);
};

var showError = _.debounce(function (show) {
    if (show)
        $(".validationError").stop(false, true)
            .addClass("invalid")
            .fadeIn("fast");
    else
        $(".validationError").stop(true, false)
            .fadeOut("fast", function () {
                $(this).removeClass("invalid");
            });
}, 250);

Template.rewardView.rendered = function () {
    var myReward = reward();
    if (!myReward)
        return;

    var total = rewardTotal();
    var minimum = rewardMinimum();

    var receivers = myReward.getReceivers();

    //setup the sliders
    $(".contributorRow").each(function (index, row) {
        var receiver = receivers[index];
        row = $(row);
        row.find(".rewardSlider").slider({
            animate: "fast",
            min: 0,
            max: parseFloat(total.toString()),
            value: receiver.getReward(),
            slide: function (event, data) {
                var amount = new Big(data.value);
                if (amount.cmp(minimum) < 0)
                    return false;

                setRowAmount(row, amount);
            }
        });

        //enable the row if the reward > 0
        var enabled = receiver.getReward().cmp(0) > 0;
        row.find(".rewardSlider").slider("option", "disabled", !enabled);
    });

    showError(!isValid());
};

Template.rewardView.events({
    "change .rewardInput": function (event) {
        var element = $(event.srcElement);
        var row = element.parents(".contributorRow");
        var amount = new Big(element.val());
        setRowAmount(row, amount);
    },

    "click .closeButton": function () {
        Messenger.send({event: "closeOverlay"});
    },

    "click .rewardButton": function () {
        var url = Session.get("url");

        $.blockUI();
        Meteor.call("reward", reward(), function (error, success) {
            $.unblockUI();
            Messenger.send({event: "closeOverlay"});
            if (!ErrorUtils.handle(error)) {
                return;
            }

            if (success) {
                Messenger.send({event: "bountyRewarded"});
            }
        });
    },

    "click .shouldPay": function (event) {
        var checkBox = $(event.srcElement);
        var row = checkBox.parent(".contributorRow");

        var myReward = reward();
        var receiver = rowReceiver(myReward, row);

        //if there is no reward set it to the minimum
        if (receiver._reward.cmp(0) === 0)
            receiver.setReward(new Big(rewardMinimum()));
        //otherwise set the reward at the minimum
        else
            receiver.setReward(new Big(0));

        //update the session
        updateReward(myReward);
    }
});