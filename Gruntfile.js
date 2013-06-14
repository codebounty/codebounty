module.exports = function (grunt) {
    var gruntConfig = {
        dist: "build"
    };

    grunt.initConfig({
        config: gruntConfig,
        clean: {
            dist: {
                files: [{
                    dot: true,
                    src: [
                        "<%= config.dist %>/*",
                        "!<%= config.dist %>/.git*"
                    ]
                }]
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
                    suites: ["tests/lib/functional"],
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
                    "cd tools",
                    "node web-server.js"
                ].join("&&"),
                bg: true,
                stdout: false,
                stderr: false
            }
        }
    });

    // Load all grunt tasks
    require("matchdep").filterDev("grunt-*").forEach(grunt.loadNpmTasks);

    // Loading using a local git copy
    grunt.loadNpmTasks("intern");

    // Register a test task
    grunt.registerTask("test", ["intern:client"]);

    // Register a build task
    grunt.registerTask("build", [
        "clean:dist",
        "crx:dist"
    ]);

    grunt.registerTask("server", [
        "bgShell:webserver",
        "bgShell:bitcoind",
        "bgShell:meteor"
    ]);

    // By default we just test
    grunt.registerTask("default", ["build"]);
};
