GitHubUtils = {};

var url = Npm.require("url");

/**
 * Parse the github url
 * @param githubUrl
 * @returns {{repo: {user: String, name: String}, issue: Number}}
 */
GitHubUtils.parseUrl = function (githubUrl) {
    var parsedUrl = url.parse(githubUrl, true);

    var path = parsedUrl.pathname;
    if (parsedUrl.hostname !== "github.com" || path.indexOf("/issues") < 0)
        throw "Only accepting bounties for github issues currently";

    var paths = path.split("/");

    //parse repository and issue
    var repo = {user: paths[1], name: paths[2]};
    var issue = parseFloat(paths[4]);
    if (isNaN(issue))
        throw "Cannot parse issue number";

    return {repo: repo, issue: issue};
};