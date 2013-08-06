var bitcoin = Npm.require("bitcoin");

/**
 * Takes a Bitcoin client object, a zero-parameter function encapsulating the
 * original request to the Bitcoin client, and a callback function. Returns a
 * function that can be passed to a Bitcoin client object as a callback. If the
 * request fails due to a recoverable error, the callback function returned
 * by this function will retry the original request after attempting to recover.
 * If the request is successful either time, it will forward the response
 * transparently to the callback function passed in.
 * 
 * @param client A Bitcoin client object
 * @param originalRequest A zero-parameter function encapsulating the request.
 * @param callback A function that receives the results of the client request.
 * @return function A callback function that can be passed to the Bitcoin client.
 **/
Bitcoin._selfRecoveringCallbackDecorator = function (client, originalRequest, callback) {
    return function () {
        if (arguments[0] && arguments[0].code == Bitcoin.Errors.UnlockNeeded) {
            // Unlock the wallet and try again.
            client.walletPassphrase(
                Meteor.settings["BITCOIN_PASSPHRASE"], 
                Meteor.settings["BITCOIN_LOCK_INTERVAL"],
                originalRequest);
        } else if (arguments[0] && arguments[0].code == Bitcoin.Errors.KeypoolRanOut) {
            client.walletPassphrase(
                Meteor.settings["BITCOIN_PASSPHRASE"], 
                Meteor.settings["BITCOIN_LOCK_INTERVAL"],
                function () {
                    client.keypoolRefill(originalRequest);
                });
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

/**
 * A decorator for bitcoin.Client commands that can be successfully retried
 * after certain errors if steps are taken to recover from the errors.
 * Calling a bitcoin.Client command that has been wrapped in this decorator
 * results in the command being called once and then re-called after taking
 * steps to recover if it fails due to a recoverable error.
 * 
 * @param command
 * @return function
 **/
Bitcoin.makeSelfRecovering = function (command) {
    
    return function () {
        var that = this;
        var callback = Bitcoin.getCallbackFromArgs(arguments);
        var originalArgs = arguments;
        var originalRequest = (function () {
            command.apply(that, originalArgs);
        });
        var args = Bitcoin.overrideCallbackInArgs(arguments,
            Bitcoin._selfRecoveringCallbackDecorator(that, originalRequest, callback));
        
        command.apply(that, args);
    };
};

/**
 * A decorator for bitcoin.Client commands. Makes an asynchronous
 * function execute synchronously if no callback is passed in.
 * 
 * @param function
 * @return function
 **/
Bitcoin.makeSynchronous = function (command) {

    return function () {
        var args = arguments;
        
        // If the user is implicitly requesting asynchronous
        // execution by passing in a callback, then give it
        // to them.
        if (Bitcoin.getCallbackFromArgs(args) !== undefined)
            return command.apply(this, args);
            
        // Otherwise, execute synchronously.
        var fut = new Future();
        
        args[args.length] = function (err, result) {
            if (err) {
                Fiber(function () {
                    TL.error("BitcoinClient.Synchronous error: " + err.toString());
                }).run();
                fut.ret(undefined);
            } else {
                fut.ret(result);
            }
        };
        args.length++;
        
        command.apply(this, args);
        
        return fut.wait();
    }
}

// Creating a copy of the bitcoin.Client class so we can
// override functions without altering the original class.
var BitcoinClient = bitcoin.Client;

// Decorate all functions that could result in a recoverable error,
// such as 'wallet locked' or 'keypool empty.'
BitcoinClient.prototype.sendToAddress = Bitcoin.makeSelfRecovering(BitcoinClient.prototype.sendToAddress);
BitcoinClient.prototype.sendFrom = Bitcoin.makeSelfRecovering(BitcoinClient.prototype.sendFrom);
BitcoinClient.prototype.sendMany = Bitcoin.makeSelfRecovering(BitcoinClient.prototype.sendMany);
BitcoinClient.prototype.getAccountAddress = Bitcoin.makeSelfRecovering(BitcoinClient.prototype.getAccountAddress);
BitcoinClient.prototype.getNewAddress = Bitcoin.makeSelfRecovering(BitcoinClient.prototype.getNewAddress);

// Make some of our functions optionally synchronous.
// Note that we should prefer the asynchronous versions if it can
// be helped, due to lower overhead. But this should save us a lot
// of Future objects in other places in our code.
BitcoinClient.prototype.getAccountAddress = Bitcoin.makeSynchronous(BitcoinClient.prototype.getAccountAddress);
BitcoinClient.prototype.getNewAddress = Bitcoin.makeSynchronous(BitcoinClient.prototype.getNewAddress);

// And finally create an instance of our modified class!
Bitcoin.Client = new BitcoinClient(Bitcoin.Settings.client);
