/**
 * Bitcoin addresses collection and loading script.
 */
var fs = Npm.require("fs");
var readline = Npm.require("readline");

Bitcoin.IssueAddress = {};
Bitcoin.IssueAddresses = new Meteor.Collection("Bitcoin.IssueAddresses");

Bitcoin.ReceiverAddress = {};
Bitcoin.ReceiverAddresses = new Meteor.Collection("Bitcoin.ReceiverAddresses");

Bitcoin.TemporaryReceiverAddress = {};
Bitcoin.TemporaryReceiverAddresses = new Meteor.Collection("Bitcoin.TempReceiverAddresses");

/**
 * Request a proxy address from blockchain.info.
 * This address allows us to listen for callbacks when it gets funded.
 * @param address
 * @returns proxyAddress
 */
Bitcoin.requestProxyAddress = function (address) {
    var addressFut = new Future();

    Fiber(function () {
        var response;
        
        // Occasionally Blockchain.info fails when we ask it for a proxy
        // address. Putting this in a try/catch block allows us to save state
        // when it fails and pick up where we left off next time around.
        try {
            // Contact Blockchain.info for a proxy address.
            response = Meteor.http.get("https://blockchain.info/api/receive?method=create&address=" + address + "&shared=false&callback=" + Bitcoin.Settings.callbackURI);

            if (response.data) {
                addressFut.ret(response.data.input_address);
            } else {
                TL.error(response.content(), Modules.Bitcoin);
                addressFut.ret(undefined);
            }
        } catch (err) {
            TL.error("Blockchain.info API error: " + err.toString());
            addressFut.ret(undefined);
        }
    }).run();

    return addressFut.wait();
};

Bitcoin._updateWithNewProxyAddress = function (address) {
    var proxyAddress = Bitcoin.requestProxyAddress(address.address);

    if (proxyAddress) {
        // Update the now-proxied address.
        address.proxyAddress = response.data.input_address;

        Fiber(function () {
            Bitcoin.IssueAddresses.update(
                { "_id": address._id },
                { $set: { proxyAddress: address.proxyAddress } }
            );
        });

        return address;
    }
        
    return false;
};

Bitcoin._createWithNewProxyAddress = function (address) {
    var proxyAddress = Bitcoin.requestProxyAddress(address);

    if (proxyAddress) {
        var idFut = new Future();
        var addressObj = {
            address: address,
            proxyAddress: proxyAddress,
            used: false
        };
        
        Fiber(function () {
            idFut.ret(Bitcoin.IssueAddresses.insert(addressObj));
        }).run();
        
        addressObj._id = idFut.wait();
        
        return addressObj;
    }
    return false;
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
            && Bitcoin._updateWithNewProxyAddress(unproxiedAddresses.pop())) {
                availableAddresses++;

            // Otherwise, create a new address and try to get a proxy for it.
            } else {
                var address = Bitcoin.Client.getNewAddress();
                if (address) {
                    if (Bitcoin._createWithNewProxyAddress(address)) {
                        availableAddresses++;
                    } else {
                        // Remember that we were unable to create a proxy
                        // address for this address so we can come back to
                        // it later.
                        Fiber(function () {
                            Bitcoin.IssueAddresses.insert({
                                address: address,
                                used: false
                            });
                        }).run()
                        
                        errors++;
                    }
                } else {
                    errors++
                }
            }
        }
    }
}, Bitcoin.Settings.addressRefillInterval);
