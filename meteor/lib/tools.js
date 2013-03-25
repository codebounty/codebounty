var CB = CB || {};

CB.Tools = (function () {
    var my = {};

    my.nowPlusMinutes = function (minutes) {
        var now = new Date();
        return new Date(now.getTime() + minutes * 60000);
    };

    //Bounties.update("a567ojrygWMkv3SvZ", {$set: {"reward.planned": CB.Tools.nowPlusMinutes(1)}})
    //Bounties.remove("")

    return my;
})();