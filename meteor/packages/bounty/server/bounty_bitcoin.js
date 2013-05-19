// Contains Bitcoin bounty interactions
Bounty.Bitcoin = {};

//note when testing, this must go through a tunnel for the GitHub comment image
var rootUrl = Meteor.settings["ROOT_URL"];

/**
 * Create a bounty payment
 * @param bounty
 * @param callback pass the url to redirect to
 */
Bounty.Bitcoin.create = function (bounty, callback) {
    throw "Not implemented yet.";
};

/**
 * After an ipn message confirms a bounty payment has been authorized,
 * updated the associated Bounty object to 'approved' status.
 * (This may get refactored out since Bitcoin payment isn't a two-step process.)
 * @param params The IPN message parameters
 */
Bounty.Bitcoin.confirm = function (params) {
    throw "Not implemented yet.";
};

Bounty.Bitcoin.pay = function (bounty, receiverList) {
    throw "Not implemented yet.";
};
