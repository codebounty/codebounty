GitHubUtils = {};

var Url = Npm.require("url");

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