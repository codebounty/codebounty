//Contains all logic for interacting with BitcoinLocal

BitcoinLocal = {};

/***********************************************
 * Returns a BitcoinLocal.IssueAddress for the given issue / user pair.
 * If one does not exist, it assigns one from the pool of unassigned addresses.
 * @param userId
 * @param url
 * @return {BitcoinLocal.IssueAddress}
 **/
BitcoinLocal.addressForIssue = function (userId, url) {
    var address = BitcoinLocal.IssueAddresses.findOne({ url: url, userId: userId });
    if (address)
        return address;

    var addressFut = new Future();

    Fiber(function () {
        // If there is no address associated with this user and issue,
        // grab an unused one and associate it.
        address = BitcoinLocal.IssueAddresses.findOne({
            used: false, proxyAddress: { $exists: true }
        });

        if (address) {

            // Update our local instance and then the instance in the database.
            address.used = true;
            address.url = url;
            address.userId = userId;

            Fiber(function () {
                BitcoinLocal.IssueAddresses.update({ address: address.address },
                    { $set: { used: true, url: url, userId: userId } });

                // Set the address's "account" via bitcoind,
                // for extra data redundancy.
                BitcoinLocal.Client.setAccount(address.address, userId + ":" + url);
            }).run();

            addressFut.ret(address);
            return;
        }
        BitcoinLocal._insertAddressForIssue(userId, url, function (addressObj) {
            addressFut.ret(addressObj);
        });
    }).run();
    return addressFut.wait();
};

/*****************************************************
 * Checks a Blockchain.info request for the secret key
 * defined in BitcoinLocal.IPNSecret.
 * @param request
 * @param response
 * @param callback
 **/
BitcoinLocal.verify = function (request, response, callback) {
    var error = null;
    var params = request.query;

    if (params.secret != BitcoinLocal.IPNSecret) {
        error = "Incorrect secret for BitcoinLocal IPN: " + params.secret;
        Fiber(function () {
            TL.error(error, Modules.BitcoinLocal);
        }).run();
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
BitcoinLocal.pay = function (address, receiverList, callback) {
    // Make sure that we're not paying more than our receiving address received.
    var totalPayout = BigUtils.sum(_.pluck(receiverList, "amount"));

    // We're using getReceivedByAddress instead of getting the balance of the
    // address because the address could technically be empty. We're only
    // keeping a small portion of the total bounties in the hot wallet.
    BitcoinLocal.Client.getReceivedByAddress(address, function (err, received) {

        // The total payout should not be greater than what was received.
        // If that's not the case, we need to raise an alarm,
        // it is possible someone is trying to hack us.
        if (totalPayout.gt(received)) {
            Fiber(function () {
                // Only logging the error. It's a good idea to give out less
                // information rather than more in cases like this.
                TL.error("Payout greater than bitcoin received " +
                    "attempted from BitcoinLocal address " + address + ". Payout was " +
                    totalPayout.toString() + " and total received was " + received, Modules.BitcoinLocal);
            }).run();

            return;
        }

        Fiber(function () {
            _.each(receiverList, function (receiver) {
                // Look for a BitcoinLocal address for this recipient.
                // If they don't have one yet, grant them a temporary one
                // on our server. When they join and set a BitcoinLocal address,
                // we'll check for the temporary address and send its
                // contents to the address they set.
                var payoutAddress = BitcoinLocal.ReceiverAddresses.findOne(
                    {"email": receiver.email}, {"reactive": false});

                if (payoutAddress) {
                    // Send the amount owed the recipient.
                    BitcoinLocal.Client.sendToAddress(payoutAddress.address, receiver.amount);
                    return;
                }

                var tempAddress = BitcoinLocal.TemporaryReceiverAddresses.findOne(
                    { email: receiver.email });

                if (tempAddress) {
                    BitcoinLocal.Client.sendToAddress(tempAddress.address, receiver.amount);
                    return;
                }

                // Grant the recipient an address in our hot wallet (if they
                // don't have one yet) and then send the amount owed to that
                // address.
                BitcoinLocal.Client.getAccountAddress(receiver.email,
                    function (err, payoutAddress) {
                        if (err) {
                            Fiber(function () {
                                TL.error("getAccountAddress error: " + EJSON.stringify(err));
                            }).run();
                            return;
                        }

                        BitcoinLocal.Client.sendToAddress(payoutAddress, receiver.amount);

                        // Save the temporary address for this user so we
                        // don't bother bitcoind for a new one later if the
                        // same user gets another reward before signing up.
                        Fiber(function () {
                            BitcoinLocal.TemporaryReceiverAddresses.insert({
                                email: receiver.email,
                                address: payoutAddress
                            });
                        }).run();
                    });
            });
        }).run();
    });
};