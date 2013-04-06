var CB = CB || {};

CB.Tools = (function () {
    var my = {};

    my.Truncate = function (number, precision) {
        var numS = number.toString(),
            decPos = numS.indexOf('.');

        var result = number;
        if (decPos > 0)
            result = numS.substr(0, 1 + decPos + precision);

        return parseFloat(result);
    };

    my.Round = function (number, precision) {
        return parseFloat(accounting.toFixed(number, precision));
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