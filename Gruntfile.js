var fs = require("fs"), util = require("util");

module.exports = function (grunt) {
    var gruntConfig = {
        dist: "build"
    };

    grunt.loadNpmTasks("intern");

    grunt.initConfig({
        config: gruntConfig,
        clean: {
            dist: {
                files: [
                    {
                        dot: true,
                        src: [
                            "<%= config.dist %>/*",
                            "!<%= config.dist %>/.git*"
                        ]
                    }
                ]
            }
        },
        crx: {
            dist: {
                src: "extensions/chrome/",
                dest: "<%= config.dist %>/codebounty.crx",
                exclude: [".git", "*.pem"],
                privateKey: "extensions/chrome.pem"
            }
        },
        intern: {
            client: {
                options: {
                    config: "tests/intern",
                    suites: ["tests/lib/bounty"],
                    runType: "runner"
                }
            }
        },
        bgShell: {
            bitcoind: {
                cmd: "bitcoind",
                bg: true,
                stdout: false,
                stderr: false
            },
            meteor: {
                cmd: [
                    "cd meteor",
                    "mrt --settings settings.json"
                ].join("&&"),
                bg: false,
                stdout: true,
                stderr: true
            },
            webserver: {
                cmd: [
                    "node tools/web-server.js"
                ],
                bg: true,
                stdout: false,
                stderr: false
            }
        },
        encode: {
            client: {
                src: ["build/codebounty.crx"],
                dest: "build"
            }
        }
    });

    // Load all grunt tasks
    require("matchdep").filterDev("grunt-*").forEach(grunt.loadNpmTasks);

    //the intern chromeOptions needs the extension to be a Base64 encoded string
    //so encode it, then build a requirejs module for it
    grunt.registerMultiTask("encode", "Convert the .crx to a Base64 encoded string", function () {
        this.files.forEach(function (filePair) {
            var dest = filePair.dest;
            filePair.src.map(function (file) {
                var binaryData = fs.readFileSync(file);

                // convert binary data to base64 encoded string
                var encoded = new Buffer(binaryData).toString("base64");

                // setup as a requirejs module
                var moduleTemplate = "define({\n" +
                    "   base64:'%s'\n" +
                    "});\n";

                var output = util.format(moduleTemplate, encoded);

                var fileName = file.substr(file.lastIndexOf("/"));
                file = dest + fileName + ".js";

                grunt.file.write(file, output);
            });
        });
    });

    // builds the chrome extension
    grunt.registerTask("build", [
        "clean:dist",
        "crx:dist",
        //encode the extension for the tests
        "encode"
    ]);

    // runs all the servers
    grunt.registerTask("server", [
        "bgShell:webserver",
        "bgShell:bitcoind",
        "bgShell:meteor"
    ]);

    // the testing tasks
    grunt.registerTask("test", "intern:client");

    grunt.registerTask("default", "server");
};