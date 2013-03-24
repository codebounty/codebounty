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

        var payout = {};
        contributors.forEach(function (contributor) {
            payout[contributor.email] = 100 / contributors.length;
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