/**
 * Bitcoin addresses collection and loading script.
 */
var fs = Npm.require('fs');
var lazy = Npm.require('lazy');
var checkForAddressesInterval = 60000; // In milliseconds.
var addressFile = "./addresses"; // The file to pull addresses from.
 
BitcoinAddresses = new Meteor.Collection("bitcoinAddresses", {
    transform: function (doc) {
        return RewardUtils.fromJSONValue(doc);
    }
});

Meteor.setInterval(function () {
    var response;
    var errors = 0;
    
    // See if we need more Bitcoin addresses.
    var availableAddresses = BitcoinAddresses.find({
        used: false
    }).count();
    
    if (availableAddresses < Settings.minimumAddresses) {
                
        // Create a file to hold the addresses we don't use.
        unusedAddresses = fs.createWriteStream(addressFile + ".unused");
        
        // Open file containing Bitcoin addresses.
        new lazy(fs.createReadStream(addressFile))
            .lines
            .forEach(function(address){
                
                // If we don't have the maximum available number of addresses,
                // create a new address.
                if (availableAddresses < Settings.maximumAddresses
                && errors < Settings.maximumErrors) {
                    
                    // Contact Blockchain.info for a proxy address.
                    response = Meteor.http.get("https://blockchain.info/api/receive?method=create&address=" + address + "&shared=false&callback=" + Settings.callbackURI);
                    
                    // Make sure the call was successful and save the generated
                    // address if it was.
                    if (response.status == 200 && response.data != null) {
                        
                        // Insert the generated address.
                        BitcoinAddresses.insert({
                            address: address,
                            proxyAddress: response.data.destination,
                            used: false
                        });
                        
                        availableAddresses++;
                        
                    // If the call wasn't successful, keep the address in the
                    // addresses file and increment our error counter.
                    } else {
                        errors++;
                        unusedAddresses.write(address + "\n");
                    }
                    
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
