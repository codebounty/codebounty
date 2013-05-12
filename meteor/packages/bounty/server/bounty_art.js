var fs = Npm.require("fs"), path = Npm.require("path"),
    basepath = path.resolve(".") + "/packages/bounty";

/**
 * generates the bounty status image
 * @param bountyId
 * @param callback passed a {Canvas}
 * @param size object contains variable 'width' and 'height' (optional)
 */
Bounty.statusImage = function (bountyId, callback, size) {
    var Font = Canvas.Font;
    var _minWidth = 715,
        _minHeight = 370;
    var assetFile = function (name) {
        return path.join(basepath, "/assets/", name);
    }

    // var bounty = Bounties.findOne(bountyId);
    
    // Start debug code
    var bounty = {
        "status": "open",
        "amount": "50.00",
        "cashLevel": 5,
        "user": "JohnDoeUser"
    }
    var status = bounty.status;
    // End debug code

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

    // Determine image size
    var width = (size && size.width > _minWidth) ? size.width : _minWidth,
        height = (size && size.height > _minHeight) ? size.height : _minHeight;

    var currencySymbol = "$";
    var leftOffset = width - 444;
    var rightOffset = 39;
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
    var footerSmallerFontSize = "19.5px";
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
    var leftOffsetIndent = 5;
    var bountyContentOriginX = leftOffset + leftOffsetIndent;
    var bountyAmountOriginY = 133;
    var bountyExpirationOriginY = 170;

    ctx.font = contentFontSize + " " + contentFontName;
    ctx.fillStyle = contentFontColor;
    var bountyAmount = "This bounty is posted for " + currencySymbol + bounty.amount;
    ctx.fillText(bountyAmount, bountyContentOriginX, bountyAmountOriginY);
    // TODO: Get expiration date from date
    var bountyExpiration = "Expires: " + "May 20th, 2013 at 12am";
    ctx.fillText(bountyExpiration, bountyContentOriginX, bountyExpirationOriginY);

    // Draw codebounty plug and link
    var footerOriginX = width - rightOffset;
    var posterUserOriginY = 305;
    var siteLinkOriginY = 336;

    ctx.textAlign = "right";
    ctx.fillStyle = footerFontColor;
    ctx.font = footerFontSize + " " + footerFontName;
    var posterUser = "Posted by " + bounty.user;
    ctx.fillText(posterUser, footerOriginX, posterUserOriginY);
    ctx.font = footerSmallerFontSize + " " + footerFontName;
    var siteLink = "codebounty.co"
    ctx.fillText(siteLink, footerOriginX, siteLinkOriginY);

    // Draw bounty status image
    var bountyStatusOriginX = 25;
    var bountyStatusOriginY = 17;
    
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
    var bountyCashOriginX = 172;
    var bountyCashOriginY = 250;

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

    // Finish drawing canvas
    callback(canvas);
};