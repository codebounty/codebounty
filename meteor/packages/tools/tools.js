Tools = {};

/**
 * Add / subtract minutes from now
 * @param minutes Can be negative
 */
Tools.addMinutes = function (minutes) {
    return new Date(new Date().getTime() + minutes * 60000);
};

/**
 * Add / subtract days from now
 * @param days Can be negative
 * @returns {Date}
 */
Tools.addDays = function (days) {
    var endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    return endDate;
};

/**
 * Check if two arrays have equal elements in the same order
 * @param a
 * @param b
 * @param [compare] An optional function that takes two objects and returns if they are equal
 */
Tools.arraysAreEqual = function (a, b, compare) {
    if (!compare)
        compare = function (a, b) {
            return a === b;
        };

    var i = a.length;
    if (i != b.length) return false;
    while (i--) {
        if (!compare(a[i], b[i]))
            return false;
    }
    return true;
};


/**
 * Returns if a string ends with a suffix
 * @returns {boolean}
 */
Tools.endsWith = function (str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
};

Tools.formatDate = function (date) {
    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];

    // TODO: take care of timezone
    var day = date.getDate(), month = date.getMonth(),
        year = date.getFullYear(), hour = date.getHours(),
        minute = date.getMinutes();

    var ordinalIndicator;
    if (day === 1 || day === 21 || day === 31)
        ordinalIndicator = "st";
    else if (day === 2 || day === 22)
        ordinalIndicator = "nd";
    else if (day === 3 || day === 23)
        ordinalIndicator = "rd";
    else
        ordinalIndicator = "th";

    var period;
    if (hour < 12)
        period = "am";
    else
        period = "pm";

    if (hour === 0)
        hour = 12;
    else if (hour > 12)
        hour = hour - 12;

    if (0 <= minute && minute <= 9)
        minute = "0" + minute;

    return monthNames[month] + " " + day + ordinalIndicator + ", " + year + " at " + hour + ":" + minute + period;
};


//return the url without a trailing hash
Tools.stripHash = function (url) {
    var index = url.indexOf("#");

    if (index > 0) {
        url = url.substring(0, index);
    }

    return url;
};