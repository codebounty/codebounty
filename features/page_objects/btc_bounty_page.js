function BtcBountyPage(world, handle) {
    var self = this;

    self.browser = world.browser;
    self.handle = handle;
    self.settings = world.settings;
}

BtcBountyPage.prototype.bitcoinAddress = function () {
    return this.browser.findElement({id: "issueAddress"}).getText();
};

module.exports = {
    BtcBountyPage: BtcBountyPage
};
