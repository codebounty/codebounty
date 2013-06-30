Rewards = new Meteor.Collection("rewards", {
    transform: RewardUtils.fromJSONValue
});

var selectedReward = Template.holdModal.reward = Template.refundModal.reward =
    Template.rewardModal.reward = Session.getter("adminSelectedReward");

Template.adminRewardsView.rewards = function () {
    var selector = {};
    var id = Session.get("rewardIdFilter");
    if (id !== "")
        selector._id = id;

    var repo = Session.get("rewardRepoFilter");
    var issueNumber = Session.get("rewardIssueNumberFilter");
    if (repo && repo !== "") {
        repo = repo.split("/");
        var repoUrl = GitHubUtils.repoUrl(repo[0], repo[1]);
        if (issueNumber && issueNumber !== "")
            repoUrl += "/issues/" + issueNumber;

        selector.issueUrl = new RegExp("^" + repoUrl, "i"); //starts with
    } else if (issueNumber && issueNumber !== "")
        selector.issueUrl = new RegExp(issueNumber + "$"); //ends with

    var status = Session.get("rewardStatusFilter");
    if (status !== "" && status !== "any")
        selector.status = status;

    return Rewards.find(selector);
};

//Reward template functions
Template.adminRewardsView.canPayout = function () {
    return (this.status === "open" || this.status === "reopened" || this.status === "held")
        && this.total().gt(0);
};
Template.adminRewardsView.total = function () {
    return this.total();
};
Template.adminRewardsView.issue = function () {
    if (!this.issueUrl)
        return "";

    var issue = GitHubUtils.issue(this.issueUrl);
    return issue.repo.name + "/" + issue.repo.name;
};
Template.adminRewardsView.repo = function () {
    if (!this.issueUrl)
        return "";

    var issue = GitHubUtils.issue(this.issueUrl);
    return issue.number;
};
Template.adminRewardsView.statusIs = function () {
    var that = this;
    return _.some(arguments, function (status) {
        return that.status === status;
    });
};

Template.adminRewardsView.created = function () {
    Meteor.subscribe("rewardData");

    Messenger.registerEvent("closeOverlay", function () {
        $(".rewardModal").modal("hide");
    });
};

Template.adminRewardsView.rendered = function () {
    var tooltips = $("[rel=tooltip]");
    if (tooltips.length > 0)
        tooltips.tooltip();

    var dropdowns = $("[data-toggle=dropdown]");
    if (dropdowns.length > 0)
        dropdowns.dropdown();
};

Template.adminRewardsView.events({
    "click .searchFilters .btn": function () {
        Session.set("rewardIdFilter", $(".rewardId").val());
        Session.set("rewardRepoFilter", $(".rewardRepo").val());
        Session.set("rewardIssueNumberFilter", $(".rewardIssueNumber").val());
        Session.set("rewardStatusFilter", $(".rewardStatus").val());
    },

    "click .dropdown-toggle": function (event) {
        var target = event.target;
        var rewardId = $(target).parents("tr").children("td").first().text();
        var reward = Rewards.findOne(rewardId);
        Session.set("adminSelectedReward", reward);
    },

    "click .openHoldModal": function () {
        $(".holdModal").modal("show");
    },

    "click .holdModal .action": function () {
        var reason = $(".holdModal .reason").val();
        var reward = selectedReward();
        Meteor.call("holdReward", reward._id, reason, function (err, result) {
            if (result)
                reward.log.push(result);

            reward.status = "held";
        });

        $(".holdModal").modal("hide");
    },

    "click .openRefundModal": function () {
        $(".refundModal").modal("show");
    },

    "click .refundModal .action": function () {
        var reason = $(".refundModal .reason").val();
        var reward = selectedReward();
        Meteor.call("refundReward", reward._id, reason, function (err, result) {
            if (result)
                reward.log.push(result);

            reward.status = "refunded";
        });

        $(".refundModal").modal("hide");
    },

    "click .openRewardModal": function () {
        $(".rewardModal").modal("show");
    },

    "click .rewardModal .action": function () {
        var reward = selectedReward();

        var why = $(".rewardModal .why").hide();
        var reason = $(".rewardModal .reason").val();

        var iframe = $(".rewardModal iframe");
        iframe.attr("src", "/reward?admin=true&reason=" + reason + "&url=" + reward.issueUrl);
        iframe.show();
    }
});

Template.adminRewardsView.preserve([".rewardId", ".rewardRepo", ".rewardIssueNumber", ".rewardStatus"]);