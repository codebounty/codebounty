//var rootUrl = Meteor.settings["ROOT_URL"];
var rootUrl = "http://localhost:3000";

Messenger = {
    target: {
        application: rootUrl,
        plugin: "https://github.com"
    }
};

/**
 *
 * @param message
 * @param [target] Defaults to all
 */
Messenger.send = function (message, target) {
    if (!target)
        target = "*";

    top.postMessage(message, target);
};

var eventCallbacks = [];
/**
 * Listen for whenever an event is called
 * @param name
 * @param callback
 */
Messenger.registerEvent = function (name, callback) {
    var callbacks = eventCallbacks[name];
    if (!callbacks)
        callbacks = eventCallbacks[name] = [];

    callbacks.push(callback);
};

//listen for messages
window.addEventListener("message", function (event) {
    //only process messages from known targets
    var knownTarget = _.some(Messenger.target, function (target) {
        return  event.origin === target;
    });
    if (!knownTarget)
        return;

    var message = event.data;

    //if there is an event parameter, trigger any registered event callbacks
    if (message.event) {
        var callbacks = eventCallbacks[message.event];
        if (callbacks)
            _.each(callbacks, function (callback) {
                callback(message);
            });
    }

    //if there is a method parameter, the sender wants to call a meteor method
    if (message.method) {
        //setup Meteor.call params (methodName, param1, param2..., callback)
        var callParams = [message.method];
        callParams = _.union(callParams, message.params);

        //add the callback
        callParams.push(function (error, result) {
            Messenger.send({id: message.id, error: error, result: result}, Messenger.target.plugin);
        });

        Meteor.call.apply(null, callParams);
    }
}, false);
