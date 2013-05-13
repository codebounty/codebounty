BountyUtils = {};

//the # days bounties expire after
BountyUtils.expiresAfterDays = 90;

/**
 * if the bounty created date is older (<) this date, it is expired
 * @returns {Date} the first date where bounties are expired
 */
BountyUtils.expiredDate = function () {
    var now = new Date();
    var expiredDate = now.setDate(now.getDate() - BountyUtils.expiresAfterDays);
    expiredDate = new Date(expiredDate);
    return expiredDate;
};