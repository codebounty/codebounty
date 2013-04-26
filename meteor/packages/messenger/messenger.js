Messenger = {};

var listening = false;

var processMessage = function (message) {
    if (!message.method)
        return;

    //setup Meteor.call params (methodName, param1, param2..., callback)
    var callParams = [message.method];
    callParams = _.union(callParams, message.params);

    //add the callback
    callParams.push(function (error, result) {
        Messenger.send({id: message.id, error: error, result: result});
    });

    Meteor.call.apply(null, callParams);
};

Messenger.send = function (message) {
    top.postMessage(message, "https://github.com")
};

//listen for messages
Messenger.listen = function () {
    if (listening)
        return;

    listening = true;

    window.addEventListener("message", function (evt) {
        if (evt.origin !== "https://github.com")
            return;

        processMessage(evt.data);
    }, false);
};