var fs = require("fs"), util = require("util");

module.exports = function (grunt) {
    grunt.loadNpmTasks("intern");

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
                    "meteor --settings settings.json"
                ].join("&&"),
                bg: false,
                stdout: true,
                stderr: true
            },
            debugmeteor: {
                cmd: [
                    "cd meteor",
                    "NODE_OPTIONS='--debug-brk' meteor --settings settings.json"
                ].join("&&"),
                bg: false,
                stdout: true,
                stderr: true
            },
            debugintern: {
                cmd: "node --debug-brk node_modules/intern/runner.js config=tests/intern",
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
        intern: {
            options: {
                config: "<%= config.test %>/intern",
                suites: ["<%= config.test %>/lib/bounty"]
            },
            runner: {
                options: {
                    runType: "runner"
                }
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
        grunt.task.run([
            "bgShell:bitcoind",
            target === "debug" ? "bgShell:debugmeteor" : "bgShell:meteor"
        ]);
    });

    grunt.registerTask("test", "Run the testing tasks", function (target) {
        grunt.task.run([
            target === "debug" ? "bgShell:debugintern" : "intern:runner"
        ]);
    });

    grunt.registerTask("default", "server");
};