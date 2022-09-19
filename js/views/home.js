// Enable ipc functionality, will use it to send / recieve messages between server and renderer processes.
const ipc = require('electron').ipcRenderer;

// Send an IPC message to the main process, so that we receive the user credentials
let credentials = ipc.sendSync('loggedUser', '');
// Assign logged user details
$("#userIsAdmin").text("true");
$("#loggedEmployeeId").val(credentials.id);

// Set logged user name
document.getElementById("loggedUserName").innerHTML = `<span><i class="icon-user icons"></i></span>&nbsp;${credentials.lastName}, ${credentials.firstName}`;

// And yet another IPC message to retrieve the server path
let parentURL = ipc.sendSync('serverPath', '');

// Admin user flag was passed through the hidden P tag "userIsAdmin" to handlebars
// let's now use jquery to retrieve it.
let UserIsAdmin = ($("#userIsAdmin").text() === 'true');
let UserId = $("#loggedEmployeeId").text();

console.log(UserIsAdmin)

// Utils
function isEmpty(obj) {
    for (var key in obj) {
        if (obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

// Date formatting functions, needed to pass dates and times to FullCalendar
function getFormattedDate(inputDate) {
    // FullCalendar expects to receive the default date in YYYY-MM-DD format, let's get to it
    let dd = inputDate.getDate();
    let mm = inputDate.getMonth() + 1; // Remember, getMonth returns 0 to 11
    return [inputDate.getFullYear(),
    (mm > 9 ? "" : "0") + mm,
    (dd > 9 ? "" : "0") + dd].join("-");
}

function getFormatedTime(inputDate) {
    // this one returns the time in hh:nn:ss format, but only taking hours and minutes into consideration
    let hh = inputDate.getHours();
    let nn = inputDate.getMinutes();
    return formatedTime = [(hh > 9 ? "" : "0") + hh,
    (nn > 9 ? "" : "0") + nn,
        "00"].join(":");
}

function getFormattedDateTime(inputDate) {
    // FullCalendar requires datetime fields in "YYYY-MM-DDThh:nn:ss" format
    let formatedDateTime = getFormattedDate(inputDate) + ' ' + getFormatedTime(inputDate) + 'Z';
    return formatedDateTime;
}


// The ever conspicuous document ready function...
$(document).ready(function () {
    // Hide some panels
    $("#panelDisplaySettings").hide();
    // Get this week' start and end dates
    let currentDate = new Date();
    let dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 0) {
        dayOfWeek = 7;
    }
    let wkStartDate = new Date();
    wkStartDate.setDate(currentDate.getDate() - (dayOfWeek - 1));
    wkStartDate = new Date(wkStartDate.getFullYear(), wkStartDate.getMonth(), wkStartDate.getDate(), 0, 0, 0, 0);
    let wkEndDate = new Date(wkStartDate.getFullYear(), wkStartDate.getMonth(), wkStartDate.getDate() + 6, 0, 0, 0, 0);

    // Get next week start and end dates
    let nextWkStartDate = new Date(wkStartDate);
    let nextWkEndDate = new Date(wkEndDate);
    nextWkStartDate.setDate(nextWkStartDate.getDate() + 7);
    nextWkEndDate.setDate(nextWkEndDate.getDate() + 7);
    // Retrieve current week activities
    let eventsURL = parentURL +
        "/home/!/activity" +
        "?startDate=" + getFormattedDateTime(wkStartDate) +
        "&endDate=" + getFormattedDateTime(wkEndDate);
    let thisWeekActivities = [];
    $.ajax({
        url: eventsURL,
        username: credentials.user,
        password: credentials.password,
        type: "GET",
        async: false,
        success: function (events) {
            if (!isEmpty(events.data)) {
                events.data.forEach(function (event) {
                    thisWeekActivities.push(event);
                });
            }
        }
    });

    // Retrieve next week activities
    eventsURL = parentURL +
        "/home/!/activity" +
        "?startDate=" + getFormattedDateTime(nextWkStartDate) +
        "&endDate=" + getFormattedDateTime(nextWkEndDate);
    let nextWeekActivities = [];
    $.ajax({
        url: eventsURL,
        username: credentials.user,
        password: credentials.password,
        type: "GET",
        async: false,
        success: function (events) {
            if (!isEmpty(events.data)) {
                events.data.forEach(function (event) {
                    nextWeekActivities.push(event);
                })
            }
        }
    });

    // Latest activity container functions
    function addActivityToContainer(containerId, panelIdentifier, activity) {
        // Setup the required identifies
        let buttonId = `btnActivity_${panelIdentifier}_${activity.RecordId}`;
        let collapse_id = `collapse_${panelIdentifier}_${activity.RecordId}`;
        // Prep up the button that will take us to the originating record
        let targetButtonCode = '';
        if ([1, 2, 3].includes(activity.EntrySource)) {
            let targetAddress = "window.location.href='./calendardetails.html?calendarId=" + activity.EntryId + "';"
            targetButtonCode = '        <button type="button" onclick="' + targetAddress + '"><i class="fa fa-search"></i> &nbsp; View </button>'
        }
        else if (activity.EntrySource === 4) {
            let targetAddress = "window.location.href='./tripdetails.html?tripId=" + activity.EntryId + "';"
            targetButtonCode = '        <button type="button" onclick="' + targetAddress + '"><i class="fa fa-search"></i> &nbsp; View </button>'
        }
        else if (activity.EntrySource === 5) {
            let targetAddress = "window.location.href='./dealdetails.html?dealNumber=" + activity.DealNumber + "';"
            targetButtonCode = '        <button type="button" onclick="' + targetAddress + '"><i class="fa fa-search"></i> &nbsp; View </button>'
        }
        else if (activity.EntrySource === 6) {
            if ((activity.NoteSource >= 100) && (activity.NoteSource <= 199)) {
                let targetAddress = "window.location.href='./companydetails.html?companyId=" + activity.NoteSourceId + "';"
                targetButtonCode = '        <button type="button" onclick="' + targetAddress + '"><i class="fa fa-search"></i> &nbsp; View </button>'
            }
            else if ((activity.NoteSource >= 200) && (activity.NoteSource <= 299)) {
                let targetAddress = "window.location.href='./contactdetails?contactId=" + activity.NoteSourceId + "';"
                targetButtonCode = '        <button type="button" onclick="' + targetAddress + '"><i class="fa fa-search"></i> &nbsp; View </button>'
            }
            else if ((activity.NoteSource >= 300) && (activity.NoteSource <= 399)) {
                let targetAddress = "window.location.href='./calendardetails.html?calendarId=" + activity.NoteSourceId + "';"
                targetButtonCode = '        <button type="button" onclick="' + targetAddress + '"><i class="fa fa-search"></i> &nbsp; View </button>'
            }
            else if (activity.NoteSource == 401) {
                let targetAddress = "window.location.href='./tripdetails.html?tripId=" + activity.NoteSourceId + "';"
                targetButtonCode = '        <button type="button" onclick="' + targetAddress + '"><i class="fa fa-search"></i> &nbsp; View </button>'
            }
            else if (activity.NoteSource == 402) {
                let targetAddress = "window.location.href='./tripdetails.html?tripId=" + activity.NoteSourceParentId + "&activityId=" + activity.NoteSourceId + "';"
                targetButtonCode = '        <button type="button" onclick="' + targetAddress + '"><i class="fa fa-search"></i> &nbsp; View </button>'
            }
        }
        // Assemble the card content
        let cardContent = '<div class="container">' +
            '<div class="row">' +
            '<div class="md-12">';

        if (activity.EntrySource == 6) {
            cardContent = cardContent +
                'Follow up:&nbsp;<strong>' + activity.FollowUpTypeDesc + '</strong></br>' +
                'by:&nbsp;<strong>' + activity.FollowUpParty + '</strong>';
        }
        else if ([1, 2, 3, 4].includes(activity.EntrySource)) {
            cardContent = cardContent +
                `Location:&nbsp;<strong>${activity.EventLocation}</strong></br>` +
                `Attendees:&nbsp;<strong>${activity.EventAttendees}</strong></br>`;
        }
        else {
            cardContent = cardContent +
                'Title: <strong>&nbsp;' + activity.Title + '</strong></br>';
        }

        if (activity.StartDate.substr(11, 8) !== "00:00:00") {
            cardContent = cardContent +
                'Starts: <strong>&nbsp;' + activity.StartDate.substr(0, 10) + ' ' + activity.StartDate.substr(11, 5) + '</strong></br>';
        }
        else {
            cardContent = cardContent +
                'Starts: <strong>&nbsp;' + activity.StartDate.substr(0, 10) + '</strong></br>';
        }
        if (activity.EndDate !== null) {
            if (activity.EndDate.substr(11, 8) !== "00:00:00") {
                cardContent = cardContent +
                    'Ends: <strong>&nbsp;' + activity.EndDate.substr(0, 10) + ' ' + activity.EndDate.substr(11, 5) + '</strong></br>';
            }
            else {
                cardContent = cardContent +
                    'Ends: <strong>&nbsp;' + activity.EndDate.substr(0, 10) + "</strong></br>";
            }
        }
        if (activity.DealNumber !== "") {
            cardContent = cardContent +
                'Deal: <strong>&nbsp;' + activity.DealNumber + '</strong></br>';
        }
        if (activity.CompanyId !== "") {
            cardContent = cardContent +
                'Company: <strong>&nbsp;' + activity.CompanyId + '</strong></br>';
        }
        if (activity.Notes !== "") {
            cardContent = cardContent +
                '<hr>' +
                '<strong>' + activity.Notes + '</strong>';
        }
        cardContent = cardContent + '</div></div>';
        let cardCode = '<div class="card">' +
            '    <div class="card-header" id="heading_' + collapse_id + '">' +
            '        <h5 class="mb-0">' +
            '            <a role="button" data-toggle="collapse" data-parent="' + containerId + '" href="#content_' + collapse_id + '" aria-expanded="false" aria-controls="content_' + collapse_id + '" style="font-size: 14px">' +
            '                ' + activity.EntrySourceDescription + " - " + activity.Title +
            '            </a>' +
            '        </h5>' +
            '    </div>' +
            '    <div id="content_' + collapse_id + '" class="collapse" aria-labelledby="heading_' + collapse_id + '">' +
            '        <div class="card-body">' +
            cardContent +
            '        </div>' +
            '        <hr>' +
            '        <div class="row">' +
            '            <div class="col-md">' +
            targetButtonCode +
            '            </div>' +
            '        </div>' +
            '    </div>' +
            '</div>';
        $(containerId).append(cardCode);
    }

    // Fill current week activities container
    thisWeekActivities.forEach(function (activity) {
        let activityDate = new Date(activity.StartDate.substr(0, 4),
            activity.StartDate.substr(5, 2) - 1,
            activity.StartDate.substr(8, 2),
            0,
            0,
            0,
            0);
        let dayOfWeek = activityDate.getDay();
        if (dayOfWeek === 0) {
            dayOfWeek = 7;
        }
        let containerName = "#panelWeek0" + dayOfWeek + "Container";
        addActivityToContainer(containerName, "thisWeek", activity);
    });

    // Fill next week activities container
    nextWeekActivities.forEach(function (activity) {
        addActivityToContainer("#panelNextWeekContainer", "nextWeek", activity);
    });

    // Top bar buttons (the ones we can use to add)

    $("#btnNewEvent").on("click", async function () {
        if (UserIsAdmin) {
            window.location.href = "./calendardetails.html?calendarId=new";
        }
        else {
            alert("You don't have enough privileges to perform this action.");
        }
    });

    $("#btnNewCompany").on("click", async function () {
        if (UserIsAdmin) {
            window.location.href = "./companydetails.html?companyId=new";
        }
        else {
            alert("You don't have enough privileges to perform this action.");
        }
    });

    $("#btnNewContact").on("click", async function (e, dt, node, config) {
        if (UserIsAdmin) {
            // create new empty contact
            $.ajax({
                url: `${parentURL}/contacts/!/contacts/new`,
                username: credentials.user,
                password: credentials.password,
                type: 'post',
                contentType: 'application/json',
                success: function (resp) {
                    let contactId = resp.data.ContactId;
                    window.location.href = `./contactdetails.html?contactId=${contactId}&new=yes`;
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    console.log('Unable to create new empty contact. (' + textStatus + ')');
                }
            });
        }
        else {
            alert("You don't have enough privileges to perform this action.");
        }
    });

    $("#btnNewTrip").on("click", async function () {
        if (UserIsAdmin) {
            window.location.href = "./tripdetails.html?tripId=new";
        }
        else {
            alert("You don't have enough privileges to perform this action.");
        }
    });

    $("#btnNewDeal").on("click", async function () {
        if (UserIsAdmin) {
            window.location.href = "./dealdetails.html?dealNumber=new";
        }
        else {
            alert("You don't have enough privileges to perform this action.");
        }
    });

    $("#btnNewNote").on("click", async function () {
        if (UserIsAdmin) {
            window.location.href = "./notes.html?new=yes";
        }
        else {
            alert("You don't have enough privileges to perform this action.");
        }
    });


    // Main settings button onClick event
    $("#btnMasterSettings").on("click", function () {
        $("#panelDisplaySettings").toggle("fast");
    });

    // Filter init function
    function resetFilterSettings() {
        $("#settingsDays").val("30");
        $("#chkSettingsShowCompanyNotes").prop("checked", true);
        $("#chkSettingsShowContactNotes").prop("checked", true);
        $("#chkSettingsShowCalendarNotes").prop("checked", true);
        $("#chkSettingsShowTripNotes").prop("checked", true);
        $("#chkSettingsLatestDeals").prop("checked", true);
        $("#chkSettingsLatestCompanies").prop("checked", false);
        $("#chkSettingsLatestContacts").prop("checked", false);
    }

    // Cookie handling functions
    function saveFilterSettings() {
        // Retrieve filter settings
        let numberOfDays = $("#settingsDays").val();
        let companyNotes = ($("#chkSettingsShowCompanyNotes").is(":checked")) ? 1 : 0;
        let contactNotes = ($("#chkSettingsShowContactNotes").is(":checked")) ? 1 : 0;
        let calendarNotes = ($("#chkSettingsShowCalendarNotes").is(":checked")) ? 1 : 0;
        let tripNotes = ($("#chkSettingsShowTripNotes").is(":checked")) ? 1 : 0;
        let latestDeals = ($("#chkSettingsLatestDeals").is(":checked")) ? 1 : 0;
        let latestCompanies = ($("#chkSettingsLatestCompanies").is(":checked")) ? 1 : 0;
        let latestContacts = ($("#chkSettingsLatestContacts").is(":checked")) ? 1 : 0;
        // Build cookie content
        let cookieContent = {
            "numberOfDays": numberOfDays,
            "companyNotes": companyNotes,
            "contactNotes": contactNotes,
            "calendarNotes": calendarNotes,
            "tripNotes": tripNotes,
            "latestDeals": latestDeals,
            "latestCompanies": latestCompanies,
            "latestContacts": latestContacts
        }
        let cookie = ["HomeLatesActvityFilter", "=", JSON.stringify(cookieContent)].join("");
        // Once baked, the cookie will expire in 7 days (60*60*24*7)
        document.cookie = cookie + ";max-age=604800";
    }

    function retrieveFilterSettings() {
        // Attempt to retrieve the cookie
        let decodedCookie = decodeURIComponent(document.cookie);
        let filterSettings = decodedCookie.split(';');
        // Check if the cookie has contents
        if (filterSettings.length > 0) {
            // There is cookie content, traverse through each cookie line to identify the one pertaining to this module
            let cookiePairs;
            for (let item = 0; item < filterSettings.length; item++) {
                // Split the line to get it's identifier and contents
                cookiePairs = filterSettings[item].split("=");
                // Check if this is the line we're looking for
                if (cookiePairs.length = 2) {
                    if (cookiePairs[0].trim() === "HomeLatesActvityFilter") {
                        // Found the desired cookie, let's parse it
                        let settings = JSON.parse(cookiePairs[1].trim());
                        // Load the values
                        if (settings.hasOwnProperty("numberOfDays")) {
                            $("#settingsDays").val(settings.numberOfDays)
                        }
                        if (settings.hasOwnProperty("companyNotes")) {
                            $("#chkSettingsShowCompanyNotes").prop("checked", (settings.companyNotes === 1));
                        }
                        if (settings.hasOwnProperty("contactNotes")) {
                            $("#chkSettingsShowContactNotes").prop("checked", (settings.contactNotes === 1));
                        }
                        if (settings.hasOwnProperty("calendarNotes")) {
                            $("#chkSettingsShowCalendarNotes").prop("checked", (settings.calendarNotes === 1));
                        }
                        if (settings.hasOwnProperty("tripNotes")) {
                            $("#chkSettingsShowTripNotes").prop("checked", (settings.tripNotes === 1));
                        }
                        if (settings.hasOwnProperty("latestDeals")) {
                            $("#chkSettingsLatestDeals").prop("checked", (settings.latestDeals === 1));
                        }
                        if (settings.hasOwnProperty("latestCompanies")) {
                            $("#chkSettingsLatestCompanies").prop("checked", (settings.latestCompanies === 1));
                        }
                        if (settings.hasOwnProperty("latestContacts")) {
                            $("#chkSettingsLatestContacts").prop("checked", (settings.latestContacts === 1));
                        }
                    }
                }
            }
        }
        else {
            // No settings saved, init all filters
            resetFilterSettings();
        }
    }
    // Load initial filter settings
    retrieveFilterSettings();

    // Home view settings "Cancel" onClick event
    $("#btnCancelHomeSettings").on("click", function () {
        // Retrieve whatever previous settings we have
        retrieveFilterSettings();
        // Refresh home events
        loadLatestActivities();
        // Hide the settings panel
        $("#panelDisplaySettings").toggle("fast");
    });

    // Home view settings "Apply" onClick event
    $("#btnApplyHomeSettings").on("click", function () {
        // Save selected settings
        saveFilterSettings();
        // Refresh latest activities
        loadLatestActivities();
        // Hide the settings panel
        $("#panelDisplaySettings").toggle("fast");
    });

    // Latest activities

    function addLatestToContainer(activity) {
        // Setup the required identifiers
        let buttonId = "btn_latest_" + activity.RecordId;
        let collapse_id = "collapse_latest_" + activity.RecordId;
        // Prep up the button that will take us to the originating record
        let targetButtonCode = '';
        let targetAddress = "";
        if (activity.Source == 1) {
            // Notes
            if ([101, 102].includes(activity.NoteSource)) {
                targetAddress = "window.location.href='./companydetails.html?companyId=" + activity.NoteSourceId + "';"
            }
            else if ([201, 202].includes(activity.NoteSource)) {
                targetAddress = "window.location.href='./contactdetails.html?contactId=" + activity.NoteSourceId + "';"
            }
            else if (activity.NoteSource === 301) {
                targetAddress = "window.location.href='./calendardetails.html?calendarId=" + activity.NoteSourceId + "';"
            }
            else if (activity.NoteSource === 401) {
                targetAddress = "window.location.href='./tripdetails.html?tripId=" + activity.NoteSourceId + "';"
            }
            else {
                targetAddress = "window.location.href='./tripdetails.html?tripId=" + activity.NoteParentSourceId + "&activityId=" + activity.NoteSourceId + "';"
            }
        }
        else if (activity.Source == 2) {
            // External company
            targetAddress = "window.location.href='./companydetails.html?companyId=" + activity.SourceId + "';"
        }
        else if (activity.Source == 3) {
            // Contact
            targetAddress = "window.location.href='./contactdetails?contactId=" + activity.SourceId + "';"
        }
        else if (activity.Source == 4) {
            // Deal
            targetAddress = "window.location.href='./dealdetails.html?dealNumber=" + activity.SourceId + "';"
        }
        targetButtonCode = `<button type="button" onclick="${targetAddress}"><i class="fa fa-search"></i>&nbsp;View</button>`;
        // Assemble the card content
        let cardContent = '';
        if (activity.Source == 1) {
            cardContent = cardContent +
                '<div class="row">' +
                '<div class="col-md-12">' +
                `Last update:&nbsp;<strong>'${activity.WhenChanged.substr(0, 10)}'</strong>` +
                '<hr>' +
                `<strong>${activity.Contents.split(String.fromCharCode(10)).join("<br/>")}</strong>` +
                '</div>' +
                '</div>';
        }
        else if (activity.Source == 4) {
            cardContent = cardContent +
                '<div class="row">' +
                '<div class="col-md-12">' +
                `Deal number:&nbsp;<strong>${activity.SourceId}</strong></br>` +
                `Basin:&nbsp;<strong>${activity.DealBasin}</strong></br>` +
                `Company:&nbsp;<strong>${activity.DealCompany}</strong></br>` +
                `Status:&nbsp;<strong>${activity.DealStatus}</strong></br>` +
                `Bid due date:&nbsp;<strong>${activity.DealBidDueDate.substr(0, 10)}</strong></br>` +
                `Created by:&nbsp;<strong>${activity.DealWhoCreated}</strong> on <strong>${activity.WhenChanged.substr(0, 10)}</strong></br>` +
                '<hr>' +
                '<strong>' + activity.Contents.split(String.fromCharCode(10)).join("<br/>") + '</strong>' +
                '</div>' +
                '</div>';
        }
        // Then lets create the card
        let cardCode = '<div class="card">' +
            `<div class="card-header" id="heading_${collapse_id}">` +
            '<h5 class="mb-0">' +
            `<a role="button" data-toggle="collapse" data-parent="panelLatestActivityContainer" href="#content_${collapse_id}" aria-expanded="false" aria-controls="content_' + collapse_id + '" style="font-size: 14px">` +
            activity.Description +
            '</a>' +
            '</h5>' +
            '</div>' +
            `<div id="content_${collapse_id}" class="collapse" aria-labelledby="heading_${collapse_id}">` +
            '<div class="card-body">' +
            cardContent +
            '</div>' +
            '<hr>' +
            '<div class="row">' +
            '<div class="col-md-12">' +
            targetButtonCode +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>';
        // And append it to it's propper container
        $("#panelLatestActivityContainer").append(cardCode);
    }

    function loadLatestActivities() {
        // Retrieve latest activities
        let latestActivities = [];
        let numberOfDays = $("#settingsDays").val();
        let companyNotes = ($("#chkSettingsShowCompanyNotes").is(":checked")) ? 1 : 0;
        let contactNotes = ($("#chkSettingsShowContactNotes").is(":checked")) ? 1 : 0;
        let calendarNotes = ($("#chkSettingsShowCalendarNotes").is(":checked")) ? 1 : 0;
        let tripNotes = ($("#chkSettingsShowTripNotes").is(":checked")) ? 1 : 0;
        let latestDeals = ($("#chkSettingsLatestDeals").is(":checked")) ? 1 : 0;
        let latestCompanies = ($("#chkSettingsLatestCompanies").is(":checked")) ? 1 : 0;
        let latestContacts = ($("#chkSettingsLatestContacts").is(":checked")) ? 1 : 0;
        $.ajax({
            url: `${parentURL}/home/!/latestUpdates?days=${numberOfDays}&companyNotes=${companyNotes}&contactNotes=${contactNotes}&contactNotes=${contactNotes}&calendarNotes=${calendarNotes}&tripNotes=${tripNotes}&latestDeals=${latestDeals}&latestCompanies=${latestCompanies}&latestContacts=${latestContacts}`,
            username: credentials.user,
            password: credentials.password,
            type: "GET",
            async: false,
            success: function (activity) {
                if (!isEmpty(activity.data)) {
                    activity.data.forEach(function (item) {
                        latestActivities.push(item);
                    })
                }
            }
        });
        // Clear the latest activities container
        $("#panelLatestActivityContainer").empty();
        // Is there something to report?
        if (latestActivities.length > 0) {
            for (let i = 0; i < latestActivities.length; i++) {
                addLatestToContainer(latestActivities[i]);
            }
        }
    }
    // Do an initial latest activity fetch
    loadLatestActivities();
});