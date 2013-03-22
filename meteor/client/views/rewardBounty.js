Template.rewardBountyView.coders = [
    {name: "Jon Perl"},
    {name: "Jordan Kelly"}
];

Template.rewardBountyView.events({
    "click #closeButton": function () {
        Messenger.send({event: "closeOverlay"});
    },

    // Fires when any element is clicked
    "click #rewardButton": function (event) {
        alert("Reward");
    }
});

//Template.rewardBountyView.rendered = function () {
//    alert("Reward!");
//};

//var id = window.url("?id");