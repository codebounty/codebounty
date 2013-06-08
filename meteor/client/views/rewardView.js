var reward = Template.rewardView.reward = Session.getter("reward");
var updateReward = Session.setter("reward");

var bitcoinSymbol = "<svg version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' viewBox='0 0 273.6 360' enable-background='new 0 0 273.6 360' xml:space='preserve' class='btc currencySymbol'> <g> <g> <path fill='#000' d='M217.021,167.042c18.631-9.483,30.288-26.184,27.565-54.007c-3.667-38.023-36.526-50.773-78.006-54.404l-0.008-52.741 h-32.139l-0.009,51.354c-8.456,0-17.076,0.166-25.657,0.338L108.76,5.897l-32.11-0.003l-0.006,52.728 c-6.959,0.142-13.793,0.277-20.466,0.277v-0.156l-44.33-0.018l0.006,34.282c0,0,23.734-0.446,23.343-0.013 c13.013,0.009,17.262,7.559,18.484,14.076l0.01,60.083v84.397c-0.573,4.09-2.984,10.625-12.083,10.637 c0.414,0.364-23.379-0.004-23.379-0.004l-6.375,38.335h41.817c7.792,0.009,15.448,0.13,22.959,0.19l0.028,53.338l32.102,0.009 l-0.009-52.779c8.832,0.18,17.357,0.258,25.684,0.247l-0.009,52.532h32.138l0.018-53.249c54.022-3.1,91.842-16.697,96.544-67.385 C266.916,192.612,247.692,174.396,217.021,167.042z M109.535,95.321c18.126,0,75.132-5.767,75.14,32.064 c-0.008,36.269-56.996,32.032-75.14,32.032V95.321z M109.521,262.447l0.014-70.672c21.778-0.006,90.085-6.261,90.094,35.32 C199.638,266.971,131.313,262.431,109.521,262.447z'/> </g> </g> </svg>";

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
    
    // Change the currency symbols as needed.
    if (myReward.currency == "btc") {
        $(".usd.currencySymbol").each(function (index, symbol) {
            $(symbol).hide().after(bitcoinSymbol);
        });
    } else {
        $(".btc.currencySymbol").each(function (index, symbol) {
            $(symbol).hide();
        });
    }

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
        var admin = window.url("?admin");
        var reason = window.url("?reason");
        if (reason)
            reason = decodeURIComponent(reason);

        $.blockUI();
        Meteor.call("reward", reward(), admin, reason, function (error, success) {
            $.unblockUI();
            Messenger.send({event: "closeOverlay"});
            if (!ErrorUtils.handle(error)) {
                return;
            }

            if (success)
                Messenger.send({event: "bountyRewarded"});
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
