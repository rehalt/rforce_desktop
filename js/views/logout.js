// Enable ipc functionality, will use it to send the user and password
// to the server process once the authentication has taken place
const ipc = require('electron').ipcRenderer;


// The ever conspicuous document ready function...
$(document).ready(async function() {
    // clear user session cookie
    let expireDate = new Date(2000, 0, 1, 0, 0, 0, 0);
    document.cookie = `userSession=;expires=${expireDate.toUTCString()}`;
    // Send a message that the user has logged out
    let response = ipc.sendSync('userLoggedOut', '');
    // Redirect to login page
    setTimeout( () => {window.location.href = "./login.html"}, 3000);
});