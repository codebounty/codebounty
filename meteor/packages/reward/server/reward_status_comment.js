var fs = Npm.require("fs");

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

var RewardFormatter = function (options) {
    this.options = options;
};

RewardFormatter.prototype.CONFIGS = {
    USER_NAME_MAX_CHARACTER: 10,
    CLAIMER_MAX_COUNT: 3,
    CLAIMER_USER_NAME_MAX_CHARACTER: 10
};

RewardFormatter.prototype._limitStringLength = function (string, maxCharacter) {
    if (string.length <= maxCharacter)
        return string;

    return string.substring(0, maxCharacter - 2) + "...";
};

RewardFormatter.prototype._formatCurrency = function (amount) {
    if (this.options.currency === "usd") {
        if (amount > 999999999)
            return "$" + parseFloat((amount / 1000000000).toFixed(2)) + "B";

        if (amount > 999999)
            return "$" + parseFloat((amount / 1000000).toFixed(2)) + "M";

        if (amount > 999)
            return "$" + parseFloat((amount / 1000).toFixed(2)) + "K";

        return "$" + parseFloat(amount.toFixed(2));
    } else if (this.options.currency === "btc") {
        return amount + " BTC";
    } else {
        throw this.options.currency + " not implemented";
    }

};

RewardFormatter.prototype.getRewardAmount = function () {
    var rewardAmount = this._formatCurrency(this.options.amount);

    return rewardAmount;
};

RewardFormatter.prototype.getUserName = function () {
    return this._limitStringLength(this.options.userName, this.CONFIGS.USER_NAME_MAX_CHARACTER);
};

RewardFormatter.prototype.getClaimers = function (limit) {
    var claimers = [];

    if (!limit)
        limit = this.CONFIGS.CLAIMER_MAX_COUNT;

    var i, claimer, amount;
    var max = Math.min(this.options.claimedBy.length, limit);

    for (i = 0; i < max; i++) {
        claimer = this._limitStringLength(this.options.claimedBy[i].userName,
            this.CONFIGS.CLAIMER_USER_NAME_MAX_CHARACTER);
        amount = this._formatCurrency(this.options.claimedBy[i].amount);

        claimers.push({"claimer": claimer, "amount": amount});
    }

    var othersCount = this.options.claimedBy.length - max;

    if (othersCount > 0) {
        if (othersCount === 1)
            claimer = "+1 other";
        else if (othersCount > 1)
            claimer = "+" + othersCount + " others";

        claimers.push({"claimer": claimer, "amount": ""});
    }

    return claimers;
};

var drawClaimers = function (ctx, color, font, claimers, positions) {
    ctx.fillStyle = color;
    ctx.font = font;

    claimers.forEach(function (element, i) {
        if (element.claimer) {
            ctx.fillText(element.claimer, positions.claimerX[i], positions.claimerY[i]);
        }

        if (element.amount) {
            ctx.fillText(element.amount, positions.amountX[i], positions.amountY[i]);
        }
    });
};

//setup fonts

var woodshop = "Woodshop", Lato = "Lato";
var Fonts = {
    "Woodshop": new Canvas.Font(woodshop, RewardUtils.assetFile("woodshop-regular.otf")),
    "Lato": new Canvas.Font(Lato, RewardUtils.assetFile("Lato/Lato-Regular.ttf"))
};
Fonts.Lato.addFace(RewardUtils.assetFile("Lato/Lato-Bold.ttf"), "bold");

/**
 * generates the reward status comment image
 * @param {{status: string, amount: Number, currency: string, expiredDate: Date, userName: string,
 *          claimedBy: Array.<{userName: string, amount: Number}>}=} options
 * - status: "open", "closed", "reopened", "claimed"
 * - userName: user who posted the reward
 * - claimedBy: only used on "closed" or "claimed"
 * @return {Canvas}
 */
RewardUtils.statusComment = function (options) {
    var status = options.status;
    var formatter = new RewardFormatter(options);

    var width = 712, height = 368;
    var centerX = Math.floor(width / 2),
        centerY = Math.floor(height / 2);

    // Initialize canvas
    var canvas = new Canvas(width, height),
        ctx = canvas.getContext("2d");

    ctx.addFont(Fonts.Lato);
    ctx.addFont(Fonts.Woodshop);

    // Draw background
    ctx.fillStyle = LIGHT_ORANGE;
    ctx.rect(0, 0, width, height);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = LIGHT_GREY;
    ctx.stroke();

    if (status === "open" || status === "closed" || status === "reopened") {
        var statusHeader;
        var bountyAmount;
        var bountyExpiration;
        var bountyStatusImageFile;

        if (status === "open") {
            statusHeader = "BOUNTY NOW OPEN!";
            bountyAmount = "This bounty is posted for " + formatter.getRewardAmount();
            bountyExpiration = "Expires: " + Tools.formatDate(options.expiredDate);
            bountyStatusImageFile = "banner-bounty-open.png";
        } else if (status === "closed") {
            statusHeader = "BOUNTY CLOSED";
            bountyAmount = "This " + formatter.getRewardAmount() + " bounty will be paid out";
            bountyExpiration = "on " + Tools.formatDate(options.expiredDate) + " to";
            bountyStatusImageFile = "banner-bounty-closed.png";
        } else if (status === "reopened") {
            statusHeader = "BOUNTY REOPENED";
            bountyAmount = "This bounty is posted for " + formatter.getRewardAmount();
            bountyExpiration = "Expires: " + Tools.formatDate(options.expiredDate);
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
        var footerOriginX = centerX + 331;
        var posterUserOriginY = bountyStatusOriginY + 331;

        // Claimed by text (when closed)
        var claimedByTextOriginX = centerX + 20;
        var claimedByTextOriginY = bountyExpirationOriginY + 45;
        var claimedByPersonOriginX = {
            0: claimedByTextOriginX,
            1: claimedByTextOriginX,
            2: claimedByTextOriginX,
            3: claimedByTextOriginX
        };
        var claimedByAmountOriginX = {
            0: claimedByPersonOriginX[0] + 195,
            1: claimedByPersonOriginX[1] + 195,
            2: claimedByPersonOriginX[2] + 195,
            3: claimedByPersonOriginX[3] + 195
        };
        var claimedByPersonOriginY = {
            0: claimedByTextOriginY,
            1: claimedByTextOriginY + 30,
            2: claimedByTextOriginY + 60,
            3: claimedByTextOriginY + 90
        };

        //
        // Draw elements
        //

        // Draw Bounty status
        ctx.font = RewardUtils.canvasFontString(headerFontSize, woodshop);
        ctx.fillStyle = headerFontColor;
        ctx.fillText(statusHeader, statusHeaderOriginX, statusHeaderOriginY);

        // Draw bounty amount and expiration
        ctx.font = RewardUtils.canvasFontString(contentFontSize, Lato, "bold");
        ctx.fillStyle = contentFontColor;
        ctx.fillText(bountyAmount, bountyContentOriginX, bountyAmountOriginY);
        ctx.fillText(bountyExpiration, bountyContentOriginX, bountyExpirationOriginY);

        // Draw codebounty plug and link (align right)
        ctx.textAlign = "right";
        ctx.fillStyle = footerFontColor;
        ctx.font = RewardUtils.canvasFontString(posterFontSize, Lato);
        var posterUser = "Posted by " + formatter.getUserName();
        ctx.fillText(posterUser, footerOriginX, posterUserOriginY);
        ctx.textAlign = "left";

        // Draw claimed by text
        if (status === "closed" && options.claimedBy) {
            drawClaimers(ctx,
                footerFontColor,
                RewardUtils.canvasFontString(footerFontSize, Lato),
                formatter.getClaimers(),
                {
                    "claimerX": claimedByPersonOriginX,
                    "claimerY": claimedByPersonOriginY,
                    "amountX": claimedByAmountOriginX,
                    "amountY": claimedByPersonOriginY
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

        // Poster user (align center)
        var posterUserOriginX = sheriffIconOriginX + 160;
        var posterUserOriginY = sheriffIconOriginY + 323;

        // Claimed by text
        var claimedByTextOriginX = centerX - 36;
        var claimedByTextOriginY = centerY + 98;
        var claimedByPersonOriginX = {
            0: claimedByTextOriginX + 142,
            1: claimedByTextOriginX + 142,
            2: claimedByTextOriginX + 142,
            3: claimedByTextOriginX + 142
        };
        var claimedByPersonOriginY = {
            0: claimedByTextOriginY,
            1: claimedByTextOriginY + 30,
            2: claimedByTextOriginY + 60,
            3: claimedByTextOriginY + 90
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
        ctx.textAlign = "center";
        ctx.fillStyle = posterUserFontColor;
        ctx.font = RewardUtils.canvasFontString(posterUserFontSize, Lato, "bold");
        var posterUser = formatter.getUserName();
        ctx.fillText(posterUser, posterUserOriginX, posterUserOriginY);
        ctx.textAlign = "left";

        // Draw claimed by text
        if (options.claimedBy) {
            ctx.font = RewardUtils.canvasFontString(claimedByFontSize, Lato, "bold");
            ctx.fillStyle = claimedByFontColor;
            var claimedByText = "Claimed by: ";
            ctx.fillText(claimedByText, claimedByTextOriginX, claimedByTextOriginY);

            // Only display two claimers
            var claimers = formatter.getClaimers(2);
            claimers.forEach(function (element, index) {
                ctx.fillText(element.claimer + " " + element.amount, claimedByPersonOriginX[index], claimedByPersonOriginY[index]);
            });
        }

        // Draw sheriff icon
        var sheriffIconImageFile = "sheriff.png";
        var sheriffIconImage = new Image();
        sheriffIconImage.src = fs.readFileSync(RewardUtils.assetFile(sheriffIconImageFile));
        ctx.drawImage(sheriffIconImage, sheriffIconOriginX, sheriffIconOriginY, sheriffIconImage.width, sheriffIconImage.height);

        return canvas;
    }

    if (status === "expired" || status === "refunded") {
        var statusHeader;

        if (status === "expired") {
            statusHeader = "BOUNTY EXPIRED";
        } else if (status === "refunded") {
            statusHeader = "BOUNTY REFUNDED";
        }

        // Setup styles
        var headerFontColor = DARK_GREY,
            dateFontColor = LIGHT_GREY,
            posterFontColor = LIGHT_GREY;

        var headerFontSize = LARGE,
            dateFontSize = MEDIUM,
            posterFontSize = SMALL;

        //
        // Align elements
        //

        // Status Header
        var statusHeaderOriginX = 24;
        var statusHeaderOriginY = 70;

        // Expire / Refund date
        var bountyDateOriginX = statusHeaderOriginX;
        var bountyDateOriginY = statusHeaderOriginY + 41;

        // Poster
        var posterOriginX = statusHeaderOriginX;
        var posterOriginY = height - 20;

        // Antagonist
        var antagonistOriginX = 345;
        var antagonistOriginY = 30;

        //
        // Draw elements
        //

        // Draw Status Header
        ctx.font = RewardUtils.canvasFontString(headerFontSize, woodshop);
        ctx.fillStyle = headerFontColor;
        ctx.fillText(statusHeader, statusHeaderOriginX, statusHeaderOriginY);

        // Draw date
        ctx.font = RewardUtils.canvasFontString(dateFontSize, Lato, "bold");
        ctx.fillStyle = dateFontColor;
        var expiredDateText = "on " + Tools.formatDate(options.expiredDate, true);
        ctx.fillText(expiredDateText, bountyDateOriginX, bountyDateOriginY);

        // Draw poster
        ctx.font = RewardUtils.canvasFontString(posterFontSize, Lato);
        ctx.fillStyle = posterFontColor;
        var posterText = formatter.getRewardAmount() + " posted by " + formatter.getUserName();
        ctx.fillText(posterText, posterOriginX, posterOriginY);

        // Draw Antagonist
        var antagonistImageFile = "antagonist.png";
        var antagonistImage = new Image();
        antagonistImage.src = fs.readFileSync(RewardUtils.assetFile(antagonistImageFile));
        ctx.textAlign = "right";
        ctx.drawImage(antagonistImage, antagonistOriginX, antagonistOriginY);

        return canvas;
    }

    throw "Unknown bounty status";
};