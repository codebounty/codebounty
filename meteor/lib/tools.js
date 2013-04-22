var CB = CB || {};

CB.Tools = (function () {
    var my = {};

    /**
     * Truncate to a precision
     * @param number
     * @param [precision] defaults to 0
     */
    my.Truncate = function (number, precision) {
        var numS = number.toString(),
            decPos = numS.indexOf('.');

        if (precision === null) {
            precision = 0;
        }

        var result = number;
        if (decPos > 0)
            result = numS.substr(0, 1 + decPos + precision);

        return parseFloat(result);
    };

    my.Round = function (number, precision) {
        return parseFloat(accounting.toFixed(number, precision));
    };

    //return how many decimals are in a number
    my.Precision = function (number) {
        var numberString = number.toString();
        //convert to string to prevent issues w javascript's messed up numbers
        var decimalIndex = numberString.indexOf(".");

        if (decimalIndex === -1)
            return 0;

        return numberString.length - decimalIndex - 1;
    };

    /**
     * Add / subtract minutes from now
     * @param minutes Can be negative
     */
    my.AddMinutes = function (minutes) {
        return new Date(new Date().getTime() + minutes * 60000);
    };

    /**
     * Add / subtract days from now
     * @param days Can be negative
     */
    my.AddDays = function (days) {
        var endDate = new Date();
        endDate.setDate(endDate.getDate() + days);
        return endDate;
    };

    //return the url without a trailing hash
    my.StripHash = function (url) {
        var index = url.indexOf('#');

        if (index > 0) {
            url = url.substring(0, index);
        }

        return url;
    };

    return my;
})();