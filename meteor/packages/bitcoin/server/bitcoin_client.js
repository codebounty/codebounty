var bitcoin = Npm.require("bitcoin");
var ERR_CODE_WALLET_LOCKED = -13;

/**
 * Takes a Bitcoin client object, a zero-parameter function encapsulating the
 * original request to the Bitcoin client, and a callback function. Returns a
 * function that can be passed to a Bitcoin client object as a callback. If the
 * request fails due to the wallet being locked, the callback function returned
 * by this function will retry the original request after unlocking the wallet.
 * If the request is successful either time, it will forward the response
 * transparently to the callback function passed in.
 * 
 * @param client A Bitcoin client object
 * @param originalRequest A zero-parameter function encapsulating the request.
 * @param callback A function that receives the results of the client request.
 * @return function A callback function that can be passed to the Bitcoin client.
 **/
Bitcoin._encryptedWalletCallbackDecorator = function (client, originalRequest, callback) {
    return function () {
        if (arguments[0] && arguments[0].code == ERR_CODE_WALLET_LOCKED) {
            // Unlock the wallet and try again.
            client.walletPassphrase(
                Meteor.settings["BITCOIN_PASSPHRASE"], 
                Meteor.settings["BITCOIN_LOCK_INTERVAL"],
                originalRequest);
        } else if (callback) {
            // If the call succeeded, pass on the results to its callback.
            callback.apply(callback, arguments);
        }
    };
}

/**
 * Examines an arguments array/object to see if the last argument is a function.
 * If it is, it returns it. Otherwise it returns undefined.
 * @param args An arguments array or object, as supplied by Javascript.
 * @return function
 **/
Bitcoin.getCallbackFromArgs = function (args) {
    var tail = args[args.length-1];
    return (_.isFunction(tail) ? tail : undefined);
};

/**
 * Either tacks the passed-in callback function onto the end of the passed-in
 * arguments object, or overwrites the last argument in the arguments object
 * if that argument is a function.
 * 
 * @param args The arguments object to change.
 * @param callback The callback to overwrite the callback function in args with.
 * @return args
 **/
Bitcoin.overrideCallbackInArgs = function (args, callback) {
    if (_.isFunction(args[args.length-1])) {
        args[args.length-1] = callback;
    } else {
        // args is an object masquerading as an array,
        // so we have to increment its length property
        // if we're adding a callback.
        args[args.length] = callback;
        args.length++;
    }
    return args;
}

// A decorator for bitcoin.Client commands that require an unlocked wallet.
// Calling a bitcoin.Client command that has been wrapped in this decorator
// results in the command being called once and then re-called after unlocking
// the wallet if the command fails due to the wallet being locked.
Bitcoin.withUnlockedWallet = function (command) {
    
    return function () {
        var that = this;
        var callback = Bitcoin.getCallbackFromArgs(arguments);
        var originalArgs = arguments;
        var originalRequest = (function () {
            command.apply(that, originalArgs);
        });
        var args = Bitcoin.overrideCallbackInArgs(arguments,
            Bitcoin._encryptedWalletCallbackDecorator(that, originalRequest, callback));
        
        command.apply(that, args);
    };
};

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
