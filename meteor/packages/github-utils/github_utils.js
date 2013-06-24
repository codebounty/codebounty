GitHubUtils = {};

/**
 * Parse out the issue object
 * @param issueUrl The github url
 * @returns {{repo: {user: string, name: string}, number: number}}
 */
GitHubUtils.issue = function (issueUrl) {
    issueUrl = Tools.stripHash(issueUrl);

    //gets ['url', 'scheme', 'slash', 'host', 'port', 'path', 'query', 'hash']
    var parseUrl = /^(?:([A-Za-z]+):)?(\/{0,3})([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^?#]*))?(?:\?([^#]*))?(?:#(.*))?$/;
    var parsed = parseUrl.exec(issueUrl);

    var path = parsed[5]; //codebounty/codebounty/issues/25
    if (parsed[3] !== "github.com" || path.indexOf("/issues") < 0)
        throw "Only accepting bounties for github issues currently";

    var paths = path.split("/");

    //parse repository and issue
    var repo = {name: paths[1], user: paths[0]};

    var issue = parseFloat(paths[3]);
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