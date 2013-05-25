GitHubUtils = {};

var Url = Npm.require("url");

/**
 * Return the unique author email's of the commits
 * @param commits
 * @param [excludeUser] If passed, exclude the user
 * @return Array.<string>
 */
GitHubUtils.authorsEmails = function (commits, excludeUser) {
    var authors = _.map(commits, function (commit) {
        return commit.author;
    });
    authors = _.uniq(authors, false, function (author) {
        return author.email;
    });

    var authorsEmails = _.pluck(authors, "email");

    if (excludeUser)
        authorsEmails = _.without(authorsEmails, AuthUtils.email(excludeUser));

    return authorsEmails;
};

/**
 * Parse out the issue object
 * @param issueUrl The github url
 * @returns {{repo: {user: string, name: string}, number: number}}
 */
GitHubUtils.issue = function (issueUrl) {
    issueUrl = Tools.stripHash(issueUrl);

    var parsedUrl = Url.parse(issueUrl, true);

    var path = parsedUrl.pathname;
    if (parsedUrl.hostname !== "github.com" || path.indexOf("/issues") < 0)
        throw "Only accepting bounties for github issues currently";

    var paths = path.split("/");

    //parse repository and issue
    var repo = {name: paths[2], user: paths[1]};

    var issue = parseFloat(paths[4]);
    if (isNaN(issue))
        throw "Cannot parse issue number";

    return {number: issue, repo: repo};
};

/**
 * @param {string} user
 * @param {string} name
 * @returns {string} "https://github.com/codebounty/codebounty"
 */
GitHubUtils.repoUrl = function (user, name) {
    return "https://github.com/" + user + "/" + name;
};

GitHubUtils.username = function (user) {
    return user.services.github.username;
};