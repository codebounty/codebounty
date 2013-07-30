/**
 * Bitcoin addresses collection and loading script.
 */
var fs = Npm.require("fs");
var readline = Npm.require("readline");

Bitcoin.IssueAddress = {};
Bitcoin.IssueAddresses = new Meteor.Collection("Bitcoin.IssueAddresses");

Bitcoin.ReceiverAddress = {};
Bitcoin.ReceiverAddresses = new Meteor.Collection("Bitcoin.ReceiverAddresses");

/**
 * Request a proxy address from blockchain.info.
 * This address allows us to listen for callbacks when it gets funded.
 * @param address
 * @returns {*}
 */
Bitcoin.requestProxyAddress = function (address) {
    var response;
    var successFut = new Future();

    Fiber(function () {

        // Occasionally Blockchain.info fails when we ask it for a proxy
        // address. Putting this in a try/catch block allows us to save state
        // when it fails and pick up where we left off next time around.
        try {
            // Contact Blockchain.info for a proxy address.
            response = Meteor.http.get("https://blockchain.info/api/receive?method=create&address=" + address + "&shared=false&callback=" + Bitcoin.Settings.callbackURI);

            // If the call wasn't successful, log the response and
            // increment our error counter.
            if (response.data === null) {

                TL.error(response.content(), Modules.Bitcoin);
                successFut.ret(false);
                return;
            }

            // Save the generated address.
            if (address._id) {
                // Update the now-proxied address.
                address.proxyAddress = response.data.input_address;

                Bitcoin.IssueAddresses.update(
                    { "_id": address._id },
                    { $set: { proxyAddress: address.proxyAddress } }
                );
            } else {
                // Insert the new address.
                Bitcoin.IssueAddresses.insert({
                    address: address,
                    proxyAddress: response.data.input_address,
                    used: false
                });
            }

            successFut.ret(true);
        } catch (err) {
            TL.error("Blockchain.info API error: " + err.toString());

            // Go ahead and insert the new address if it's new.
            // We'll just leave out the proxyAddress field and
            // return to fill it in later.
            if (!address._id) {
                Bitcoin.IssueAddresses.insert({
                    address: address,
                    used: false
                });
            }
        }

        successFut.ret(false);
    }).run();

    return successFut.wait();
};

Meteor.setInterval(function () {
    var response;
    var errors = 0;

    // See if we need more Bitcoin addresses.
    var availableAddresses = Bitcoin.IssueAddresses.find({
        used: false, proxyAddress: { $exists: true }
    }).count();

    // Generate some addresses if we have less than the minimum.
    if (availableAddresses < Bitcoin.Settings.minimumAddresses) {

        // If there are any addresses left without proxy addresses
        // due to a failed call to Blockchain.info, we want to put
        // those first in line and get proxy addresses generated
        // for those before we start generating new addresses.
        var unproxiedAddresses = Bitcoin.IssueAddresses.find({
            proxyAddress: { $exists: false }
        }).fetch();

        // Keep generating addresses until we have the maximum, or until
        // we've encountered enough errors to put us over the threshold.
        while (availableAddresses < Bitcoin.Settings.maximumAddresses
            && errors < Bitcoin.Settings.maximumErrors) {

            // If there are addresses left over from previous runs that
            // have not yet received proxy addresses from Blockchain.info,
            // try assigning them proxy addresses again.
            if (unproxiedAddresses.length > 0
                && Bitcoin.requestProxyAddress(unproxiedAddresses.pop().address)) {
                availableAddresses++;

                // Otherwise, create a new address and try to get a proxy for it.
            } else {
                var addrFuture = new Future();

                Bitcoin.Client.getNewAddress(function (error, address) {
                    if (!error) {
                        addrFuture.ret(address);
                    } else {
                        Fiber(function () {
                            TL.error("Error getting a new address: " + EJSON.stringify(error), Modules.Bitcoin);
                        }).run();

                        addrFuture.ret(undefined);
                    }
                });

                // Wait for for our request for a new address to finish,
                // and then try to get a proxy for it if was successful.
                var address = addrFuture.wait();
                if (address && Bitcoin.requestProxyAddress(address)) {
                    availableAddresses++;
                } else {
                    errors++;
                }
            }
        }
    }
}, Bitcoin.Settings.addressRefillInterval);
