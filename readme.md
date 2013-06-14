# Getting Started

###Setup Project

OS X / Linux / Ubuntu

1. Install [meteorite](http://oortcloud.github.com/meteorite/) ** Ubuntu 12.04 users see [here](https://github.com/oortcloud/meteorite/issues/67)

		sudo npm install -g meteorite

2. Clone this repo

		git clone https://github.com/codebounty/codebounty codebounty
		cd codebounty

3. Install the dependencies (only needed for testing right now)

		npm install --dev

3. (If this is your first time) Add the certificate under `tools` as a [trusted certificate](http://productforums.google.com/forum/#!topic/chrome/1b7V3cs7BS4) for your computer

		# OS X
		Open `https://localhost` in safari, choose certificate details, and select always trust this certificate, then reopen chrome and test it by visiting `https://localhost`.

4. Install dependencies for node-canvas, please check out [node-canvas wiki](https://github.com/LearnBoost/node-canvas/wiki)

5. Install Bitcoin and put this in your bitcoin.conf file:

        rpcuser=oldgregg
        rpcpassword=4Mr7LjcTbx66DpVvzkA93AvJesx6HpSY4974CXn57TXZ
        testnet=1
        server=1

	Check out [Bitcoin.org](http://bitcoin.org/en/download) for the 	Bitcoin binaries, and check out the [Bitcoin wiki](https://	en.bitcoin.it/wiki/Data_directory) for information on how to find 	your bitcoin.conf file.

	To install bitcoind on mac: `sudo port install bitcoin`

6. For testing you will also need [selenium server](http://docs.seleniumhq.org/download/) and make sure [chromedriver](https://code.google.com/p/chromedriver/downloads/list) is in your PATH.

###Run Project

        grunt server

If you are trying to test out the images use some form of tunnel like [forward](https://forwardhq.com/) or [localtunnel (free)](https://github.com/progrium/localtunnel#localtunnel-v2-beta) then update the ROOT_URL in settings.json

###Run Tests

1. Run Selenium `java -jar selenium-server.jar`
2. Run the chrome driver
3. Run `grunt test`

###Writing Tests

[Here](https://github.com/admc/wd#supported-methods) are the supported methods.
