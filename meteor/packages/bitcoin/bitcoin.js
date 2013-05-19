//Contains all logic for interacting with Bitcoin

Bitcoin = {};

/***********************************************
 * Returns a BitcoinAddress for the given issue/
 * user pair. If one does not exist, it assigns
 * one from the pool of unassigned addresses.
 * @param userId
 * @param url
 * @return {BitcoinAddress}
 **/
Bitcoin.addressForIssue = function (userId, url) {
    var address = BitcoinAddresses.findOne(
    { url: url, userId: userId }, { reactive: false });
     
    // If there is no address associated with this user and issue,
    // grab an unused one and associate it.
    if (!address) {
        address = BitcoinAddresses.findOne(
           { used: false }, { reactive: false } );
           
        if (address) {
            Fiber(function () {
                BitcoinAddresses.update({ address: address.address },
                    { $set: { used: true, url: url, userId: userId } });
            }).run();
        } else {
            throw "no bitcoin addresses loaded!";
        }
    }
    
    return address;
};
