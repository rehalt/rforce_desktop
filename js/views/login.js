// Enable ipc functionality, will use it to send the user and password
// to the server process once the authentication has taken place
const ipc = require('electron').ipcRenderer;

// The ever conspicuous document ready function...
$(document).ready(async function () {

    // Send an IPC message to the main process, so that we receive the user credentials
    let credentials = ipc.sendSync('loggedUser', '');

    // Retrieve the server path
    let parentURL = ipc.sendSync('serverPath', '');
    // This function will validate user / password against RForce Web server

    async function checkUserLogin(userName, password) {
        // Init response object
        let validationResult = {
            id: 0,
            user: '',
            password: '',
            firstName: '',
            lastName: '',
            result: 0
        };
        // Do ajax check
        $.ajax({
            url: `${parentURL}/!/userDetails?login=${userName}`,
            username: userName,
            password: password,
            timeout: 3000,
            type: "GET",
            async: false,
            success: function (userDetails) {
                // Got a successful result, check if received a valid user name
                if (userDetails.data[0].FirstName != null) {
                    // Got a name back, so user is valid, save it on result object
                    validationResult.id = userDetails.data[0].EmployeeID;
                    validationResult.user = userName;
                    validationResult.password = password;
                    validationResult.firstName = userDetails.data[0].FirstName;
                    validationResult.lastName = userDetails.data[0].LastName;
                    validationResult.result = 1; // <- 1 means validation was Ok
                }
                else {
                    // The user exists on the domain, but hasn't been added to RForce
                    validationResult.result = 2;
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                // Credentials are invalid or server couldn't be reached, nothing to do here
                return validationResult;
            }
        });
        // Done, return whatever the process generated
        return validationResult;
    };

    // Login button event handler
    $("#buttonLogin").on("click", async function () {
        // Check if user Id and password fields have values
        let userName = $("#userName").val().trim();
        let password = $("#password").val().trim();
        if ((userName != "") && (password != "")) {
            // Got user and password, let's validate
            let validationResult = await checkUserLogin(userName, password);
            // "result" attribute indicates if the validation was succesful:
            // 0 - Invalid credentials
            // 1 - Validation successful
            // 2 - User credentials are valid, but the user is not registered on RForce
            switch (validationResult.result) {
                case 2:
                    // Init fields
                    $("#userName").val('');
                    $("#password").val('riverbend\\');
                    alert('Credentials are valid, but the user is not registered on RForce.');
                    break;
                case 1:
                    // Successful, send user credentials to server process
                    let userSessionValue = JSON.stringify(validationResult);
                    let credentials = ipc.sendSync('userLoggedIn', userSessionValue);
                    // Save user credentials on a cookie
                    let userSessionExpiresOn = new Date();
                    userSession = userSessionExpiresOn.setDate(userSessionExpiresOn.getDate() + 999);
                    let sessionCookie = `userSession=${userSessionValue};expires=${userSessionExpiresOn.toUTCString()};`;
                    document.cookie = sessionCookie;
                    // Done; redirect to home page
                    //window.location.href = './home.html';
                    break;
                default:
                    // Init fields
                    $("#userName").val('riverbend\\');
                    $("#password").val('');
                    alert('Invalid user name / password combination.');
                    break;
            }
        }
    });

    async function checkSavedUserSession() {
        // If we've got credentials, check if they're still valid
        if (credentials.user) {
            $("#userName").val(credentials.user);
            $("#password").val(credentials.password);
            // Got user and password, let's validate
            let validationResult = await checkUserLogin(credentials.user, credentials.password);
            // "result" attribute indicates if the validation was succesful:
            // 0 - Invalid credentials
            // 1 - Validation successful
            // 2 - User credentials are valid, but the user is not registered on RForce
            switch (validationResult.result) {
                case 2:
                    // Init fields
                    $("#userName").val('');
                    $("#password").val('riverbend\\');
                    alert('Credentials are valid, but the user is not registered on RForce.');
                    break;
                case 1:
                    // Successful, send user credentials to server process
                    let userSessionValue = JSON.stringify(validationResult);
                    let credentials = ipc.sendSync('userLoggedIn', userSessionValue);
                    // Save user credentials on a cookie
                    let userSessionExpiresOn = new Date();
                    userSession = userSessionExpiresOn.setDate(userSessionExpiresOn.getDate() + 999);
                    let sessionCookie = `userSession=${userSessionValue};expires=${userSessionExpiresOn.toUTCString()};`;
                    document.cookie = sessionCookie;
                    // Done; redirect to home page
                    window.location.href = './home.html';
                    break;
                default:
                    // Init fields
                    $("#userName").val('riverbend\\');
                    $("#password").val('');
                    alert('Invalid user name / password combination.');
                    break;
            }

        }
    }

    await checkSavedUserSession();
});