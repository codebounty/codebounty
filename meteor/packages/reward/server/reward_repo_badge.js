var fs = Npm.require("fs");

var LIGHT_ORANGE = "#E0C39D";

var NUMBER_CONFIGS = {
    1: {
        X: 9,
        Y: 18,
        size: "16px"
    },
    2: {
        X: 4,
        Y: 18,
        size: "16px"
    },
    3: {
        X: 1,
        Y: 18,
        size: "14px"
    }
};

/**
 * Generates github badge for repository.
 * @param  {{open: Number}} repoStatus
 * @return {Canvas}
 */
RewardUtils.repoBadge = function (repoStatus) {
    var open = repoStatus.open || 0;
    if (open >= 100) {
        open = "99+";
    } else {
        open = open.toString();
    }
    var openDigits = open.length;

    var width = 80, height = 24;
    var canvas = new Canvas(width, height),
        ctx = canvas.getContext("2d");

    var futuraLTBook = "FuturaLTBook";
    var futuraLTBookFont = new Canvas.Font(futuraLTBook, RewardUtils.assetFile("futura-lt-book.ttf"));
    ctx.addFont(futuraLTBook);

    var repoBadgeBackground = new Image();
    repoBadgeBackground.src = fs.readFileSync(RewardUtils.assetFile("repo-badge-bg.png"));
    ctx.drawImage(repoBadgeBackground, 0, 0, repoBadgeBackground.width, repoBadgeBackground.height);

    ctx.fillStyle = LIGHT_ORANGE;
    ctx.font = RewardUtils.canvasFontString(NUMBER_CONFIGS[openDigits].size, futuraLTBook);
    ctx.fillText(open, NUMBER_CONFIGS[openDigits].X, NUMBER_CONFIGS[openDigits].Y);

    return canvas;
};