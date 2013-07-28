var fs = require("fs"), util = require("util");

module.exports = function (grunt) {

    grunt.initConfig({
        config: grunt.file.readJSON("config.json"),
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
                    "meteor --settings settings.local.json"
                ].join("&&"),
                bg: false,
                stdout: true,
                stderr: true
            },
            meteordebug: {
                cmd: [
                    "cd meteor",
                    "NODE_OPTIONS='--debug-brk' meteor --settings settings.local.json"
                ].join("&&"),
                bg: false,
                stdout: true,
                stderr: true
            },
            tests: {
                cmd: "node node_modules/cucumber/bin/cucumber.js",
                bg: false,
                stdout: true,
                stderr: true
            },
            testsdebug: {
                cmd: "node --debug-brk node_modules/cucumber/bin/cucumber.js",
                bg: false,
                stdout: true,
                stderr: true
            }
        },
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
        copy: {
            dist: {
                expand: true,
                cwd: "extensions/chrome",
                src: "**",
                dest: "<%= config.dist %>/chrome/"
            }
        },
        crx: {
            dist: {
                src: "<%= config.dist %>/chrome/",
                dest: "<%= config.dist %>/codebounty.crx",
                exclude: [".git", "*.pem"],
                privateKey: "extensions/chrome.pem"
            }
        },
        encode: {
            client: {
                src: ["<%= config.dist %>/codebounty.crx"],
                dest: "<%= config.dist %>"
            }
        },
        preprocess: {
            dist: {
                options: {
                    context: {
                        ROOTURL: "<%= config.rootUrl.dist %>"
                    }
                },
                src: "<%= config.dist %>/chrome/content/github.js",
                dest: "<%= config.dist %>/chrome/content/github.js"
            },
            qa: {
                options: {
                    context: {
                        ROOTURL: "<%= config.rootUrl.qa %>"
                    }
                },
                src: "<%= config.dist %>/chrome/content/github.js",
                dest: "<%= config.dist %>/chrome/content/github.js"
            },
            local: {
                options: {
                    context: {
                        ROOTURL: "<%= config.rootUrl.local %>"
                    }
                },
                src: "<%= config.dist %>/chrome/content/github.js",
                dest: "<%= config.dist %>/chrome/content/github.js"
            }
        }
    });

    // Load all grunt tasks
    require("matchdep").filterDev("grunt-*").forEach(grunt.loadNpmTasks);

    //chromeOptions needs the extension to be a Base64 encoded string
    //so encode it, then build a requirejs module for it
    grunt.registerMultiTask("encode", "Convert the .crx to a Base64 encoded string", function () {
        this.files.forEach(function (filePair) {
            var dest = filePair.dest;
            filePair.src.map(function (file) {
                var binaryData = fs.readFileSync(file);

                // convert binary data to base64 encoded string
                var encoded = new Buffer(binaryData).toString("base64");

                // setup as json
                var moduleTemplate = '{\n' +
                    '   "base64":"%s"\n' +
                    '}';

                var output = util.format(moduleTemplate, encoded);

                var fileName = file.substr(file.lastIndexOf("/"));
                file = dest + fileName + ".json";

                grunt.file.write(file, output);
            });
        });
    });

    // builds the chrome extension
    grunt.registerTask("build", "Build chrome extension", function (target) {
        var tasks = [
            "clean:dist",
            "copy:dist"
        ];

        if (target === "local")
            tasks.push("preprocess:local");
        else if (target === "qa")
            tasks.push("preprocess:qa");
        else
            tasks.push("preprocess:dist");

        tasks = tasks.concat(["crx:dist", "encode"]);
        grunt.task.run(tasks);
    });

    grunt.registerTask("server", "Run servers", function (target) {
        if (target !== "debug")
            target = "";

        grunt.task.run([
            "bgShell:bitcoind",
            "bgShell:meteor" + target
        ]);
    });

    grunt.registerTask("test", "Run the testing tasks", function (target) {
        if (target !== "debug")
            target = "";

        grunt.task.run("bgShell:tests" + target);
    });

    grunt.registerTask("default", "server");
};