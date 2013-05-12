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
        "status": "open",
        "amount": "50.00",
        "cashLevel": 5,
        "user": "JohnDoeUser"
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
    var width = 715;
    var height = 370;
    // var width = 1000;
    // var height = 1000;
    var leftOffset = width - 444;
    var rightOffset = 42;
    var backgroundColor = "#E0C39D";
    var textColor = "#484640";

    // TODO make this pretty
    var canvas = new Canvas(width, height),
        ctx = canvas.getContext("2d");

    // Setup fonts     
    var headerFontName = "Woodshop";
    var headerFontFile = "Woodshop-Regular.otf";
    var headerFontColor = "#484640";
    var headerFontSize = "39px";
    var headerFont = new Font(headerFontName, assetFile(headerFontFile));
    ctx.addFont(headerFont);

    var contentFontName = '"Futura LT Heavy"';
    var contentFontFile = "Futura-LT-Heavy.otf";
    var contentFontColor = "#78665A";
    var contentFontSize = "26px";
    var contentFont = new Font(contentFontName, assetFile(contentFontFile));
    ctx.addFont(contentFont);

    var footerFontName = '"Futura LT"';
    var footerFontFile = "Futura-LT.ttf";
    var footerFontColor = "#484640";
    var footerFontSize = "26px";
    var footerSmallerFontSize = "20px";
    var footerFont = new Font(footerFontName, assetFile(footerFontFile));
    ctx.addFont(footerFont);

     // Draw background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Reset color
    ctx.fillStyle = textColor;

    // Draw Bounty status
    // TODO: exclamation mark is not included in font Woodshop, so in the
    // original design, it is replaced by using Myriad Pro.
    ctx.font = headerFontSize + " " + headerFontName;
    ctx.fillStyle = headerFontColor;
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
    ctx.font = contentFontSize + " " + contentFontName;
    ctx.fillStyle = contentFontColor;
    var bountyAmount = "This bounty is posted for " + currencySymbol + bounty.amount;
    ctx.fillText(bountyAmount, leftOffset, 133);
    var bountyExpiration = "Expires: " + "May 20th, 2013 at 12am";
    ctx.fillText(bountyExpiration, leftOffset, 170);

    //Draw codebounty plug and link
    ctx.textAlign = "right";
    ctx.fillStyle = footerFontColor;
    ctx.font = footerFontSize + " " + footerFontName;
    var posterUser = "Posted by " + bounty.user;
    ctx.fillText(posterUser, width - rightOffset, 305);
    ctx.font = footerSmallerFontSize + " " + footerFontName;
    var siteLink = "codebounty.co"
    ctx.fillText(siteLink, width - rightOffset, 336);

    // Draw bounty status image
    var bountyStatusOriginX = 24;
    var bountyStatusOriginY = 16;
    
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
    ctx.drawImage(bountyStatusImage, bountyStatusOriginX, bountyStatusOriginY, bountyStatusImage.width, bountyStatusImage.height);

    // Draw bounty cash image
    var bountyCashOriginX = 171;
    var bountyCashOriginY = 249;

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
    ctx.drawImage(bountyCashImage, bountyCashOriginX, bountyCashOriginY, bountyCashImage.width, bountyCashImage.height);

    callback(canvas);
};