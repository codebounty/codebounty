//Contains all logic for interacting with Bitcoin

Bitcoin = {};

/***********************************************
 * Returns a Bitcoin.IssueAddress for the given issue / user pair.
 * If one does not exist, it assigns one from the pool of unassigned addresses.
 * @param userId
 * @param url
 * @return {Bitcoin.IssueAddress}
 **/
Bitcoin.addressForIssue = function (userId, url) {
    var address = Bitcoin.IssueAddresses.findOne({ url: url, userId: userId });
    if (address)
        return address;

    // If there is no address associated with this user and issue,
    // grab an unused one and associate it.
    address = Bitcoin.IssueAddresses.findOne({
        used: false, proxyAddress: { $exists: true }
    });
    if (!address)
        throw "No bitcoin addresses loaded!";

    Fiber(function () {
        Bitcoin.IssueAddresses.update({ address: address.address },
            { $set: { used: true, url: url, userId: userId } });

        // Set the address's "account" via bitcoind,
        // for extra data redundancy.
        Bitcoin.Client.setAccount(address.address, userId + ":" + url);
    }).run();

    return address;
};

/*****************************************************
 * Checks a Blockchain.info request for the secret key
 * defined in Bitcoin.IPNSecret.
 * @param request
 * @param response
 * @param callback
 **/
Bitcoin.verify = function (request, response, callback) {
    var error = null;
    var params = request.query;

    if (params.secret != Bitcoin.IPNSecret) {
        error = "Incorrect secret for Bitcoin IPN: " + params.secret;
        TL.error(error, Modules.Bitcoin);
    }

    if (callback)
        callback(error, params);
};

/**
 * Make a payment to a set of receivers
 * @param address The address we're paying from.
 * @param receiverList ex. [{email: "perl.jonathan@gmail.com", amount: 100.12}, ..]
 * @param callback (error, data)
 */
Bitcoin.pay = function (address, receiverList, callback) {
    // Make sure that we're not paying more than our receiving address received.
    var totalPayout = BigUtils.sum(_.pluck(receiverList, "amount"));

    // We're using getReceivedByAddress instead of getting the balance of the
    // address because the address could technically be empty. We're only
    // keeping a small portion of the total bounties in the hot wallet.
    Bitcoin.Client.getReceivedByAddress(address, function (err, received) {

        // After fees, total payout should be less than what this address received.
        if (totalPayout.lte(received)) {
            _.each(receiverList, function (receiver) {

                Fiber(function () {
                    // Look for a Bitcoin address for this recipient.
                    // If they don't have one yet, grant them a temporary one
                    // on our server. When they join and set a Bitcoin address,
                    // we'll check for the temporary address and send its
                    // contents to the address they set.
                    var payoutAddress = Bitcoin.ReceiverAddresses.findOne(
                        {"email": receiver.email}, {"reactive": false});

                    if (payoutAddress) {
                        // Send the amount owed the recipient.
                        Bitcoin.Client.sendToAddress(payoutAddress.address, receiver.amount);

                    } else {
                        // Grant the recipient an address in our hot wallet
                        // and then send the amount owed to that address.
                        Bitcoin.Client.getAccountAddress(receiver.email,
                            function (err, payoutAddress) {
                                Bitcoin.Client.sendToAddress(payoutAddress, receiver.amount);
                            });
                    }
                }).run();
            });

            // Okay, if that's not the case, we need to raise an alarm.
            // We're doing this check because the application should never enter
            // this state under its normal operating parameters. It's possible
            // someone's trying to hack us, as this should be a fairly obvious
            // attack vector.
        } else {
            Fiber(function () {
                // Only logging the error. It's a good idea to give out less
                // information rather than more in cases like this.
                TL.error("Payout greater than bitcoin received " +
                    "attempted from Bitcoin address " + address + ". Payout was " +
                    totalPayout.toString() + " and total received was " + received, Modules.Bitcoin);
            }).run()
        }
    });
};
