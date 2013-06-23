Code Bounty
===========

An Open Source Bounty System
----------------------------

As a project gets more popular, the increase in resources for a project are outstripped by the increase in demand for feature additions and bug fixes.

Our goal is to help create a sustainable model for the suppliers of open source code by putting the weight of cash behind issues.

Copyright © 2013 Code Bounty Developers

Development
-----------
###Setup Project

OS X / Linux / Ubuntu

1. Install [meteorite](http://oortcloud.github.com/meteorite/): **

		sudo npm install -g meteorite
		
	**Ubuntu 12.04 users see [here](https://github.com/oortcloud/meteorite/issues/67).

2. Clone this repo:

		git clone https://github.com/codebounty/codebounty codebounty
		cd codebounty

3. Install the dependencies:

		npm install --dev

4. Install dependencies for node-canvas, please check out [node-canvas wiki](https://github.com/LearnBoost/node-canvas/wiki).

5. Install Bitcoin and put this in your bitcoin.conf file:

        rpcuser=oldgregg
        rpcpassword=4Mr7LjcTbx66DpVvzkA93AvJesx6HpSY4974CXn57TXZ
        testnet=1
        server=1

	Check out [Bitcoin.org](http://bitcoin.org/en/download) for the 	Bitcoin binaries, and check out the [Bitcoin wiki](https://	en.bitcoin.it/wiki/Data_directory) for information on how to find 	your bitcoin.conf file.

	To install bitcoind on mac: `sudo port install bitcoin`

6. For testing you will also need to download [chromedriver](https://code.google.com/p/chromedriver/downloads/list) into a folder and add that folder to your PATH.

###Run Project

Run `grunt server`.

If you are trying to test out the images, or the paypal callback, use some form of tunnel like [forward](https://forwardhq.com/) or [localtunnel (free)](https://github.com/progrium/localtunnel#localtunnel-v2-beta) then update the ROOT_URL in settings.json.

###Run Tests

Run `java -jar tools/selenium-server.jar` in one terminal to start the selenium server, `grunt server` in another, then `grunt test` in another.

###Write Tests

[Here](https://github.com/admc/wd#supported-methods) are the supported wd methods**

** wd's methods are wrapped in Dojo promises [here](https://github.com/theintern/intern/blob/master/lib/wd.js) by intern in a class called PromisedWebDriver.

Discussion
-----------

- [Hackpad](https://codebounty.hackpad.com)
