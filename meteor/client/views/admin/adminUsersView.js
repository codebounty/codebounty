var selectedUser = Template.adminUsersView.selectedUser = Session.getter("adminSelectedUser");

Template.adminUsersView.users = function () {
    var userId = Session.get("userIdFilter");
    var userGithub = Session.get("userGithubFilter");

    var selector = {};
    if (userId !== "")
        selector._id = userId;

    if (userGithub !== "") //starts with
        selector["services.github.username"] = new RegExp("^" + userGithub, "i");

    return Meteor.users.find(selector);
};

Template.adminUsersView.isActive = function () {
    return AuthUtils.isActive(this);
};

Template.activeModal.isActive = function () {
    return AuthUtils.isActive(selectedUser());
};

Template.adminUsersView.isAdmin = function () {
    return AuthUtils.isAdmin(this);
};

Template.roleModal.isAdmin = function () {
    return AuthUtils.isAdmin(selectedUser());
};

Template.adminUsersView.userEmail = function () {
    return AuthUtils.email(this);
};

Template.adminUsersView.username = function () {
    return AuthUtils.username(this);
};

Template.activeModal.username = Template.roleModal.username = function () {
    return AuthUtils.username(selectedUser());
};

Template.adminUsersView.created = function () {
    Meteor.subscribe("userData");

    _.delay(function () {
        $(".searchFilters .btn").click();
    }, 500);
};

Template.adminUsersView.rendered = function () {
    var tooltips = $("[rel=tooltip]");
    if (tooltips.length > 0)
        tooltips.tooltip();

    var dropdowns = $("[data-toggle=dropdown]");
    if (dropdowns.length > 0)
        dropdowns.dropdown();
};

Template.adminUsersView.events({
    "click .searchFilters .btn": function () {
        Session.set("userIdFilter", $(".userId").val());
        Session.set("userGithubFilter", $(".userGithub").val());
    },

    "click .dropdown-toggle": function (event) {
        var target = event.target;
        var userId = $(target).parents("tr").children("td").eq(1).text();
        var user = Meteor.users.findOne(userId);
        Session.set("adminSelectedUser", user);
    },

    "click .openActiveModal": function () {
        $(".activeModal").modal("show");
    },

    "click .activeModal .action": function () {
        var user = selectedUser();
        user.active = !user.active;

        var reason = $(".activeModal .reason").val();
        Meteor.call("setIsActive", user, user.active, reason, function (err, result) {
            if (result)
                user.log.push(result);
        });

        $(".activeModal").modal("hide");
    },

    "click .openRoleModal": function () {
        $(".roleModal").modal("show");
    },

    "click .roleModal .action": function () {
        var user = selectedUser();

        if (user.role === "admin")
            user.role = "user";
        else if (user.role === "user")
            user.role = "admin";
        else
            throw "Something has gone amiss";

        var reason = $(".activeModal .reason").val();
        Meteor.call("setRole", user, user.role, reason, function (err, result) {
            if (result)
                user.log.push(result);
        });

        $(".roleModal").modal("hide");
    }
});

//Template.adminUsersView.preserve([".activeModal", ".roleModal"]);