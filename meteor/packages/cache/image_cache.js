var ImageCache = new Meteor.Collection("imagecache");

var AWS = Npm.require("aws-sdk");

var awsAccessKey = Meteor.settings["AWS_ACCESS_KEY_ID"], awsSecret = Meteor.settings["AWS_SECRET_ACCESS_KEY"],
    imageBucket = Meteor.settings["AWS_IMAGE_BUCKET"];

var s3 = awsAccessKey && awsSecret ?
    new AWS.S3({
        accessKeyId: awsAccessKey,
        apiVersion: "2006-03-01",
        secretAccessKey: awsSecret
    })
    : null;

ImageCacheTools = {};

/**
 * @param path The path of the image
 * @param meta The metadata
 * @returns {string} The image url if it exists, or null
 */
ImageCacheTools.get = function (path, meta) {
    var cachedImage = ImageCache.findOne({ path: path, meta: meta });
    if (!cachedImage)
        return null;

    ImageCache.update({ path: path }, {
        $inc: { accessed: 1 },
        $set: { lastAccess: new Date() }
    });

    return "https://s3.amazonaws.com/" + imageBucket + "/" + cachedImage.path;
};

/**
 * Store the image in the s3 image cache, and it's details in te db.
 * Will overwrite any images with the same id and folder.
 * @param {string} path The folder and file name. Ex. "rewards/1234.png"
 * @param {Buffer} pngBuffer
 * @param {*} meta Metadata to store under meta
 * @param {boolean} publicRead If everyone has permission to read the file
 * @param [callback]
 */
ImageCacheTools.set = function (path, pngBuffer, meta, publicRead, callback) {
    //return if the user does not have s3 configured
    if (!s3)
        return;

    var options = {
        Bucket: imageBucket,
        Key: path,
        Body: pngBuffer
    };
    if (publicRead)
        options.ACL = "public-read";

    s3.putObject(options, function (error, data) {
        var cacheItem = {
            accessed: 1,
            meta: meta,
            path: path,
            lastAccess: new Date()
        };

        Fiber(function () {
            if (error)
                TL.error("Error caching image: " + JSON.stringify(error), Modules.Amazon);
            else
                ImageCache.update({ path: path }, cacheItem, { upsert: true });

            if (callback)
                callback(error, data);
        }).run();
    });
};