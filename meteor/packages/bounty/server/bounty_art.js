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
    var _minWidth = 712,
        _minHeight = 368;
    var currencySymbol = "$";
    var backgroundColor = "#E0C39D";
    
    var assetFile = function (name) {
        return path.join(basepath, "/assets/", name);
    };

    var formatDate = function () {
        var m_names = new Array("Jan", "Feb", "Mar", "Apr", "May",
        "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec");

        return function (date) {
            // TODO: take care of timezone
            var curr_date = date.getDate();
            var curr_month = date.getMonth();
            var curr_year = date.getFullYear();
            var curr_hour = date.getHours();

            var sup;
            if (curr_date === 1 || curr_date === 21 || curr_date === 31) {
                sup = "st";
            } else if (curr_date === 2 || curr_date === 22) {
                sup = "nd";
            } else if (curr_date === 3 || curr_date === 23) {
                sup = "rd";
            } else {
                sup = "th";
            }

            var a_p;
            if (curr_hour < 12) {
                a_p = "am";
            } else {
                a_p = "pm";
            }
            if (curr_hour === 0) {
                curr_hour = 12;
            }
            if (curr_hour > 12) {
                curr_hour = curr_hour - 12;
            }

            return m_names[curr_month] + " " + curr_date + sup + ", " +
                   curr_year + " at " + curr_hour + a_p;
        }
    }();

    // var bounty = Bounties.findOne(bountyId);
    
    // Start debug code
    var bounty = {
        "status": "closed",
        "amount": 12.1291,
        "expiredDate": new Date(1945, 4, 1, 24),
        "userName": "JohnDoeUser",
        "claimedBy": [
                        {
                            "userName": "Bounty Jack",
                            "amount": 5
                        },
                        {
                            "userName": "Outlaw Joe",
                            "amount": 7
                        }
                     ]
    }
    var status = bounty.status;
    var cashLevel = 3;
    size = {
        "width": 0,
        "height": 0
    }
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
    var centerX = Math.floor(width / 2),
        centerY = Math.floor(height / 2);

    // Initialize canvas
    var canvas = new Canvas(width, height),
        ctx = canvas.getContext("2d");

    // Setup fonts     
    var headerFontName = "Woodshop";
    var headerFontFile = "woodshop-regular.otf";
    var headerFontColor = "#484640";
    var headerFontSize = "39px";
    var headerFont = new Font(headerFontName, assetFile(headerFontFile));
    ctx.addFont(headerFont);

    // Not used so far
    var headerFallbackFontName = '"Myriad Pro"';
    var headerFallbackFontFile = "myriadpro-regular.otf";
    var headerFallbackFontColor = headerFontColor;
    var headerFallbackFontSize = headerFontSize;
    var headerFallbackFont = new Font(headerFallbackFontName, assetFile(headerFallbackFontFile));
    ctx.addFont(headerFallbackFont);

    var contentFontName = '"Futura LT Heavy"';
    var contentFontFile = "futura-lt-heavy.otf";
    var contentFontColor = "#78665A";
    var contentFontSize = "26px";
    var contentFont = new Font(contentFontName, assetFile(contentFontFile));
    ctx.addFont(contentFont);

    var footerFontName = '"Futura LT"';
    var footerFontFile = "futura-lt.ttf";
    var footerFontColor = "#484640";
    var footerFontSize = "26px";
    var footerSmallerFontSize = "19.5px";
    var footerFont = new Font(footerFontName, assetFile(footerFontFile));
    ctx.addFont(footerFont);

     // Draw background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Setup variables based on status
    var statusHeader;
    var bountyAmount;
    var bountyStatusImageFile;
    if (status === "open") {
        statusHeader = "BOUNTY NOW OPEN!";
        bountyAmount = "This bounty is posted for " + currencySymbol + parseFloat(bounty.amount).toFixed(2);
        bountyStatusImageFile = "banner-bounty-open.png";
    } else if (status === "closed") {
        statusHeader = "BOUNTY CLOSED";
        bountyAmount = "This bounty was posted for " + currencySymbol + parseFloat(bounty.amount).toFixed(2);
        bountyStatusImageFile = "banner-bounty-closed.png";
    } else if (status === "reopened") {
        statusHeader = "BOUNTY REOPENED";
        bountyAmount = "This bounty is posted for " + currencySymbol + parseFloat(bounty.amount).toFixed(2);
        bountyStatusImageFile = "banner-bounty-reopened.png";
    } else {
        throw "Unknown bounty status";
    }

    // Align elements
    // Bounty Status
    var bountyStatusOriginX = centerX - 332;
    var bountyStatusOriginY = Math.floor((height - 336) / 2);   // horizontally center (bounty status image valid height is 328) 
    
    // Bounty Cash
    var bountyCashOriginX = bountyStatusOriginX + 147;
    var bountyCashOriginY = bountyStatusOriginY + 233;

    // Bounty Header
    var statusHeaderOriginX = centerX - 86;
    var statusHeaderOriginY = bountyStatusOriginY + 65;

    // Bounty Content
    var leftOffsetIndent = 5;
    var bountyContentOriginX = statusHeaderOriginX + leftOffsetIndent;
    var bountyAmountOriginY = statusHeaderOriginY + 53;
    var bountyExpirationOriginY = statusHeaderOriginY + 90;

    // Bounty Footer
    var footerOriginX = centerX + 319;
    var posterUserOriginY = bountyStatusOriginY + 290;
    var siteLinkOriginY = posterUserOriginY + 31;

    // Claimed by text (when opened)
    var rightOffsetIndent = 5;
    var claimedByTextOriginX = footerOriginX - rightOffsetIndent;
    var claimedByTextOriginY = posterUserOriginY - 70;
    var claimedByText2OriginY = claimedByTextOriginY + 30;

    // Draw Bounty status
    // TODO: exclamation mark is not included in font Woodshop, so in the
    // original design, it is replaced by using Myriad Pro.
    ctx.font = headerFontSize + " " + headerFontName;
    ctx.fillStyle = headerFontColor;
    ctx.fillText(statusHeader, statusHeaderOriginX, statusHeaderOriginY);

    // Draw bounty amount and expiration
    ctx.font = contentFontSize + " " + contentFontName;
    ctx.fillStyle = contentFontColor;
    ctx.fillText(bountyAmount, bountyContentOriginX, bountyAmountOriginY);
    var bountyExpiration = "Expires: " + formatDate(bounty.expiredDate);
    ctx.fillText(bountyExpiration, bountyContentOriginX, bountyExpirationOriginY);

    // Draw codebounty plug and link (align right)
    ctx.textAlign = "right";
    ctx.fillStyle = footerFontColor;
    ctx.font = footerFontSize + " " + footerFontName;
    var posterUser = "Posted by " + bounty.userName;
    ctx.fillText(posterUser, footerOriginX, posterUserOriginY);
    ctx.font = footerSmallerFontSize + " " + footerFontName;
    var siteLink = "codebounty.co"
    ctx.fillText(siteLink, footerOriginX, siteLinkOriginY);

    // Draw claimed by text
    if (status === "closed" && bounty.claimedBy) {
        ctx.textAlign = "right";
        ctx.fillStyle = footerFontColor;
        ctx.font = footerFontSize + " " + footerFontName;

        // Only display two claimer
        // TODO: code needs optimization
        if (bounty.claimedBy[0]) {
            var claimedTextClaimer = "Claimed by: " + bounty.claimedBy[0].userName + " " + currencySymbol + bounty.claimedBy[0].amount;
            ctx.fillText(claimedTextClaimer, claimedByTextOriginX, claimedByTextOriginY);
        }

        if (bounty.claimedBy[1]) {
            var claimedTextClaimer2 = bounty.claimedBy[1].userName + " " + currencySymbol + bounty.claimedBy[1].amount;
            ctx.fillText(claimedTextClaimer2, claimedByTextOriginX, claimedByText2OriginY);
        }
    }

    // Draw bounty status image
    var bountyStatusImage = new Image;
    bountyStatusImage.src = fs.readFileSync(assetFile(bountyStatusImageFile));
    ctx.drawImage(bountyStatusImage, bountyStatusOriginX, bountyStatusOriginY, bountyStatusImage.width, bountyStatusImage.height);

    // Draw bounty cash image
    var bountyCashImageFile;
    switch (cashLevel) {
        case 0:
            bountyCashImageFile = "cash-coins.png";
            break;
        case 1:
            bountyCashImageFile = "cash-money-bag.png";
            break;
        case 2:
            bountyCashImageFile = "cash-many-money-bags.png";
            break;
        case 3:
            bountyCashImageFile = "cash-bars.png";
            break;
        case 4:
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