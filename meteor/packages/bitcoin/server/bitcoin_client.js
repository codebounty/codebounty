var bitcoin = Npm.require("bitcoin");
var ERR_CODE_WALLET_LOCKED = -13;

// A decorator for bitcoin.Client commands that require an unlocked wallet.
// Calling a bitcoin.Client command that has been wrapped in this decorator
// results in the command being called once and then re-called after unlocking
// the wallet if the command fails due to the wallet being locked.
Bitcoin.withUnlockedWallet = function (command) {
    return function () {
        var that = this;
        var args = arguments;
        var tail = args[args.length-1];
        var callback = (_.isFunction(tail) ? tail : undefined);
        
        
        // Takes a function that takes a modified callback and passes it
        // on to a Bitcoin client command. The modified callback will
        // retry the original command with the original callback after
        // unlocking the wallet with the wallet passphrase defined in the
        // settings file.
        // I'm defining this function here because it doesn't make any 
        // sense to expose it. Would be awesome if we could refactor all
        // this to make it simpler sometime, but this works for now.
        var retryIfLocked = function (command) {
            // Try once, and if we get a failure due to an encrypted wallet,
            // we'll try again after unlocking the wallet.
            command(function () {
                if (arguments[0] && arguments[0].code == ERR_CODE_WALLET_LOCKED) {
                    // Unlock the wallet and try again.
                    that.walletPassphrase(
                        Meteor.settings["BITCOIN_PASSPHRASE"], 
                        Meteor.settings["BITCOIN_LOCK_INTERVAL"],
                        (function () { command(callback); }));
                } else if (callback) {
                    // If the call succeeded, pass on the results to its callback.
                    callback.apply(callback, arguments);
                }
            });
        };
        
        // Here we are just creating a function that overrides whatever the
        // original callback was (if there was one) with the modified callback
        // from retryIfLocked. If there was no callback originally defined,
        // it just adds the modified callback onto the end of the arguments
        // to the original command.
        retryIfLocked(function (_callback) {
            if (_.isFunction(args[args.length-1])) {
                args[args.length-1] = _callback;
            } else {
                // args is an object masquerading as an array,
                // so we have to increment its length property
                // if we're adding a callback.
                args[args.length] = _callback;
                args.length++;
            }
            command.apply(that, args);
        });
    };
}

// Creating a copy of the bitcoin.Client class so we can
// override functions without altering the original class.
var BitcoinClient = bitcoin.Client;

// Decorate all functions that require an unlocked wallet,
// save for dumpprivkeys, importprivkey, keypoolrefill,
// signmessage, and signrawtransaction (since we should
// NEVER need to run those from within the web app).
BitcoinClient.prototype.sendToAddress = Bitcoin.withUnlockedWallet(BitcoinClient.prototype.sendToAddress);
BitcoinClient.prototype.sendFrom = Bitcoin.withUnlockedWallet(BitcoinClient.prototype.sendFrom);
BitcoinClient.prototype.sendMany = Bitcoin.withUnlockedWallet(BitcoinClient.prototype.sendMany);

// And finally create an instance of our modified class!
Bitcoin.Client = new BitcoinClient(Bitcoin.Settings.client);
