// Enable ipc functionality, will use it to send / recieve messages between server and renderer processes.
const ipc = require('electron').ipcRenderer;

// Send an IPC message to the main process, so that we receive the user credentials
let credentials = ipc.sendSync('loggedUser', '');

// Set logged user name
document.getElementById("loggedUserName").innerHTML = `<span><i class="icon-user icons"></i></span>&nbsp;${credentials.lastName}, ${credentials.firstName}`;

// And yet another IPC message to retrieve the server path
let parentURL = ipc.sendSync('serverPath', '');