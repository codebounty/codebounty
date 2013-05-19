var fs = Npm.require("fs"), path = Npm.require("path"),
    basepath = path.resolve(".") + "/packages/bounty";

/**
 * generates the bounty status image
 * @param bountyId
 * @param callback passed a {Canvas}
 * @param size object contains variable 'width' and 'height' (optional)
 */
Bounty.statusImage = function (bountyId, callback, size) {
    // Constants
    var _minWidth       = 712,
        _minHeight      = 368;
    var _lightOrange    = "#E0C39D",
        _lightGrey      = "#78665A",
        _darkGrey       = "#484640";
    var _sizeLarge      = "39px",
        _sizeMedium     = "26px",
        _sizeSmall      = "19.5px";

    // Helper functions
    /**
     * Get asset file path
     * @param  {String} name Asset filename
     * @return {String}      File path
     */
    var assetFile = function (name) {
        return path.join(basepath, "/assets/", name);
    };

    /**
     * Get font string used in canvas.
     * @param  {String} size     Font size
     * @param  {String} font     Font name
     * @param  {String} fontFace Font style (optional)
     * @return {String}          Font string
     */
    var fontStr = function (size, font, fontFace) {
        if (size && font) {
            return (fontFace ? fontFace + " " : "") + size + " " + font;
        } else {
            throw "Missing argument.";
        }
    };

    /**
     * Get bounty cash image filename.
     * @param  {Number} amount Bounty amount
     * @return {String}        Filename of bounty cash image
     */
    var getBountyCashImageFile = function () {
        var bountyCashImageFiles = {
            0: "cash-coins.png",
            1: "cash-money-bag.png",
            2: "cash-many-money-bags.png",
            3: "cash-bars.png",
            4: "cash-jackpot.png"
        };

        var getCashLevel = function (amount) {
            if (amount < 20)
                return 0;
            else if (20 <= amount && amount < 50)
                return 1;
            else if (50 <= amount && amount < 100)
                return 2;
            else if (100 <= amount && amount < 250)
                return 3;
            else
                return 4;
        };

        return function (amount) {
            return bountyCashImageFiles[getCashLevel(amount)];
        };
    }();

    var formatDate = function () {
        var m_names = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July",
        "Aug", "Sept", "Oct", "Nov", "Dec"];

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
        };
    }();

    // var bounty = Bounties.findOne(bountyId);

    //
    // Start debug code
    //
    var bounty = {
        "status": "claimed",        // open, closed, reopened, claimed
        "amount": 100.01,
        "expiredDate": new Date(),
        "userName": "JohnDoeUser",  // user who posted the bounty
        "claimedBy": [              // will show when status is closed or claimed
                        {
                            "userName": "Bounty Jack",
                            "amount": 7
                        },
                        {
                            "userName": "Outlaw Joe",
                            "amount": 5
                        }
                     ]
    };
    var status = bounty.status;
    var currencySymbol = "$";
    size = {            // Override size argument
        "width": 0,     // Ignored if less than min width
        "height": 0     // Ignored if less than min height
    };
    //
    // End debug code
    //

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
    var width   = (size && size.width > _minWidth) ? size.width : _minWidth,
        height  = (size && size.height > _minHeight) ? size.height : _minHeight;
    var centerX = Math.floor(width / 2),
        centerY = Math.floor(height / 2);

    // Initialize canvas
    var canvas  = new Canvas(width, height),
        ctx     = canvas.getContext("2d");

    var Font = Canvas.Font;
    // Setup fonts
    var woodshop            = "Woodshop";
    var woodshopFile        = "woodshop-regular.otf";
    var woodshopFont        = new Font(woodshop, assetFile(woodshopFile));
    ctx.addFont(woodshopFont);

    // var myriadPro = '"Myriad Pro"';
    // var myriadProFile = "myriadpro-regular.otf";
    // var myriadProFont = new Font(myriadPro, assetFile(myriadProFile));
    // ctx.addFont(myriadProFont);

    var futuraLT            = "FuturaLT";
    var futuraLTFile        = "futura-lt.ttf";
    var futuraLTHeavyFile   = "futura-lt-heavy.otf";
    var futuraLTFont        = new Font(futuraLT, assetFile(futuraLTFile));
    futuraLTFont.addFace(assetFile(futuraLTHeavyFile), "bold");
    ctx.addFont(futuraLTFont);

    // Draw background
    var backgroundColor = _lightOrange;
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    if (status === "open" || status === "closed" || status === "reopened") {
        // When status is open, closed or reopened
        (function () {
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
            }

            // Setup styles
            var headerFontColor         = _darkGrey,
                contentFontColor        = _lightGrey,
                footerFontColor         = _darkGrey;
            var headerFontSize          = _sizeLarge,
                contentFontSize         = _sizeMedium,
                footerFontSize          = _sizeMedium,
                footerSmallerFontSize   = _sizeSmall;

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
            ctx.font = fontStr(headerFontSize, woodshop);
            ctx.fillStyle = headerFontColor;
            ctx.fillText(statusHeader, statusHeaderOriginX, statusHeaderOriginY);

            // Draw bounty amount and expiration
            ctx.font = fontStr(contentFontSize, futuraLT, "bold");
            ctx.fillStyle = contentFontColor;
            ctx.fillText(bountyAmount, bountyContentOriginX, bountyAmountOriginY);
            var bountyExpiration = "Expires: " + formatDate(bounty.expiredDate);
            ctx.fillText(bountyExpiration, bountyContentOriginX, bountyExpirationOriginY);

            // Draw codebounty plug and link (align right)
            ctx.textAlign = "right";
            ctx.fillStyle = footerFontColor;
            ctx.font = fontStr(footerFontSize, futuraLT);
            var posterUser = "Posted by " + bounty.userName;
            ctx.fillText(posterUser, footerOriginX, posterUserOriginY);
            ctx.font = fontStr(footerSmallerFontSize, futuraLT);
            var siteLink = "codebounty.co";
            ctx.fillText(siteLink, footerOriginX, siteLinkOriginY);
            ctx.textAlign = "left";

            // Draw claimed by text
            if (status === "closed" && bounty.claimedBy) {
                ctx.fillStyle = footerFontColor;
                ctx.font = fontStr(footerFontSize, futuraLT);
                var claimedByText = "Claimed by: ";
                ctx.fillText(claimedByText, claimedByTextOriginX, claimedByTextOriginY);

                // Only display two claimers
                if (bounty.claimedBy[0]) {
                    var claimedByPerson1Text = bounty.claimedBy[0].userName + " " + currencySymbol + bounty.claimedBy[0].amount;
                    ctx.fillText(claimedByPerson1Text, claimedByPerson1OriginX, claimedByTextOriginY);
                }

                if (bounty.claimedBy[1]) {
                    var claimedByPerson2Text = bounty.claimedBy[1].userName + " " + currencySymbol + bounty.claimedBy[1].amount;
                    ctx.fillText(claimedByPerson2Text, claimedByPerson2OriginX, claimedByText2OriginY);
                }
            }

            // Draw bounty status image
            var bountyStatusImage = new Image();
            bountyStatusImage.src = fs.readFileSync(assetFile(bountyStatusImageFile));
            ctx.drawImage(bountyStatusImage, bountyStatusOriginX, bountyStatusOriginY, bountyStatusImage.width, bountyStatusImage.height);

            // Draw bounty cash image
            var bountyCashImageFile = getBountyCashImageFile(bounty.amount);
            var bountyCashImage = new Image();
            bountyCashImage.src = fs.readFileSync(assetFile(bountyCashImageFile));
            ctx.drawImage(bountyCashImage, bountyCashOriginX, bountyCashOriginY, bountyCashImage.width, bountyCashImage.height);

            // Finished drawing canvas
            callback(canvas);
        })();
        // End when status is open, closed or reopened
    } else if (status === "claimed") {
        // When status is claimed
        (function () {
            // Setup styles
            var posterUserFontColor = _darkGrey,
                claimedByFontColor  = _lightGrey;
            var posterUserFontSize  = _sizeMedium,
                claimedByFontSize   = _sizeMedium;

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
            bountyClaimedStampImage.src = fs.readFileSync(assetFile(bountyClaimedStampImageFile));
            ctx.drawImage(bountyClaimedStampImage, bountyClaimedStampOriginX, bountyClaimedStampOriginY, bountyClaimedStampImage.width, bountyClaimedStampImage.height);

            // Draw poster user
            ctx.fillStyle = posterUserFontColor;
            ctx.font = fontStr(posterUserFontSize, futuraLT, "bold");
            var posterUser = bounty.userName;
            ctx.fillText(posterUser, posterUserOriginX, posterUserOriginY);

            // Draw claimed by text
            if (bounty.claimedBy) {
                ctx.font = fontStr(claimedByFontSize, futuraLT, "bold");
                ctx.fillStyle = claimedByFontColor;
                var claimedByText = "Claimed by: ";
                ctx.fillText(claimedByText, claimedByTextOriginX, claimedByTextOriginY);

                // Only display two claimers
                if (bounty.claimedBy[0]) {
                    var claimedByPerson1Text = bounty.claimedBy[0].userName + " " + currencySymbol + bounty.claimedBy[0].amount;
                    ctx.fillText(claimedByPerson1Text, claimedByPerson1OriginX, claimedByTextOriginY);
                }

                if (bounty.claimedBy[1]) {
                    var claimedByPerson2Text = bounty.claimedBy[1].userName + " " + currencySymbol + bounty.claimedBy[1].amount;
                    ctx.fillText(claimedByPerson2Text, claimedByPerson2OriginX, claimedByText2OriginY);
                }
            }

            // Draw sheriff icon
            var sheriffIconImageFile = "sheriff.png";
            var sheriffIconImage = new Image();
            sheriffIconImage.src = fs.readFileSync(assetFile(sheriffIconImageFile));
            ctx.drawImage(sheriffIconImage, sheriffIconOriginX, sheriffIconOriginY, sheriffIconImage.width, sheriffIconImage.height);

            // Finished drawing canvas
            callback(canvas);
        })();
        // End when status is claimed
    } else {
        throw "Unknown bounty status";
    }
};
