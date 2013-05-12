var fs = Npm.require("fs"), path = Npm.require("path"),
    basepath = path.resolve(".") + "/packages/bounty";

/**
 * generates the bounty status image
 * @param bountyId
 * @param callback passed a {Canvas}
 */
Bounty.statusImage = function (bountyId, callback) {
    var Font = Canvas.Font;

    // var bounty = Bounties.findOne(bountyId);
    
    // TODO: debug purpose, remove it later
    var bounty = {
        "status": "reopened",
        "amount": "10",
        "cashLevel": 3,
        "user": "John Doe"
    }
    var status = bounty.status;

    // var status;
    // if (bounty.reward) {
    //     if (bounty.reward.paid) {
    //         status = "paid";
    //     } else if (bounty.reward.planned) {
    //         status = "planned " + bounty.reward.planned;
    //     }
    // } else if (bounty.approved) {
    //     status = "open";
    // } else {
    //     status = "error?";
    // }
    
    var assetFile = function (name) {
        return path.join(basepath, "/assets/", name);
    }


    var currencySymbol = "$";
    var leftOffset = 271;
    var rightOffset = 42;
    var width = 715;
    var height = 370;
    var backgroundColor = "#E0C39D";
    var textColor = "#484640";

    // TODO make this pretty
    var canvas = new Canvas(width, height),
        ctx = canvas.getContext("2d");

    // Setup fonts     
    var statusHeaderFontName = "Woodshop";
    var statusHeaderFontFile = "Woodshop-Regular.otf";
    var statusHeaderFontColor = "#484640";
    var statusHeaderFontSize = "39px";
    var statusHeaderFontFace = "normal";
    var statusHeaderFont = new Font(statusHeaderFontName, assetFile(statusHeaderFontFile));
    ctx.addFont(statusHeaderFont);

    var statusContentFontName = '"Futura LT Heavy"';
    var statusContentFontFile = "Futura-LT-Heavy.otf";
    var statusContentFontColor = "#78665A";
    var statusContentFontSize = "30.24px";
    var statusContentFontFace = "normal";
    var statusContentFont = new Font(statusContentFontName, assetFile(statusContentFontFile));
    ctx.addFont(statusContentFont);

    var statusFooterFontName = '"Futura LT"';
    var statusFooterFontFile = "Futura-LT.ttf";
    var statusFooterFontColor = "#484640";
    var statusFooterFontSize = "30.24px";
    var statusFooterSmallerFontSize = "20px";
    var statusFooterFontFace = "normal";
    var statusFooterFont = new Font(statusFooterFontName, assetFile(statusFooterFontFile));
    ctx.addFont(statusFooterFont);

     // Draw background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Reset color
    ctx.fillStyle = textColor;

    // Draw Bounty status
    // TODO: exclamation mark is not included in font Woodshop, so in the
    // original design, it is replaced by using Myriad Pro.
    ctx.font = statusHeaderFontFace + " " + statusHeaderFontSize + " " + statusHeaderFontName;
    ctx.fillStyle = statusHeaderFontColor;
    var statusHeader;
    if (status == "open")
        statusHeader = "BOUNTY NOW OPEN!";
    else if (status == "closed")
        statusHeader = "BOUNTY CLOSED";
    else if (status == "reopened")
        statusHeader = "BOUNTY REOPENED";
    else
        throw "Unknown bounty status";
    ctx.fillText(statusHeader, leftOffset, 80);

    // Draw bounty amount and expiration
    ctx.font = statusContentFontFace + " " + statusContentFontSize + " " + statusContentFontName;
    ctx.fillStyle = statusContentFontColor;
    var bountyAmount = "The bounty is posted for " + currencySymbol + bounty.amount;
    ctx.fillText(bountyAmount, leftOffset, 133);
    var bountyExpiration = "Expires: " + "May 20th, 2013 at 12am";
    ctx.fillText(bountyExpiration, leftOffset, 170);

    //Draw codebounty plug and link
    ctx.textAlign = "right";
    ctx.fillStyle = statusFooterFontColor;
    ctx.font = statusFooterFontFace + " " + statusFooterFontSize + " " + statusFooterFontName;
    var posterUser = "Posted by " + bounty.user;
    ctx.fillText(posterUser, width - rightOffset, 305);
    ctx.font = statusFooterFontFace + " " + statusFooterSmallerFontSize + " " + statusFooterFontName;
    var siteLink = "codebounty.co"
    ctx.fillText(siteLink, width - rightOffset, 336);

    // Draw bounty status image
    var bountyStatusImageFile;
    if (status == "open")
        bountyStatusImageFile = "banner-bounty-open.png";
    else if (status == "closed")
        bountyStatusImageFile = "banner-bounty-closed.png";
    else if (status == "reopened")
        bountyStatusImageFile = "banner-bounty-reopened.png";
    else
        throw "Unknown bounty status";
    var bountyStatusImage = new Image;
    bountyStatusImage.src = fs.readFileSync(assetFile(bountyStatusImageFile));
    ctx.drawImage(bountyStatusImage, 0, 0, bountyStatusImage.width, bountyStatusImage.height);

    // Draw bounty cash image
    var bountyCashImageFile;
    switch (bounty.cashLevel) {
        case 1:
            bountyCashImageFile = "cash-coins.png";
            break;
        case 2:
            bountyCashImageFile = "cash-money-bag.png";
            break;
        case 3:
            bountyCashImageFile = "cash-many-money-bags.png";
            break;
        case 4:
            bountyCashImageFile = "cash-bars.png";
            break;
        case 5:
            bountyCashImageFile = "cash-jackpot.png";
            break;
        default:
            throw "Unknown cash level";
    }
    var bountyCashImage = new Image;
    bountyCashImage.src = fs.readFileSync(assetFile(bountyCashImageFile));
    ctx.drawImage(bountyCashImage, 171, 249, bountyCashImage.width, bountyCashImage.height);

    callback(canvas);
};