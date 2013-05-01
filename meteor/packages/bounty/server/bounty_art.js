var fs = Npm.require("fs"), path = Npm.require("path"),
    basepath = path.resolve(".") + "/packages/bounty/";

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
            status = "paid";
        } else if (bounty.reward.planned) {
            status = "planned " + bounty.reward.planned;
        }
    } else if (bounty.approved) {
        status = "open";
    } else {
        status = "error?";
    }

    var currencySymbol = "$";
    var leftOffset = 442;
    var width = 1146;
    var height = 592;
    var backgroundColor = "#E1C39B";
    var textColor = "#333333";

    //TODO make this pretty
    var canvas = new Canvas(width, height),
        ctx = canvas.getContext("2d");

    //load bounty example example
    fs.readFile(basepath + "assets/bountyExample.png", function (err, src) {
        if (err) throw err;

        //Draw background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);

        //Reset color
        ctx.fillStyle = textColor;

        //Draw img asset
//        var img = new Image;
//        img.src = src;
//        ctx.drawImage(img, 0, 0, img.width, img.height);

        //Draw Bounty status
        ctx.font = "bold 60px Western";
        var statusHeader = "BOUNTY NOW " + status.toUpperCase() + "!";
        ctx.fillText(statusHeader, leftOffset, 130);

        //Draw bounty amount and expiration
        ctx.font = "bold 42px Arial";
        var bountyAmount = "The bounty is posted for " + currencySymbol + bounty.amount;
        ctx.fillText(bountyAmount, leftOffset, 213);
        var bountyExpiration = "Expires: " + "May 20th, 2013 at 12am";
        ctx.fillText(bountyExpiration, leftOffset, 272);

        //Draw codebounty plug and link
        ctx.textAlign = "right";
        ctx.font = "34px Arial";
        var sitePlug = "Get Code Bounty now"
        ctx.fillText(sitePlug, width-56, 505);
        ctx.font = "30px Arial";
        var siteLink = "codebounty.co"
        ctx.fillText(siteLink, width-56, 540);

        callback(canvas);
    });
};