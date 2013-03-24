# Getting Started


OS X / Linux / Ubuntu

1. Install [meteorite](http://oortcloud.github.com/meteorite/) ** Ubuntu 12.04 users see [here](https://github.com/oortcloud/meteorite/issues/67)

		sudo npm install -g meteorite

2. Clone this repo

		git clone https://github.com/jperl/codebounty codebounty
		cd codebounty

3. Install node packages and move them to `public` for [workaround](https://github.com/possibilities/meteor-node-modules#usage)  

		cd meteor
		sudo npm install
		sudo mv node_modules public/node_modules

4. Start meteor project (this will also install meteorite packages) `sudo mrt --settings ~/src/codebounty/meteor/settings.json`**

**Need absolute path until [this](https://github.com/oortcloud/meteorite/issues/85) issue gets fixed.

5. Start the https web server for the github.js file in another terminal**  

		cd codebounty/tools
		node web-server.js

6. (If this is your first time) Add the certificate under `tools` as a [trusted certificate](http://productforums.google.com/forum/#!topic/chrome/1b7V3cs7BS4) for your computer.

	- #####OS X  
	Open `https://localhost` in safari, choose certificate details, and select always trust this certificate, then reopen chrome and test it by visiting `https://localhost`.