/**
 * Bitcoin addresses collection and loading script.
 */
var fs = Npm.require('fs');
var lazy = Npm.require('lazy');
var checkForAddressesInterval = 60000; // In milliseconds.
var addressFile = "addresses"; // The file to pull addresses from.
 
BitcoinAddresses = new Meteor.Collection("bitcoinAddresses", {
    transform: function (doc) {
        return RewardUtils.fromJSONValue(doc);
    }
});

Meteor.setInterval(function () {
    var minimumNumberOfAddresses = 300;  // Set these to 
    var maximumNumberOfAddresses = 6000; // whatever you like.
    
    // See if we need more Bitcoin addresses.
    var availableAddresses = BitcoinAddresses.find({
        used: false
    }).count();
    
    if (availableAddresses < minimumNumberOfAddresses) {
                
        // Create a file to hold the addresses we don't use.
        unusedAddresses = fs.createWriteStream(addressFile + ".unused");
        
        // Open file containing Bitcoin addresses.
        new lazy(fs.createReadStream(addressFile))
            .lines
            .forEach(function(address){
                
                // If we don't have the maximum available number of addresses,
                // create a new address.
                if (availableAddresses < maximumNumberOfAddresses) {
                    BitcoinAddresses.insert({
                        address: address,
                        used: false
                    });
                    availableAddresses++;
                    
                // If we do, write the address to our "unused addresses" file
                // which will later replace the file we're reading in.
                } else {
                    unusedAddresses.write(address + "\n");
                }
            }
        );
        
        // Close the write stream.
        unusedAddresses.end();
        
        // Replace the "addresses" file with the "unused addresses" file.
        fs.rename(addressFile + ".unused", addressFile);
    }
}, checkForAddressesInterval);
