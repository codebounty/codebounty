var fs = Npm.require("fs"), path = Npm.require("path"),
    basepath = path.resolve(".") + "/packages/reward";

// Constants

var CASH_IMAGE_FILES = {
    0: "cash-coins.png",
    1: "cash-money-bag.png",
    2: "cash-many-money-bags.png",
    3: "cash-bars.png",
    4: "cash-jackpot.png"
};

var LIGHT_ORANGE = "#E0C39D",
    LIGHT_GREY = "#78665A",
    DARK_GREY = "#484640";

var SMALL = "19.5px",
    MEDIUM = "26px",
    LARGE = "39px";

// Helper Functions

/**
 * Get currency symbol
 * @param  {String} currency "usd" or "btc"
 * @return {String}
 */
var getCurrencySymbol = function (currency) {
    if (currency === "usd") {
        return "$";
    }

    throw currency + " not implemented";
};

//setup fonts

var woodshop = "Woodshop", futuraLT = "FuturaLT";
var Fonts = {
    "Woodshop": new Canvas.Font(woodshop, RewardUtils.assetFile("woodshop-regular.otf")),
    "FuturaLT": new Canvas.Font(futuraLT, RewardUtils.assetFile("futura-lt.ttf"))
};
Fonts.FuturaLT.addFace(RewardUtils.assetFile("futura-lt-heavy.otf"), "bold");

/**
 * generates the reward status comment image
 * @param {{status: string, amount: Number, currency: string, expiredDate: Date, userName: string,
 *          claimedBy: Array.<{userName: string, amount: Number}>}=} options
 * - status: "open", "closed", "reopened", "claimed"
 * - userName: user who posted the bounty
 * - claimedBy: only used on "closed" or "claimed"
 * @return {Canvas}
 */
RewardUtils.statusComment = function (options) {
    var status = options.status;
    var currencySymbol = getCurrencySymbol(options.currency);

    var width = 712, height = 368;
    var centerX = Math.floor(width / 2),
        centerY = Math.floor(height / 2);

    // Initialize canvas
    var canvas = new Canvas(width, height),
        ctx = canvas.getContext("2d");

    ctx.addFont(Fonts.FuturaLT);
    ctx.addFont(Fonts.Woodshop);

    // Draw background
    ctx.fillStyle = LIGHT_ORANGE;
    ctx.fillRect(0, 0, width, height);

    if (status === "open" || status === "closed" || status === "reopened") {
        var statusHeader;
        var bountyAmount;
        var bountyStatusImageFile;

        if (status === "open") {
            statusHeader = "BOUNTY NOW OPEN!";
            bountyAmount = "This bounty is posted for " + currencySymbol + parseFloat(options.amount).toFixed(2);
            bountyStatusImageFile = "banner-bounty-open.png";
        } else if (status === "closed") {
            statusHeader = "BOUNTY CLOSED";
            bountyAmount = "This bounty was posted for " + currencySymbol + parseFloat(options.amount).toFixed(2);
            bountyStatusImageFile = "banner-bounty-closed.png";
        } else if (status === "reopened") {
            statusHeader = "BOUNTY REOPENED";
            bountyAmount = "This bounty is posted for " + currencySymbol + parseFloat(options.amount).toFixed(2);
            bountyStatusImageFile = "banner-bounty-reopened.png";
        }

        // Setup styles
        var headerFontColor = DARK_GREY,
            contentFontColor = LIGHT_GREY,
            footerFontColor = DARK_GREY;

        var headerFontSize = LARGE,
            contentFontSize = MEDIUM,
            footerFontSize = MEDIUM,
            footerSmallerFontSize = SMALL;

        //
        // Align elements
        //

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

        // Bounty Footer (align right)
        var footerOriginX = centerX + 319;
        var posterUserOriginY = bountyStatusOriginY + 290;
        var siteLinkOriginY = posterUserOriginY + 31;

        // Claimed by text (when closed)
        var claimedByTextOriginX = centerX - 7;
        var claimedByPerson1OriginX = claimedByTextOriginX + 142;
        var claimedByPerson2OriginX = claimedByPerson1OriginX;
        var claimedByTextOriginY = posterUserOriginY - 70;
        var claimedByText2OriginY = claimedByTextOriginY + 30;

        //
        // Draw elements
        //

        // Draw Bounty status
        // TODO: exclamation mark is not included in font Woodshop, so in the
        // original design, it is replaced by using Myriad Pro.
        ctx.font = RewardUtils.canvasFontString(headerFontSize, woodshop);
        ctx.fillStyle = headerFontColor;
        ctx.fillText(statusHeader, statusHeaderOriginX, statusHeaderOriginY);

        // Draw bounty amount and expiration
        ctx.font = RewardUtils.canvasFontString(contentFontSize, futuraLT, "bold");
        ctx.fillStyle = contentFontColor;
        ctx.fillText(bountyAmount, bountyContentOriginX, bountyAmountOriginY);
        var bountyExpiration = "Expires: " + Tools.formatDate(options.expiredDate);
        ctx.fillText(bountyExpiration, bountyContentOriginX, bountyExpirationOriginY);

        // Draw codebounty plug and link (align right)
        ctx.textAlign = "right";
        ctx.fillStyle = footerFontColor;
        ctx.font = RewardUtils.canvasFontString(footerFontSize, futuraLT);
        var posterUser = "Posted by " + options.userName;
        ctx.fillText(posterUser, footerOriginX, posterUserOriginY);
        ctx.font = RewardUtils.canvasFontString(footerSmallerFontSize, futuraLT);
        var siteLink = "codebounty.co";
        ctx.fillText(siteLink, footerOriginX, siteLinkOriginY);
        ctx.textAlign = "left";

        // Draw claimed by text
        if (status === "closed" && options.claimedBy) {
            ctx.fillStyle = footerFontColor;
            ctx.font = RewardUtils.canvasFontString(footerFontSize, futuraLT);
            var claimedByText = "Claimed by: ";
            ctx.fillText(claimedByText, claimedByTextOriginX, claimedByTextOriginY);

            //TODO... more claimers somehow. Like "+2 others"?
            // Only display two claimers
            if (options.claimedBy[0]) {
                var claimedByPerson1Text = options.claimedBy[0].userName + " " + currencySymbol + options.claimedBy[0].amount;
                ctx.fillText(claimedByPerson1Text, claimedByPerson1OriginX, claimedByTextOriginY);
            }

            if (options.claimedBy[1]) {
                var claimedByPerson2Text = options.claimedBy[1].userName + " " + currencySymbol + options.claimedBy[1].amount;
                ctx.fillText(claimedByPerson2Text, claimedByPerson2OriginX, claimedByText2OriginY);
            }
        }

        // Draw bounty status image
        var bountyStatusImage = new Image();
        bountyStatusImage.src = fs.readFileSync(RewardUtils.assetFile(bountyStatusImageFile));
        ctx.drawImage(bountyStatusImage, bountyStatusOriginX, bountyStatusOriginY, bountyStatusImage.width, bountyStatusImage.height);

        var cashLevel = RewardUtils.cashLevel(options.amount, options.currency);

        // Draw bounty cash image
        var bountyCashImageFile = CASH_IMAGE_FILES[cashLevel];
        var bountyCashImage = new Image();
        bountyCashImage.src = fs.readFileSync(RewardUtils.assetFile(bountyCashImageFile));
        ctx.drawImage(bountyCashImage, bountyCashOriginX, bountyCashOriginY, bountyCashImage.width, bountyCashImage.height);

        return canvas;
    }

    if (status === "claimed") {
        // When status is claimed
        // Setup styles
        var posterUserFontColor = DARK_GREY,
            claimedByFontColor = LIGHT_GREY;
        var posterUserFontSize = MEDIUM,
            claimedByFontSize = MEDIUM;

        //
        // Align elements
        //

        // Bounty claimed stamp
        var bountyClaimedStampOriginX = centerX - 124;
        var bountyClaimedStampOriginY = centerY - 137;

        // Sheriff icon
        var sheriffIconOriginX = centerX - 345;
        var sheriffIconOriginY = Math.floor((height - 323) / 2);

        // Poster user
        var posterUserOriginX = sheriffIconOriginX + 65;
        var posterUserOriginY = sheriffIconOriginY + 323;

        // Claimed by text
        var claimedByTextOriginX = centerX - 36;
        var claimedByPerson1OriginX = claimedByTextOriginX + 142;
        var claimedByPerson2OriginX = claimedByPerson1OriginX;
        var claimedByTextOriginY = centerY + 110;
        var claimedByText2OriginY = claimedByTextOriginY + 30;

        //
        // Draw elements
        //

        // Draw bounty claimed stamp
        var bountyClaimedStampImageFile = "bounty-claimed-stamp.png";
        var bountyClaimedStampImage = new Image();
        bountyClaimedStampImage.src = fs.readFileSync(RewardUtils.assetFile(bountyClaimedStampImageFile));
        ctx.drawImage(bountyClaimedStampImage, bountyClaimedStampOriginX, bountyClaimedStampOriginY, bountyClaimedStampImage.width, bountyClaimedStampImage.height);

        // Draw poster user
        ctx.fillStyle = posterUserFontColor;
        ctx.font = RewardUtils.canvasFontString(posterUserFontSize, futuraLT, "bold");
        var posterUser = options.userName;
        ctx.fillText(posterUser, posterUserOriginX, posterUserOriginY);

        // Draw claimed by text
        if (options.claimedBy) {
            ctx.font = RewardUtils.canvasFontString(claimedByFontSize, futuraLT, "bold");
            ctx.fillStyle = claimedByFontColor;
            var claimedByText = "Claimed by: ";
            ctx.fillText(claimedByText, claimedByTextOriginX, claimedByTextOriginY);

            // Only display two claimers
            if (options.claimedBy[0]) {
                var claimedByPerson1Text = options.claimedBy[0].userName + " " + currencySymbol + options.claimedBy[0].amount;
                ctx.fillText(claimedByPerson1Text, claimedByPerson1OriginX, claimedByTextOriginY);
            }

            if (options.claimedBy[1]) {
                var claimedByPerson2Text = options.claimedBy[1].userName + " " + currencySymbol + options.claimedBy[1].amount;
                ctx.fillText(claimedByPerson2Text, claimedByPerson2OriginX, claimedByText2OriginY);
            }
        }

        // Draw sheriff icon
        var sheriffIconImageFile = "sheriff.png";
        var sheriffIconImage = new Image();
        sheriffIconImage.src = fs.readFileSync(RewardUtils.assetFile(sheriffIconImageFile));
        ctx.drawImage(sheriffIconImage, sheriffIconOriginX, sheriffIconOriginY, sheriffIconImage.width, sheriffIconImage.height);

        return canvas;
    }

    throw "Unknown bounty status";
};