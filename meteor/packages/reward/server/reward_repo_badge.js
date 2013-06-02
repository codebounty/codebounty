var fs = Npm.require("fs");

var LIGHT_ORANGE = "#E0C39D";

var NUMBER_CONFIGS = {
    1: {
        X: 9,
        Y: 18,
        size: "15px"
    },
    2: {
        X: 4,
        Y: 18,
        size: "15px"
    },
    3: {
        X: 2,
        Y: 18,
        size: "14px"
    }
};

/**
 * Generates github badge for repository.
 * @param  {{open: Number}} options
 * @return {Canvas}
 */
RewardUtils.repoBadge = function (options) {
    var open = options.open || 0;
    if (open >= 100) {
        open = "99+";
    } else {
        open = open.toString();
    }
    var openDigits = open.length;

    var width = 80, height = 24;
    var canvas = new Canvas(width, height),
        ctx = canvas.getContext("2d");

    var latoLight = "LatoLight";
    var latoLightFont = new Canvas.Font(latoLight, RewardUtils.assetFile("Lato/Lato-Light.ttf"));
    ctx.addFont(latoLightFont);

    var repoBadgeBackground = new Image();
    repoBadgeBackground.src = fs.readFileSync(RewardUtils.assetFile("repo-badge-bg.png"));
    ctx.drawImage(repoBadgeBackground, 0, 0, repoBadgeBackground.width, repoBadgeBackground.height);

    ctx.fillStyle = LIGHT_ORANGE;
    ctx.font = RewardUtils.canvasFontString(NUMBER_CONFIGS[openDigits].size, latoLight);
    ctx.fillText(open, NUMBER_CONFIGS[openDigits].X, NUMBER_CONFIGS[openDigits].Y);

    return canvas;
};