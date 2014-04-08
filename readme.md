This project is not in continued development -- it was a fun experiment to learn meteor. There are a lot of tools to help fund [open source projects](bountysource.com) but feel free to use this code however you like.

An Open Source Bounty System
----------------------------

As a project gets more popular, the increase in resources for a project are outstripped by the increase in demand for feature additions and bug fixes.

Development
-----------
###Setup Project

OS X / Linux / Ubuntu

1. Install [meteor](http://docs.meteor.com/#quickstart) and [meteorite](http://oortcloud.github.com/meteorite/):

        curl https://install.meteor.com | /bin/sh
		npm install -g meteorite

2. Clone this repo:

		git clone https://github.com/codebounty/codebounty codebounty
		cd codebounty

3. Install the dependencies:

		npm install --dev && cd meteor && mrt install && cd ../

4. Install dependencies for node-canvas, please check out [node-canvas wiki](https://github.com/LearnBoost/node-canvas/wiki).

5. Install Bitcoin and put this in your bitcoin.conf file:

        rpcuser=oldgregg
        rpcpassword=4Mr7LjcTbx66DpVvzkA93AvJesx6HpSY4974CXn57TXZ
        testnet=1
        server=1

	Check out [Bitcoin.org](http://bitcoin.org/en/download) for the Bitcoin binaries, and check out the [Bitcoin wiki](https://	en.bitcoin.it/wiki/Data_directory) for information on how to find 	your bitcoin.conf file.

	To install bitcoind on mac: `sudo port install bitcoin`

6. For testing you will also need to download [chromedriver](https://code.google.com/p/chromedriver/downloads/list) into a folder and add that folder to your PATH.

7. Copy and rename `config.json.example` to `config.json`.

8. Copy `settings.local.json.example` to `meteor/settings.local.json`.

###Run Project

Run `grunt server`.

If you are trying to test out the images, or the paypal callback, use some form of tunnel like [forward](https://forwardhq.com/) or [localtunnel (free)](https://github.com/progrium/localtunnel#localtunnel-v2-beta) then update the ROOT_URL in settings.json.

If you want to debug the server:

- Install [node-inspector](https://github.com/dannycoates/node-inspector): `npm install -g node-inspector`
- Run `grunt server:debug` in one terminal.
- Run `node-inspector` in another terminal.
- Open the inspector url.

###Run Tests

Download [selenium server](http://docs.seleniumhq.org/download/) then run it `java -jar selenium-server.jar` in one terminal, `grunt server` in another, then `grunt test` in another.

To debug tests run `grunt test:debug` instead, and `node-inspector`.

###Write Tests

Tests are written using [cucumber-js](https://github.com/cucumber/cucumber-js) and Selenium's [WebDriverJs](https://code.google.com/p/selenium/wiki/WebDriverJs).

Discussion
-----------

- [Hackpad](https://codebounty.hackpad.com)
