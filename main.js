const electron = require('electron');
const { app, BrowserWindow, ipcMain, session, dialog } = electron;
const PDFWindow = require('electron-pdf-window');
const fs = require('fs');
const updater = require('./updater');

// Get current app path
let execPath = app.getAppPath();
let serverPath = 'https://rforce.team';
let searchForUpdates = true;

// Setup our global object that will hold user credentials
let userCredentials = {
  id: 0,
  user: '',
  password: '',
  lastName: '',
  firstName: ''
}

// setup a global object that will hold necessary data for Rdata Email To New Note
let noteSpec = {
  entityName: '',
  entityId: 0,
  target: '',
  comment: '',
  emailId: '',
};

// This one will hold page cookies
let pageCookies;

// This array will hold the deal listing required to display previous and next deals
let dealList = [];

/* IPC handlers */

// Setup an IPC handler to send the RForce server path whenever required
ipcMain.on('serverPath', (event, arg) => {
  event.returnValue = serverPath;
});

// Setup an IPC handler to receive user credentials once authentication has taken place
ipcMain.on('userLoggedIn', (event, arg) => {
  let response = JSON.parse(arg);
  userCredentials.id = response.id;
  userCredentials.user = response.user;
  userCredentials.password = response.password,
    userCredentials.lastName = response.lastName,
    userCredentials.firstName = response.firstName
  // Return something, otherwise the render process will freeze
  event.returnValue = "Ok";
});

// Setup an IPC handler to clear user credentials once user has explicitly logged out
ipcMain.on('userLoggedOut', (event, arg) => {
  // Clear credentials object
  userCredentials.user = '';
  userCredentials.password = '',
    userCredentials.lastName = '',
    userCredentials.firstName = ''
  // Setup our callback function
  function waitForCookieRefresh(result) {
    event.returnValue = result;
  }
  // Wait for cookies to refresh
  win.webContents.session.cookies.get({}, (error, cookies) => {
    // Did load cookies
    pageCookies = cookies;
    waitForCookieRefresh();
  });
});

// This function will search for usser session cookie


// Setup an IPC handler to send the user's credentials to the render process whenever required
ipcMain.on('loggedUser', async (event, arg) => {

  function returnLogin(result) {
    event.returnValue = result;
  }

  win.webContents.session.cookies.get({}, (error, cookies) => {
    // Did load cookies
    pageCookies = cookies;
    // Search for previous user session
    let cookie = null;
    if (pageCookies.length > 0) {
      for (let i = 0; i < pageCookies.length; i++) {
        if (pageCookies[i].name == 'userSession') {
          cookie = pageCookies[i];
          break;
        }
      }
    }
    if (cookie) {
      let cookieValue = JSON.parse(cookie.value);
      userCredentials.id = cookieValue.id;
      userCredentials.user = cookieValue.user;
      userCredentials.password = cookieValue.password;
      userCredentials.lastName = cookieValue.lastName;
      userCredentials.firstName = cookieValue.firstName;
    }
    returnLogin(userCredentials)
  });
});




// Setup an IPC handler to receive user credentials once authentication has taken place
ipcMain.on('userLoggedIn', (event, arg) => {
  let response = JSON.parse(arg);
  userCredentials.id = response.id;
  userCredentials.user = response.user;
  userCredentials.password = response.password,
    userCredentials.lastName = response.lastName,
    userCredentials.firstName = response.firstName
  // Return something, otherwise the render process will freeze
  event.returnValue = "Ok";
});


// Setup an IPC handler to be used by RData screen to store (SET) a add-new {deal|contact|company|calendar} request 
ipcMain.on('setRdataAddNew', (event, arg) => {
  let response = JSON.parse(arg);
  noteSpec.entityName = response.entityName;
  noteSpec.entityId = response.entityId;
  noteSpec.target = response.target;
  noteSpec.comment = response.comment;
  noteSpec.emailId = response.emailId;
  // Return something, otherwise the render process will freeze
  event.returnValue = "Ok";
});


// Setup an IPC handler to be used to retrieve (GET) add-new {deal|contact|company|calendar} request 
ipcMain.on('getRdataAddNew', async (event, arg) => {
  function returnLogin(result) {
    event.returnValue = result;
  }
  returnLogin(noteSpec)
});

// Setup an IPC handler to be used to clear the add-new {deal|contact|company|calendar} request after requested was triggered
ipcMain.on('clearRdataAddNew', async (event) => {
  noteSpec.entityName = '';
  noteSpec.entityId = 0;
  noteSpec.target = '';
  noteSpec.comment = '';
  noteSpec.emailId = '';
  // Return something, otherwise the render process will freeze
  event.returnValue = "Ok";
});



// Setup an IPC handler to send deal's table cookie (required by dealdetails to know which deal comes before and after)
ipcMain.on('dealtablestate', (event, arg) => {
  // Return something, otherwise the render process will freeze
  let cookie = "{}";
  if (pageCookies.length > 0) {
    for (let i = 0; i < pageCookies.length; i++) {
      if (pageCookies[i].name == 'dealtablestate') {
        cookie = pageCookies[i].value;
        break;
      }
    }
  }
  // Return something, otherwise the render process will freeze
  event.returnValue = cookie;
});

ipcMain.on('displayPDF', (event, arg) => {
  // PDF data comes in base64, convert it to binary
  let binaryPDF = new Buffer(arg, 'base64');
  // let's now save it to a temporary file
  fs.writeFileSync(execPath + "\\pdfpreview.pdf", binaryPDF, 'binary');
  // Create a new PDF viewer window
  let pdfWin = new PDFWindow({});
  // This will happen once the PDF window gets closed
  pdfWin.on('closed', () => {
    // Remove the reference to the window object (or array if we're using multiple windows) 
    pdfWin = null;
  });
  // load the temporary file
  pdfWin.loadURL(execPath + '\\pdfpreview.pdf');
  // Need to return something, otherwise the application will hang
  event.returnValue = 'Ok';
});

ipcMain.on('setDealList', (event, arg) => {
  // Deal list comes as a pipe separated string
  dealList = arg.split('|');
  // Need to return something, otherwise the application will hang
  event.returnValue = 'Ok';
});

ipcMain.on('getPNDeals', (event, arg) => {
  // Check if we have a deal listing, so to identify previous and next deal
  let previousDeal = '';
  let nextDeal = '';
  for (let i = 0; i < dealList.length; i++) {
    if (dealList[i] == arg.toString()) {
      // Found it, grab the previous and next deals in the list
      if (i > 0) {
        previousDeal = dealList[i - 1];
      }
      if (i < dealList.length - 1) {
        nextDeal = dealList[i + 1];
      }
    }
  }
  // Let's return a JSON object (stringified) with the previous and next deal numbers
  event.returnValue = JSON.stringify({ previousDeal: previousDeal, nextDeal: nextDeal });
});

// Setup a global reference to our window object; if we don't do this, the window
// will close automatically ocnce the js object gets eliminated by the garbage collector.
let win;

function createWindow() {
  // Create our browser window
  const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize
  win = new BrowserWindow({
    width,
    height,
    webPreferences: {
      nodeIntegration: true,
      plugins: true,
      autoplayPolicy: "no-user-gesture-required"
    },
    icon: __dirname + '/icon/ms-icon-70x70.png'
  });
  // win.webContents.openDevTools();
  // then let's load our main html file
  win.loadFile('./html/index.html');

  // This will happen once the main window gets closed
  win.on('closed', () => {
    // Remove the reference to the window object (or array if we're using multiple windows) 
    win = null;
  });
}

// This method gets called once Electron is both fully initialized
// and ready to create browser windows.
// Please note that some APIs can be used only after this event gets triggered.

app.on('ready', () => {
  // Check if app-update.yml file exists
  try {
    if (fs.existsSync(execPath + '\\..\\app-update.yml')) {
      console.log("Found app-update.yml file.")
    }
    else {
      // File doesn't exist, try to create it
      try {
        fs.writeFileSync(execPath + '\\..\\app-update.yml', 'owner: rehalt\nrepo: rforce_desktop\nprovider: github\nupdaterCacheDirName: rforce_desktop-updater', 'utf-8');
        console.log("Created app-update.yml file.")
      }
      catch (e) {
        console.log("Couldn't create app-update.yml file.")
      }
    }
  } catch (err) {
    console.log("Error checking por app-update.yml file.")
  }

  // Load config file
  fs.readFile(`${execPath}\\config.json`, 'utf-8', function (err, data) {
    if (!err) {
      let configData = JSON.parse(data);
      if (configData.hasOwnProperty('serverPath')) {
        console.log('Server path found on config.json:', configData.serverPath);
        serverPath = configData.serverPath;
      }
      else {
        console.log('No serverPath on config.json, using default.')
      }
      if (configData.hasOwnProperty('searchForUpdates')) {
        console.log('searchForUpdates parameter found on config.json:', configData.searchForUpdates);
        searchForUpdates = configData.searchForUpdates;
      }
      else {
        console.log('No searchForUpdates flag on config.json, enabling by default.')
      }
    }
    else {
      console.log("No config.json file; serverPath set to https://rforce.team, and searchForUpdates set to true.")
    }
    // Done
    if (searchForUpdates) {
      setAutoUpdateTimer();
    }
    else {
      console.log('Automatic updates disabled; to enable edit config.json and set searchForUpdates flag to true.')
    }
  });

  // This function will setup the autoupdate timer
  function setAutoUpdateTimer() {
    // Set auto-update timer
    setTimeout(updater.check, 2000);
  }

  // Init main window
  createWindow();

  // Event handler
  win.webContents.on('did-finish-load', function () {
    // Reload cookies
    win.webContents.session.cookies.get({}, (error, cookies) => {
      // Did load cookies
      pageCookies = cookies;
      // Search for previous user session
      let cookie = null;
      if (pageCookies.length > 0) {
        for (let i = 0; i < pageCookies.length; i++) {
          if (pageCookies[i].name == 'userSession') {
            cookie = pageCookies[i];
            break;
          }
        }
      }
      if (cookie) {
        let cookieValue = JSON.parse(cookie.value);
        userCredentials.user = cookieValue.user;
        userCredentials.password = cookieValue.password;
        userCredentials.lastName = cookieValue.lastName;
        userCredentials.firstName = cookieValue.firstName;
      }
    });
  });

  // Check for X-Frame options on headers; need to remove them in order to allow 
  // OneNote contents to be displayed within an iFrame.
  win.webContents.session.webRequest.onHeadersReceived({}, (details, callback) => {
    if (details.responseHeaders['X-Frame-Options']) {
      delete details.responseHeaders['X-Frame-Options'];
    }
    callback({ cancel: false, responseHeaders: details.responseHeaders });
  });
});

// Gracefully exit once all windows are closed
app.on('window-all-closed', () => {
  // This is to handler Mac's Ctrl-Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
})

app.on('activate', () => {
  // On macOs it is common to create a window again in an application when the
  // icon on the dock gets clicked and there are no other windows open 
  if (win === null) {
    createWindow();
  }
})

app.on('login', function (event, webContents, request, authInfo, callback) {
  // This event get's triggered whenever the render process (browser window) requires a login.
  // We can cancel the default behaviour, and send the user/password we already have.
  event.preventDefault();
  callback(userCredentials.user, userCredentials.password);
});