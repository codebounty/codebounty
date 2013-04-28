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

    //TODO make this legit / pretty
    var canvas = new Canvas(1146, 592),
        ctx = canvas.getContext("2d");

    //load bounty example example
    fs.readFile(basepath + "assets/bountyExample.png", function (err, src) {
        if (err) throw err;
        var img = new Image;
        img.src = src;

        ctx.drawImage(img, 0, 0, img.width, img.height);

        ctx.font = "30px Arial";
        var text = "Amount $" + bounty.amount + " " + status;
        ctx.fillText(text, 500, 50);

        callback(canvas);
    });
};