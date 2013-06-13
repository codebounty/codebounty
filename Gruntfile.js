module.exports = function (grunt) {

    grunt.initConfig({
        intern: {
            client: {
                options: {
                    config: "tests/intern",
                    suites: ["tests/lib/functional"],
                    runType: "runner"
                }
            }
        }
    });

    // Loading using a local git copy
    grunt.loadNpmTasks("intern");

    // Register a test task
    grunt.registerTask("test", ["intern:client"]);

    // By default we just test
    grunt.registerTask("default", ["test"]);
};