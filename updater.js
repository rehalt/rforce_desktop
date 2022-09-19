// Modules
const {autoUpdater} = require('electron-updater');

// Enable logging
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';

// Check for updates
exports.check = () => {
    // Start update check
    process.env.GH_TOKEN = '7c4fb5683bf671e26619d85ce032fe9aa2898424'; // 'a56458b0ddd0cdbe0a6f75f465616a58ae031c20';
    autoUpdater.checkForUpdates();
}

// Once downloaded, quit and install the update
autoUpdater.on('update-downloaded', (info) => {
    console.log("File downloaded, executing update now.")
    autoUpdater.quitAndInstall();  
});

// If no update is available, then reschedule for a new check in an hour
autoUpdater.on('update-not-available', (info) => {
    console.log("No updates available, will check again in 8 hours.")
    setTimeout(this.check, 28800000);
})