EmailManager = {};

/**
 * Send a email notifying the receiver they will / may receive a reward after the 72 hour payout window
 * @param {string} backerName
 * @param {string} receiverEmail
 * @param {string} receiverName
 * @param {{repo: {user: string, name: string}, number: number}} issue
 * @param by Who the reward was initiated by (the backer userId, "system", "admin")
 * @param {string} rewardAmount Ex. $5
 */
EmailManager.sendRewardEmail = function (backerName, receiverEmail, receiverName, issue, rewardAmount, by) {
    var repoUrl = "https://github.com/" + issue.repo.user + "/" + issue.repo.name;
    var issueUrl = repoUrl + "/issues/" + issue.number;

    if (!Environment.isProduction)
        receiverEmail = Meteor.settings["TEST_EMAIL"];

    var yourContributionFragment = "<div>Your contribution to reigning in issue #" + issue.number + " on " + issue.repo.name;
    var signatureFragment = "<div>So long, Slim.</div><br>" +
        "<div>- <a href='https://github.com/codebountycharlie'>Charlie</a> (from <a href='http://codebounty.co'>Code Bounty</a>)</div>";

    var subject = "Ace-high " + receiverName + ", you fetched yourself a reward";
    var html = yourContributionFragment + " has fetched you a " + rewardAmount + " reward.</div><br>" +
        "<div>The money will be forked over in 72 hours, but in the meantime feel free to thank "
        + backerName + " on the <a href='" + issueUrl + "'>issue page</a>.</div><br>" +
        signatureFragment;

    //it was initiated by the system (not an admin or a user)
    //change the wording from you did receive a reward, to you may receive a reward
    //letting them know the backer could change the payout within the 72 hour window
    if (by === "system") {
        subject = "Howdy " + receiverName + ", you might just fetch a reward";
        html = yourContributionFragment + " could fetch you a " + rewardAmount + " reward.</div><br>" +
            "<div>The issue was closed so we distributed the payout for " + backerName + ". " +
            "If the issue does not reopen and " + backerName + " does not change the payout the money will be forked over in 72 hours. " +
            "In the meantime feel free to discuss this on the <a href='" + issueUrl + "'>issue page</a>.</div><br>" +
            signatureFragment;
    }

    try {
        Email.send({
            to: receiverEmail,
            from: Meteor.settings["CHARLIE_EMAIL"],
            subject: subject,
            html: html
        });
    } catch (error) {
        Fiber(function () {
            TL.error(EJSON.stringify(error), Modules.Reward);
        }).run();
    }
};