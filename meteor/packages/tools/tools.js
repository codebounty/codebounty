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
 */
Tools.addDays = function (days) {
    var endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    return endDate;
};

//return the url without a trailing hash
Tools.stripHash = function (url) {
    var index = url.indexOf("#");

    if (index > 0) {
        url = url.substring(0, index);
    }

    return url;
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