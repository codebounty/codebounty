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