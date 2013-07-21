function RewardPage(world) {
    this.browser = world.browser;
}

RewardPage.prototype.checkFirstContributor = function () {
    var self = this;

    //let the reward data load
    self.browser.sleep(3000);

    //get the contributor row
    self.browser.findElement({
        name: "contributorRow"
    }).then(function (elements) {
            console.log("erm here", elements);

        });
};

module.exports = {
    RewardPage: RewardPage
};