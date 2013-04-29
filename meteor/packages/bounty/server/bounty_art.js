var fs = Npm.require("fs"), path = Npm.require("path"),
    basepath = path.resolve(".") + "/packages/bounty/";

console.log(basepath);

/**
 * generates the bounty status image
 * @param bountyId
 * @param callback passed a {Canvas}
 */
Bounty.statusImage = function (bountyId, callback) {
    var bounty = Bounties.findOne(bountyId);

    var status;
    if (bounty.reward) {
        if (bounty.reward.paid) {
            status = "Paid";
        } else if (bounty.reward.planned) {
            status = "Planned " + bounty.reward.planned;
        }
    } else if (bounty.approved) {
        status = "Open";
    } else {
        status = "Error?";
    }

    var currencySymbol = "$";

    //TODO make this pretty
    var canvas = new Canvas(1146, 592),
        ctx = canvas.getContext("2d");

    //load bounty example example
    fs.readFile(basepath + "assets/bountyExample.png", function (err, src) {
        if (err) throw err;
        var img = new Image;
        img.src = src;

        ctx.drawImage(img, 0, 0, img.width, img.height);

        var leftOffset = 442;

        ctx.font = "60px Arial bold";
        var statusHeader = "Bounty now " + status;
        ctx.fillText(statusHeader, leftOffset, 130);

        ctx.font = "42px Arial bold";
        var bountyAmount = "The bounty is posted for " + currencySymbol + bounty.amount;
        ctx.fillText(bountyAmount, leftOffset, 213);
        var bountyExpiration = "Expires: " + "May 20th, 2013 at 12am";
        ctx.fillText(bountyExpiration, leftOffset, 272);

        ctx.font = "34px Arial bold";
        var sitePlug = "Get Code Bounty now"
        ctx.fillText(sitePlug, leftOffset+300, 505);

        ctx.font = "30px Arial";
        var siteLink = "codebounty.co"
        ctx.fillText(siteLink, leftOffset+445, 540);

        callback(canvas);
    });
};