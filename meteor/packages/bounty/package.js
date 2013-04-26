Package.describe({
    summary: "Manages bounties"
});

Npm.depends({
    "paypal-ipn": "1.0.1"
});

Package.on_use(function (api) {
    api.use('fibers');
    api.use('errorutils');
    api.use('tools');
    api.use('paypal');

    api.use('github');

    api.add_files('bounty_common.js', ['client', 'server']);
    api.add_files('payout.js', ['client', 'server']);

    api.add_files('bounty_client.js', 'client');

    api.add_files('bounty.js', 'server');
    api.add_files('bounty_payment.js', 'server');
    api.add_files('bounty_status.js', 'server');
});