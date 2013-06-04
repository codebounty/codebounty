/**
 * Bitcoin addresses collection and loading script.
 */
var fs = Npm.require('fs');
var readline = Npm.require('readline');

Bitcoin.IssueAddress = {};
Bitcoin.IssueAddresses = new Meteor.Collection("Bitcoin.IssueAddresses");

Bitcoin.ReceiverAddress = {};
Bitcoin.ReceiverAddresses = new Meteor.Collection("Bitcoin.ReceiverAddresses");

Meteor.setInterval(function () {
    var response;
    var errors = 0;

    // See if we need more Bitcoin addresses.
    var availableAddresses = Bitcoin.IssueAddresses.find({
        used: false
    }).count();

    // Generate some addresses if we have less than the minimum.
    if (availableAddresses < Bitcoin.Settings.minimumAddresses) {

        // Keep generating addresses until we have the maximum, or until
        // we've encountered enough errors to put us over the threshold.
        while (availableAddresses < Bitcoin.Settings.maximumAddresses && errors < Bitcoin.Settings.maximumErrors) {
            // We need these in order to keep counts of errors and addresses
            // created via the asynchronous function calls in the code that
            // calls them.
            var errCountFut = new Future();
            var addrCountFut = new Future();

            Bitcoin.Client.getNewAddress(function (err, address) {
                if (!err) {
                    Fiber(function () {
                        // Contact Blockchain.info for a proxy address.
                        response = Meteor.http.get("https://blockchain.info/api/receive?method=create&address=" + address + "&shared=false&callback=" + Bitcoin.Settings.callbackURI);

                        // Make sure the call was successful and save the generated
                        // address if it was.
                        if (response.data != null) {

                            // Insert the generated address.
                            Bitcoin.IssueAddresses.insert({
                                address: address,
                                proxyAddress: response.data.input_address,
                                used: false
                            });

                            errCountFut.ret(errors);
                            addrCountFut.ret(availableAddresses + 1);

                            // If the call wasn't successful, log the response and
                            // increment our error counter.
                        } else {
                            console.log(response.content);
                            errCountFut.ret(errors + 1);
                            addrCountFut.ret(availableAddresses);
                        }
                    }).run();
                } else {
                    // Increment our error counter and carry on.
                    console.log(err);
                    errCountFut.ret(errors + 1);
                    addrCountFut.ret(availableAddresses);
                }
            });

            // Wait until the asynchronous address
            // creation functions finish running so we can
            // keep track of how many errors occurred and
            // how many addresses were created.
            errors = errCountFut.wait();
            availableAddresses = addrCountFut.wait();
        }
    }
}, Bitcoin.Settings.addressRefillInterval);