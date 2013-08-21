EmailManager = {};

/**
 *
 * @param backerName
 * @param receiverEmail
 * @param receiverName
 * @param {{repo: {user: string, name: string}, number: number}} issue
 * @param {string} rewardAmount Ex. $5
 */
EmailManager.sendRewardEmail = function (backerName, receiverEmail, receiverName, issue, rewardAmount) {
    debugger;

    var subject = "Ace-high " + receiverName + ", you fetched yourself a reward";

    var repoUrl = "https://github.com/" + issue.repo.user + "/" + issue.repo.name;
    var issueUrl = repoUrl + "/issues/" + issue.number;

    try {
        Email.send({
            to: receiverEmail,
            from: Meteor.settings["CHARLIE_EMAIL"],
            subject: subject,
            html: "<div>Your contribution to reigning in issue #" + issue.number + " on " + issue.repo.name +
                " has fetched you a " + rewardAmount + " reward.</div><br>" +
                "<div>The money will be forked over in 72 hours, but in the meantime feel free to thank "
                + backerName + " on the <a href='" + issueUrl + "'>issue page</a>.</div><br>" +
                "<div>So long, Slim.</div><br>" +
                "<div>- <a href='https://github.com/codebountycharlie'>Charlie</a> (from <a href='http://codebounty.co'>Code Bounty</a>)</div>"
        });
    } catch (exception) {
        Fiber(function () {
            TL.error(EJSON.stringify(exception), Modules.Reward);
        }).run();
    }
};