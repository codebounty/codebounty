# Getting Started

###Setup Project

1. Need cairo installed, see [here](https://github.com/LearnBoost/node-canvas/wiki/_pages)

OS X / Linux / Ubuntu

1. Install [meteorite](http://oortcloud.github.com/meteorite/) ** Ubuntu 12.04 users see [here](https://github.com/oortcloud/meteorite/issues/67)

		sudo npm install -g meteorite

2. Clone this repo

		git clone https://github.com/jperl/codebounty codebounty
		cd codebounty

3. (If this is your first time) Add the certificate under `tools` as a [trusted certificate](http://productforums.google.com/forum/#!topic/chrome/1b7V3cs7BS4) for your computer

	- #####OS X  
	Open `https://localhost` in safari, choose certificate details, and select always trust this certificate, then reopen chrome and test it by visiting `https://localhost`.

###Run Project

1. Start meteor project (this will also install meteorite packages) `sudo mrt --settings settings.json`

2. Start the https web server for the github.js file in another terminal**  

		cd codebounty/tools
		node web-server.js
			
3. If you are trying to test out the images use some form of tunnel like [forward](https://forwardhq.com/) or [localtunnel (free)](https://github.com/progrium/localtunnel#localtunnel-v2-beta) then update the ROOT_URL in settings.json