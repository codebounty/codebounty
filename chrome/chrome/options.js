// Saves options to localStorage.
function save_options() {
    var githubInput = document.getElementById("githubInput");
    localStorage["github_enabled"] = githubInput.checked;

    // Update status to let user know options were saved.
    var status = document.getElementById("status");
    status.innerHTML = "Options Saved.";
    setTimeout(function() {
        status.innerHTML = "";
    }, 750);
}

// Restores saved values from localStorage.
function restore_options() {
    var github_enabled = localStorage["github_enabled"];
    if (!github_enabled) {
        return;
    }
    var githubInput = document.getElementById("githubInput");
    if(github_enabled!=="false")githubInput.checked = github_enabled;
}
document.addEventListener('DOMContentLoaded', restore_options);
document.querySelector('#save').addEventListener('click', save_options);