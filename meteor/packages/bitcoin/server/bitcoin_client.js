var bitcoin = Npm.require("bitcoin");
var ERR_CODE_WALLET_LOCKED = -13;

// A wrapper for commands that require an unlocked wallet.
var BitcoinClient = bitcoin.Client;
BitcoinClient.prototype.withUnlockedWallet = function (command, callback) {
    var that = this;
    // Try once, and if we get a failure due to an encrypted wallet,
    // we'll try again after unlocking the wallet.
    command(function () {
        if (arguments[0] && arguments[0].code == ERR_CODE_WALLET_LOCKED) {
            // Unlock the wallet and try again.
            that.walletPassphrase(
                Bitcoin.Settings.walletPassphrase, 
                Bitcoin.Settings.walletLockInterval,
                (function () { command(callback); }));
        } else if (callback) {
            // If the call succeeded, pass on the results to its callback.
            callback.apply(callback, arguments);
        }
    });
};

// Override the default sendToAddress function
BitcoinClient.prototype._sendToAddress  = BitcoinClient.prototype.sendToAddress;
BitcoinClient.prototype.sendToAddress = function(address, amount, callback) {
    var that = this;
    this.withUnlockedWallet(function (_callback) {
       that._sendToAddress(address, amount, _callback);
    }, callback);
}

Bitcoin.Client = new BitcoinClient(Bitcoin.Settings.client);
