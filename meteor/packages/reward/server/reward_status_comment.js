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

var BountyFormatter = function (options) {
    this.options = options;
};

BountyFormatter.prototype.CONFIGS = {
    USER_NAME_MAX_CHARACTER: 10,
    CLAIMER_MAX_COUNT: 2,
    CLAIMER_USER_NAME_MAX_CHARACTER: 10
};

BountyFormatter.prototype._limitStringLength = function (string, maxCharacter) {
    if (string.length <= maxCharacter)
        return string;

    return string.substring(0, maxCharacter - 2) + "...";
};

BountyFormatter.prototype._formatCurrency = function (amount) {
    if (this.options.currency === "usd") {
        if (amount > 999999999) {
            return "$" + parseFloat((amount / 1000000000).toFixed(2)) + "B";
        }

        if (amount > 999999) {
            return "$" + parseFloat((amount / 1000000).toFixed(2)) + "M";
        }

        if (amount > 999) {
            return "$" + parseFloat((amount / 1000).toFixed(2)) + "K";
        }

        return "$" + parseFloat(amount.toFixed(2));
    } else {
        throw this.options.currency + " not implemented";
    }

};

BountyFormatter.prototype.getBountyAmount = function () {
    var bountyAmount = this._formatCurrency(this.options.amount);
    // TODO: convert unit
    
    return bountyAmount;
};

BountyFormatter.prototype.getUserName = function () {
    return this._limitStringLength(this.options.userName, this.CONFIGS.USER_NAME_MAX_CHARACTER);
};

/**
 * Generate bounty claimer strings. Default only displays limited entries, others
 * will be replaced by "+X others".
 * @return {Array.String}
 */
BountyFormatter.prototype.getClaimerStrings = function () {
    var claimers = [];

    var i, claimer;
    var max = Math.min(this.options.claimedBy.length, this.CONFIGS.CLAIMER_MAX_COUNT);

    for (i = 0; i < max; i++) {
        claimer = this._limitStringLength(this.options.claimedBy[i].userName,
                  this.CONFIGS.CLAIMER_USER_NAME_MAX_CHARACTER) + " " +
                  this._formatCurrency(this.options.claimedBy[i].amount);

        claimers.push(claimer);
    }

    var othersCount = this.options.claimedBy.length - max;
    if (othersCount === 1)
        claimers.push("+1 other");
    else if (othersCount > 1)
        claimers.push("+" + othersCount + " others");

    return claimers;
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
    var formatter = new BountyFormatter(options);

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
            bountyAmount = "This bounty is posted for " + formatter.getBountyAmount();
            bountyStatusImageFile = "banner-bounty-open.png";
        } else if (status === "closed") {
            statusHeader = "BOUNTY CLOSED";
            bountyAmount = "This bounty was posted for " + formatter.getBountyAmount();
            bountyStatusImageFile = "banner-bounty-closed.png";
        } else if (status === "reopened") {
            statusHeader = "BOUNTY REOPENED";
            bountyAmount = "This bounty is posted for " + formatter.getBountyAmount();
            bountyStatusImageFile = "banner-bounty-reopened.png";
        }

        // Setup styles
        var headerFontColor = DARK_GREY,
            contentFontColor = LIGHT_GREY,
            footerFontColor = DARK_GREY,
            posterFontColor = status !== "closed" ? footerFontColor : LIGHT_GREY;

        var headerFontSize = LARGE,
            contentFontSize = MEDIUM,
            footerFontSize = MEDIUM,
            footerSmallerFontSize = SMALL,
            posterFontSize = status !== "closed" ? footerFontSize : SMALL;

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
        var bountyExpirationOriginY = bountyAmountOriginY + 37;

        // Bounty Footer (align right)
        var footerOriginX = centerX + 319;
        var siteLinkOriginY = bountyStatusOriginY + 321;
        var posterUserOriginY = status !== "closed" ? siteLinkOriginY - 31 : siteLinkOriginY - 23;

        // Claimed by text (when closed)
        var claimedByTextOriginX = centerX - 35;
        var claimedByTextOriginY = bountyExpirationOriginY + 45;
        var claimedByPersonOriginX = {
            0: claimedByTextOriginX + 142,
            1: claimedByTextOriginX + 142,
            2: claimedByTextOriginX + 142
        };
        var claimedByPersonOriginY = {
            0: claimedByTextOriginY,
            1: claimedByTextOriginY + 30,
            2: claimedByTextOriginY + 60
        };

        //
        // Draw elements
        //

        // Draw Bounty status
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
        ctx.fillStyle = posterFontColor;
        ctx.font = RewardUtils.canvasFontString(posterFontSize, futuraLT);            
        var posterUser = "Posted by " + formatter.getUserName();
        ctx.fillText(posterUser, footerOriginX, posterUserOriginY);

        ctx.fillStyle = footerFontColor;
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

            // Only display two claimers
            var claimers = formatter.getClaimerStrings();
            claimers.forEach(function (element, index) {
                ctx.fillText(element, claimedByPersonOriginX[index], claimedByPersonOriginY[index]);
            });
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
        var claimedByTextOriginY = centerY + 98;
        var claimedByPersonOriginX = {
            0: claimedByTextOriginX + 142,
            1: claimedByTextOriginX + 142,
            2: claimedByTextOriginX + 142
        };
        var claimedByPersonOriginY = {
            0: claimedByTextOriginY,
            1: claimedByTextOriginY + 30,
            2: claimedByTextOriginY + 60
        };

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
        var posterUser = formatter.getUserName();
        ctx.fillText(posterUser, posterUserOriginX, posterUserOriginY);

        // Draw claimed by text
        if (options.claimedBy) {
            ctx.font = RewardUtils.canvasFontString(claimedByFontSize, futuraLT, "bold");
            ctx.fillStyle = claimedByFontColor;
            var claimedByText = "Claimed by: ";
            ctx.fillText(claimedByText, claimedByTextOriginX, claimedByTextOriginY);

            // Only display two claimers
            var claimers = formatter.getClaimerStrings();
            claimers.forEach(function (element, index) {
                ctx.fillText(element, claimedByPersonOriginX[index], claimedByPersonOriginY[index]);
            });
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
