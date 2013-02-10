Template.addBountyView.events({
    "click #bountyFive": function () {
        var token = function (res) {
            console.log('Got token ID:', res.id);
        };

        StripeCheckout.open({
            key: 'pk_test_5vUQpyp7MlAAQ2oiBCINNhKu',
            address: true,
            amount: 500,
            name: '$5 Bounty',
            description: '$5 Bounty for Issue # in Meteor/Meteor',
            panelLabel: 'Checkout',
            token: token
        });

        return false;
    }
});