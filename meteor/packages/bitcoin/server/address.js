/**
 * Bitcoin addresses collection and loading script.
 */
var fs = Npm.require('fs');
var readline = Npm.require('readline');
var checkForAddressesInterval = 60000; // In milliseconds.
var addressFile = "./addresses"; // The file to pull addresses from.
 
BitcoinAddresses = new Meteor.Collection("bitcoinAddresses");

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
        readline.createInterface({
            input: fs.createReadStream(addressFile),
            terminal: false
        }).on('line', function(address){

                // If we don't have the maximum available number of addresses,
                // create a new address.
                if (availableAddresses < Settings.maximumAddresses
                && errors < Settings.maximumErrors
                && address != "") {
                    
                    Fiber(function () {
                        // Contact Blockchain.info for a proxy address.
                        response = Meteor.http.get("https://blockchain.info/api/receive?method=create&address=" + address + "&shared=false&callback=" + Settings.callbackURI);
                    
                        // Make sure the call was successful and save the generated
                        // address if it was.
                        if (response.data != null) {
                            
                            // Insert the generated address.
                            BitcoinAddresses.insert({
                                address: address,
                                proxyAddress: response.data.input_address,
                                used: false
                            });
                            
                        // If the call wasn't successful, keep the address in the
                        // addresses file and increment our error counter.
                        } else {
                            console.log(response.content);
                        }
                    }).run();
                    
                    availableAddresses++;
                    
                // If we do, write the address to our "unused addresses" file
                // which will later replace the file we're reading in.
                } else {
                    unusedAddresses.write(address + "\n");
                }
            });
        
        // Close the write stream.
        unusedAddresses.end();
        
        if (availableAddresses > 0)
            // Replace the "addresses" file with the "unused addresses" file.
            fs.rename(addressFile + ".unused", addressFile);
    }
}, checkForAddressesInterval);
