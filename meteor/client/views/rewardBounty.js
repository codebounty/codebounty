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