var bitcoin = Npm.require("bitcoin");

Bitcoin.Client = new bitcoin.Client(
    Bitcoin.Settings.client.host, Bitcoin.Settings.client.port,
    Bitcoin.Settings.client.username, Bitcoin.Settings.client.password
);
