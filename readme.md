# Getting Started


Mac OSX / Linux / Ubuntu

1. Install [meteorite](http://oortcloud.github.com/meteorite/) ** Ubuntu 12.04 users see [here](https://github.com/oortcloud/meteorite/issues/67)

		sudo npm install -g meteorite

2. Clone this repo

		git clone https://github.com/jperl/codebounty codebounty
		cd codebounty

3. Install node packages and move them to `public` for [workaround](https://github.com/possibilities/meteor-node-modules#usage)  

		cd meteor
		sudo npm install
		sudo mv node_modules public/node_modules

4. Start project (this will also install meteorite packages) `mrt`