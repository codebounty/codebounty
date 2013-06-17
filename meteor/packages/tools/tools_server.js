var path = Npm.require("path"),
    fs = Npm.require("fs");

var base = path.resolve('.');
if (base === '/')
    base = path.dirname(global.require.main.filename);

var publicPath = path.resolve(base + '/public/');
var staticPath = path.resolve(base + '/static/');

/**
 * The location of the public folder.
 * It changes when the application is bundled (and this could change).
 * @type {String}
 */
Tools.publicFolder = fs.existsSync(staticPath) ? staticPath : publicPath;