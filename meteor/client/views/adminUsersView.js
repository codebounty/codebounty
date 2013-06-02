var selectedUser = Template.adminUsersView.user = Session.getter("adminSelectedUser");

Template.adminUsersView.isActive = Template.activeModal.isActive = function () {
    return AuthUtils.isActive(selectedUser());
};

Template.adminUsersView.isAdmin = Template.roleModal.isAdmin = function () {
    return AuthUtils.isAdmin(selectedUser());
};

Template.adminUsersView.userEmail = function () {
    return AuthUtils.email(selectedUser());
};

Template.adminUsersView.username = Template.activeModal.username = Template.roleModal.username = function () {
    return AuthUtils.username(selectedUser());
};

Template.adminUsersView.created = function () {
    Meteor.subscribe("userData");

    //TODO remove, just for testing
    _.delay(function () {
        var selectedUser = Meteor.users.findOne();
        Session.set("adminSelectedUser", selectedUser);
    }, 500);
};

Template.adminUsersView.rendered = function () {
    $("[rel=tooltip]").tooltip();
    $("[data-toggle=dropdown]").dropdown();
};

Template.adminUsersView.events({
    "click .searchFilters .btn": function () {
        var userId = $(".userId").val();
        var userGithub = $(".userGithub").val();

        var selector = {};
        if (userId !== "")
            selector._id = userId;

        if (userGithub !== "") //starts with
            selector["services.github.username"] = new RegExp("^" + userGithub, "i");

        var selectedUser = Meteor.users.findOne(selector);
        Session.set("adminSelectedUser", selectedUser);
    },

    "click .openActiveModal": function () {
        $(".activeModal").modal("show");
    },

    "click .activeModal .action": function () {
        var user = selectedUser();
        user.active = !user.active;
        Session.set("adminSelectedUser", user);

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

        Session.set("adminSelectedUser", user);

        var reason = $(".activeModal .reason").val();
        Meteor.call("setRole", user, user.role, reason, function (err, result) {
            if (result)
                user.log.push(result);
        });

        $(".activeModal").modal("hide");
    }
});

//Template.adminUsersView.preserve([".activeModal", ".roleModal"]);