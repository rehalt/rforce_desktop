// Enable ipc functionality, will use it to send / recieve messages between server and renderer processes.
const ipc = require('electron').ipcRenderer;

// Send an IPC message to the main process, so that we receive the user credentials
let credentials = ipc.sendSync('loggedUser', '');
// Assign logged user details
$("#userIsAdmin").text("true");
$("#loggedEmployeeId").text(credentials.id);

// Set logged user name
document.getElementById("loggedUserName").innerHTML = `<span><i class="icon-user icons"></i></span>&nbsp;${credentials.lastName}, ${credentials.firstName}`;

// And yet another IPC message to retrieve the server path
let parentURL = ipc.sendSync('serverPath', '');

// Color coding
let colorBusinessDevelopment = "#751AFF";
let colorCorporate = "#9900CC";
let colorEventHoliday = "#FF0066";
let colorTrip = "#008000";
let colorDeal = "#990000";
let colorNote = "#B38600";

// Check if user is Admin
let UserIsAdmin = ($("#userIsAdmin").text() === 'true');
let UserId = $("#loggedEmployeeId").text();

// Main template notification handlers
let masterTemplateNotificationCount = 0;
function initMainTemplateNotifications(){
    // Set the notification count to 0
    masterTemplateNotificationCount = 0;
    // Clear notification count
    $("#hdrNotificationCount").html("");
    // Also clear the notifications container
    $("#hdrNotificationTitle").html("<h3><strong>Your notifications.</strong></h3>");
    $("#hdrNotificationContainer").empty();
}

// Date conversion functions

let today = new Date();  
let timezoneOffset = today.getTimezoneOffset() * 60000;

function convertMomentToDate(aMoment, timezoneOffset){
    // This function receives a "moment" object, and returns a single date/time var
    let resultDate;
    if (aMoment._i.constructor === Array) {
        resultDate = new Date(aMoment._i[0], 
                              aMoment._i[1],
                              aMoment._i[2],
                              aMoment._i[3],
                              aMoment._i[4],
                              aMoment._i[5],
                              aMoment._i[6]);
    }
    else {
        // date._i has de provided moment's date in miliseconds, but needs to be adjusted by timezone offset
      resultDate = new Date(aMoment._i + timezoneOffset);
    }
    return resultDate;
}

// Date formatting functions, needed to pass dates and times to FullCalendar
function getFormattedDate(inputDate){
    // FullCalendar expects to receive the default date in YYYY-MM-DD format, let's get to it
    let dd = inputDate.getDate();
    let mm = inputDate.getMonth() + 1; // Remember, getMonth returns 0 to 11
    return [inputDate.getFullYear(), 
            (mm > 9 ? "" : "0") + mm, 
            (dd > 9 ? "" : "0") + dd].join("-");
}

function getFormattedTime(inputDate){
    // this one returns the time in hh:nn:ss format, but only taking hours and minutes into consideration
    let hh = inputDate.getHours();
    let nn = inputDate.getMinutes();
    return formatedTime = [(hh > 9 ? "" : "0") + hh,
                           (nn > 9 ? "" : "0") + nn,
                           "00"].join(":");
}

function getFormattedDateTime(inputDate){
    // FullCalendar requires datetime fields in "YYYY-MM-DDThh:nn:ss" format
    let formatedDateTime = getFormattedDate(inputDate) + 'T' + getFormattedTime(inputDate) + 'Z';
    return formatedDateTime;
}

// The ever conspicuous document ready function...
$(document).ready(function() {

    // Load company selector
    $.ajax({
        url: `${parentURL}/!/company`,
        username: credentials.user,
        password: credentials.password,
        type: "GET", 
        async: false,
        success: function(response) { 
            // Traverse through result set
            for (let i = 0; i < response.data.length; i++){
                $("#settingsCompany").append(new Option(response.data[i].Company, response.data[i].CompanyID));
            }
        },
        error: function(data) {
            console.log('Ajax error retrieving companies.');
        }
    });

    // Load department selector
    $.ajax({
        url: `${parentURL}/!/department`,
        username: credentials.user,
        password: credentials.password,
        type: "GET", 
        async: false,
        success: function(response) { 
            // Traverse through result set
            for (let i = 0; i < response.data.length; i++){
                $("#settingsDepartment").append(new Option(response.data[i].Name, response.data[i].DepartmentId));
            }
        },
        error: function(data) {
            console.log('Ajax error retrieving departments.');
        }
    });

    // Load external company selector
    $.ajax({
        url: `${parentURL}/companies/!/companyList`,
        username: credentials.user,
        password: credentials.password,
        type: "GET", 
        async: false,
        success: function(response) { 
            // Traverse through result set
            for (let i = 0; i < response.data.length; i++){
                $("#settingsExternalCompany").append(new Option(response.data[i].Name, response.data[i].ExternalCompanyId));
            }
        },
        error: function(data) {
            console.log('Ajax error retrieving external companies.');
        }
    });

    // Load employee selector
    $.ajax({
        url: `${parentURL}/!/employee`,
        username: credentials.user,
        password: credentials.password,
        type: "GET", 
        async: false,
        success: function(response) { 
            // Traverse through result set
            for (let i = 0; i < response.data.length; i++){
                $("#settingsEmployee").append(new Option(response.data[i].LastName + " " + response.data[i].FirstName, response.data[i].EmployeeId));
            }
        },
        error: function(data) {
            console.log('Ajax error retrieving employees.');
        }
    });
    
    // Enable chosen selectors
    $('#settingsCompany').chosen({ width: "100%", allow_single_deselect: true});
    $('#settingsDepartment').chosen({ width: "100%", allow_single_deselect: true});
    $('#settingsExternalCompany').chosen({ width: "100%", allow_single_deselect: true});
    $('#settingsEmployee').chosen({ width: "100%", allow_single_deselect: true});
    
    // Hide the settings panel
    $("#panelDisplaySettings").hide();

    // FullCalendar related
    $('#calendar').fullCalendar({
        themeSystem: 'jquery-ui',
        customButtons:{
            customAddEvent:{
                text: 'new event',
                click: function(){
                    // Check if user is Admin
                    if (UserIsAdmin) {
                        // We're adding a new event
                        window.location.href = './calendardetails.html?calendarId=new'
                    }
                    else {
                        alert("Sorry, but you don't have enough privileges to create an event.");
                    }
                }
            },
            customAddTrip:{
                text: 'new trip',
                click: function(){
                    // Check if user is Admin
                    if (UserIsAdmin) {
                        // We're adding a new event
                        
                        // Uncomment this when trip is fully migrated
                        // window.location.href = './tripdetails.html?tripId=new'
                    }
                    else {
                        alert("Sorry, but you don't have enough privileges to create a new trip.");
                    }
                }
            },
            customFilter:{
                text: 'filter',
                click: function(){
                    $("#panelDisplaySettings").toggle("fast");
                }
            }
        },
        header: {
            left: 'prev,next today customAddEvent customAddTrip',
            center: 'title',
            right: ' customFilter listDay,agendaWeek,month,listWeek',
            timezone: false
        },
        // Customize the button names
        views: {
            listDay: { buttonText: 'day' },
            listWeek: { buttonText: 'agenda'},
            agendaWeek: { buttonText: 'week'} 
        },
        // Calendar display options
        defaultView: 'month',
        defaultDate: today,
        navLinks: true, 
        editable: false,
        eventLimit: false,
        handleWindowResize: true,
        events: async function(start, end, timezone, callback) {
            $('#calendar').fullCalendar('removeEvents');
            let startDate = convertMomentToDate(start, timezoneOffset);
            let endDate = convertMomentToDate(end, timezoneOffset);
            let company = $("#settingsCompany").val();
            let department = $("#settingsDepartment").val();;
            let externalCompany = $("#settingsExternalCompany").val();;
            let addedBy = $("#settingsEmployee").val();
            let includeBusinessDevelopment =  ($("#chkSettingsBusinessDevelopment").is(":checked")) ? 1 : 0;
            let includeCorporate =  ($("#chkSettingsCorporate").is(":checked")) ? 1 : 0;
            let includeEventsHolidays =  ($("#chkSettingsEventsHolidays").is(":checked")) ? 1 : 0;
            let includeTrips = ($("#chkSettingsTrips").is(":checked")) ? 1 : 0;
            let includeDeals = ($("#chkSettingsDeals").is(":checked")) ? 1 : 0;
            let includeNotes = ($("#chkSettingsNotes").is(":checked")) ? 1 : 0;
            // Assembler the calling URL
            let eventsURL = parentURL +
                            "/calendar/!/events" +
                            "?startDate=" + getFormattedDateTime(startDate) + 
                            "&endDate=" + getFormattedDateTime(endDate) + 
                            "&company=" + company +
                            "&department=" + department +
                            "&externalCompany=" + externalCompany +
                            "&addedBy=" + addedBy +
                            "&includeBusinessDevelopment=" + includeBusinessDevelopment +
                            "&includeCorporate=" + includeCorporate +
                            "&includeEventsHolidays=" + includeEventsHolidays +
                            "&includeTrips=" + includeTrips +
                            "&includeDeals=" + includeDeals +
                            "&includeNotes=" + includeNotes;
            // Retrieve calendar events
            await $.ajax({
                url: eventsURL,
                username: credentials.user,
                password: credentials.password,
                dataType: 'json',
                data: {
                    start: getFormattedDate(startDate),
                    end: getFormattedDate(endDate)
                },
                success: function(doc){
                    let events = [];
                    let eventColor;
                    let eventAllDay;
                    let eventId;
                    let eventStart;
                    let eventEnd;
                    if (doc !== null){
                        doc.forEach(function(eventObject) {
                            eventStart = eventObject.StartDate;
                            eventEnd = null;
                            // Check event type (types 1, 2 and 3 are Calendar entries)
                            if ([1, 2, 3].includes(eventObject.EntrySource)) {
                                // for calendar events we'll add a "calendar_" prefix to the ID, so we can get to identify them
                                if (eventObject.EntrySource === 1){
                                    // Business development
                                    eventId = 'calendar_bd_' + eventObject.CalendarId;
                                    eventColor = colorBusinessDevelopment;
                                }
                                else if (eventObject.EntrySource === 2){
                                    // Corporate
                                    eventId = 'calendar_co_' + eventObject.CalendarId;
                                    eventColor = colorCorporate;
                                }
                                else {
                                    // Event / Holiday
                                    eventId = 'calendar_eh_' + eventObject.CalendarId;
                                    eventColor = colorEventHoliday;
                                }
                                // Check if this is an all-day event
                                if (eventObject.AllDay === 1){
                                    eventAllDay = true;
                                }
                                else {
                                    eventAllDay = false;
                                    // Get the event's end date
                                    eventEnd = eventObject.EndDate;
                                }
                            }
                            else if (eventObject.EntrySource === 4) {
                                eventColor = colorTrip;
                                // For trips we'll add the "trip" prefix to de ID, so we can identify them
                                eventId = 'trip_' + eventObject.CalendarId;
                                // Since trips may run for more than one day, we can't tag them as all-day given that FullCalendar will
                                // not render them correctly
                                eventAllDay = false;
                                // Instead we'll set the end date/time to the very last second of the end date,
                                eventEnd = new Date(eventObject.EndDate.toString().substr(0, 10) + " 23:59:59");
                            }
                            else if (eventObject.EntrySource === 5) {
                                eventColor = colorDeal;
                                // for deal due date events we'll add a "deal_" prefix to the ID, so we can get to identify them
                                eventId = 'deal_' + eventObject.Title;
                                // Deal due date is considered "All-day"
                                eventAllDay = true;
                            }
                            else if (eventObject.EntrySource === 6) {
                                eventColor = colorNote;
                                // for note follow up dates we'll add a "note_" prefix to the ID, so we can get to identify them
                                eventId = 'note_' + eventObject.CalendarId;
                                // Deal due date is considered "All-day"
                                eventAllDay = true;
                            }
                            // Got it, push it...
                            events.push({
                                id: eventId,
                                title: eventObject.Title,
                                start: eventStart,
                                end: eventEnd,
                                textColor: '#FFFFFF',
                                color: eventColor,
                                allDay: eventAllDay
                            });
                        });
                    }
                    callback(events);
                }
            })
        },
        eventOverlap: function(stillEvent, movingEvent){
            return true;
        },
        eventClick: async function(calEvent, jsEvent, view){
            // Check the nature of this event
            if (calEvent.id.substring(0, 9) === "calendar_"){
                // Calendar entry
                let calendarId = calEvent.id.substring(12, calEvent.id.length);
                // Open the event
                window.location.href = `./calendardetails.html?calendarId=${calendarId}`;
            }
            else if (calEvent.id.substring(0, 5) == "trip_"){
                // Trip entry
                let tripId = calEvent.id.substring(5, calEvent.id.length);
                // Open the event
                window.location.href = `./tripdetails.html?tripId=${tripId}`;
            }
            else if (calEvent.id.substring(0, 5) == "deal_"){
                // Deal entry
                let dealId = calEvent.id.substring(5, calEvent.id.length);
                // Open the event
                window.location.href = `./dealdetails.html?dealId=${dealId}`;
            }
            else if (calEvent.id.substring(0, 5) == "note_"){
                // Note entry
                let noteId = calEvent.id.substring(5, calEvent.id.length);
                // Get note contents
                $.ajax({
                    url: `${parentURL}/notes/!/noteDetails?noteId=${noteId}`,
                    username: credentials.user,
                    password: credentials.password,
                    type: "GET", 
                    async: true,
                    success: function(note) { 
                        // Clear the modal contents
                        $("#noteContentTitle").empty();
                        $("#noteContentTitle").append("<strong>Note on " + note.data[0].SourceIdDescription + "</strong>");
                        $("#noteContentDetails").empty();
                        let targetButtonCode;
                        // Need to get the note's source
                        if ((note.data[0].Source >= 100) && (note.data[0].Source <= 199)){
                            let targetAddress = "window.location.href='./companydetails.html?companyId=" + note.data[0].SourceId + "';"
                            targetButtonCode = '<button type="button" onclick="' + targetAddress + '"><i class="fa fa-search"></i> &nbsp; View </button>'
                        }
                        else if ((note.data[0].Source >= 200) && (note.data[0].Source <= 299)){
                            let targetAddress = "window.location.href='./contactdetails.html?contactId=" + note.data[0].SourceId + "';"
                            targetButtonCode = '<button type="button" onclick="' + targetAddress + '"><i class="fa fa-search"></i> &nbsp; View </button>'
                        }
                        else if ((note.data[0].Source >= 300) && (note.data[0].Source <= 399)){
                            let targetAddress = "window.location.href='./calendardetails.html?calendarId=" + note.data[0].SourceId + "';"
                            targetButtonCode = '<button type="button" onclick="' + targetAddress + '"><i class="fa fa-search"></i> &nbsp; View </button>'
                        }
                        else if (note.data[0].Source == 401){
                            let targetAddress = "window.location.href='./tripdetails.html?tripId=" + note.data[0].SourceId + "';"
                            targetButtonCode = '<button type="button" onclick="' + targetAddress + '"><i class="fa fa-search"></i> &nbsp; View </button>'
                        }
                        else if (note.data[0].Source == 402){
                            let targetAddress = "window.location.href='./tripdetails.html?tripId=" + note.data[0].SourceParentId + "&activityId=" + note.data[0].SourceId + "';"
                            targetButtonCode = '<button type="button" onclick="' + targetAddress + '"><i class="fa fa-search"></i> &nbsp; View </button>'
                        }
                        // Assemble the content
                        $("#noteContentDetails").append("<p><strong>Created on:</strong>&nbsp;&nbsp;" + note.data[0].WhenCreated.substr(0, 10) + " " + note.data[0].WhenCreated.substr(11, 5) + " <strong>by</strong> " + note.data[0].WhoCreatedName + "</p>");
                        if (note.data[0].FollowUpType > 0){
                            $("#noteContentDetails").append("<p><strong>Follow up:</strong>&nbsp;&nbsp;" + note.data[0].FollowUpTypeDescription + "</p>");
                            if (note.data[0].FollowUpParty != ""){
                                $("#noteContentDetails").append("<p><strong>Responsible party:</strong>&nbsp;&nbsp;" + note.data[0].FollowUpParty + "</p>");   
                            }
                        }
                        $("#noteContentDetails").append("<hr>");
                        $("#noteContentDetails").append("<p>" + note.data[0].Note + "</p>");
                        $("#noteContentDetails").append("<br>");
                        $("#noteContentDetails").append(targetButtonCode);
                        // Display the popup
                        $("#noteContentBox").modal('show');
                    },
                    error: function(data) {
                        console.log('Ajax error retrieving note contents.');
                    }
                })
                
            }
        },
        dayClick: function(date, jsEvent, view) {
            // Check if user is admin
            if (UserIsAdmin) {
                // Create a new event defaulting to the clicked date
                window.location.href = `./calendardetails.html?calendarId=new&startDate=${getFormattedDate(convertMomentToDate(date, timezoneOffset))}`; 
            }
        }
    });

    // Filter init function
    function resetFilterSettings(){
        $("#settingsCompany").val("");
        $("#settingsDepartment").val("");
        $("#settingsExternalCompany").val("");
        $("#settingsEmployee").val("");
        $("#chkSettingsBusinessDevelopment").prop("checked", true);
        $("#chkSettingsCorporate").prop("checked", true);
        $("#chkSettingsEventsHolidays").prop("checked", true);
        $("#chkSettingsTrips").prop("checked", true);
        $("#chkSettingsDeals").prop("checked", true);
        $("#chkSettingsNotes").prop("checked", true);
    }

    // Cookie handling functions
    function saveFilterSettings() {
        // Retrieve filter settings
        let includeBusinessDevelopment =  ($("#chkSettingsBusinessDevelopment").is(":checked")) ? 1 : 0;
        let includeCorporate =  ($("#chkSettingsCorporate").is(":checked")) ? 1 : 0;
        let includeEventsHolidays =  ($("#chkSettingsEventsHolidays").is(":checked")) ? 1 : 0;
        let includeTrips = ($("#chkSettingsTrips").is(":checked")) ? 1 : 0;
        let includeDeals = ($("#chkSettingsDeals").is(":checked")) ? 1 : 0;
        let includeNotes = ($("#chkSettingsNotes").is(":checked")) ? 1 : 0;
        let company = $("#settingsCompany").val().join("|");
        let department = $("#settingsDepartment").val().join("|");
        let externalCompany = $("#settingsExternalCompany").val().join("|");
        let addedBy = $("#settingsEmployee").val().join("|");
        // Build cookie content
        let cookieContent = {
            "includeBusinessDevelopment": includeBusinessDevelopment,
            "includeCorporate": includeCorporate,
            "includeEventsHolidays": includeEventsHolidays,
            "includeTrips": includeTrips,
            "includeDeals": includeDeals,
            "includeNotes": includeNotes,
            "company": company,
            "department": department,
            "externalCompany": externalCompany,
            "addedBy": addedBy
        }
        let cookie = ["CalendarFilter", "=", JSON.stringify(cookieContent)].join(""); 
        // Once baked, the cookie will expire in 7 days (60*60*24*7)
        document.cookie = cookie + ";max-age=604800";
    }    

    function retrieveFilterSettings() {
        // Attempt to retrieve the cookie
        let decodedCookie = decodeURIComponent(document.cookie);
        let filterSettings = decodedCookie.split(';');
        // Check if the cookie has contents
        if (filterSettings.length > 0){
            // There is cookie content, traverse through each cookie line to identify the one pertaining to this module
            let cookiePairs;
            for (let item = 0; item < filterSettings.length; item++){
                // Split the line to get it's identifier and contents
                cookiePairs = filterSettings[item].split("=");
                // Check if this is the line we're looking for
                if (cookiePairs.length = 2){
                    if (cookiePairs[0].trim() === "CalendarFilter"){
                        // Found the desired cookie, let's parse it
                        let settings = JSON.parse(cookiePairs[1].trim());
                        // Load the values
                        if (settings.hasOwnProperty("includeBusinessDevelopment")) {
                            $("#chkSettingsBusinessDevelopment").prop("checked", (settings.includeBusinessDevelopment === 1));
                        }
                        if (settings.hasOwnProperty("includeCorporate")) {
                            $("#chkSettingsCorporate").prop("checked", (settings.includeCorporate === 1));
                        }
                        if (settings.hasOwnProperty("includeEventsHolidays")) {
                            $("#chkSettingsEventsHolidays").prop("checked", (settings.includeEventsHolidays === 1));
                        }
                        if (settings.hasOwnProperty("includeTrips")) {
                            $("#chkSettingsTrips").prop("checked", (settings.includeTrips === 1));
                        }
                        if (settings.hasOwnProperty("includeDeals")) {
                            $("#chkSettingsDeals").prop("checked", (settings.includeDeals === 1));
                        }
                        if (settings.hasOwnProperty("includeNotes")) {
                            $("#chkSettingsNotes").prop("checked", (settings.includeNotes === 1));
                        }
                        if (settings.hasOwnProperty("company")) {
                            $("#settingsCompany").val(settings.company.split("|"));
                            $('#settingsCompany').trigger("chosen:updated");
                        }
                        if (settings.hasOwnProperty("department")) {
                            $("#settingsDepartment").val(settings.department.split("|"));
                            $('#settingsDepartment').trigger("chosen:updated");
                        }
                        if (settings.hasOwnProperty("externalCompany")) {
                            $("#settingsExternalCompany").val(settings.externalCompany.split("|"));
                            $('#settingsExternalCompany').trigger("chosen:updated");
                        }
                        if (settings.hasOwnProperty("addedBy")) {
                            $("#settingsEmployee").val(settings.addedBy.split("|"));
                            $('#settingsEmployee').trigger("chosen:updated");
                        }
                    }
                }
            }
        }
        else {
            // No settings saved, init all filters
            resetFilterSettings();
        }
        $('#calendar').fullCalendar('refetchEvents');
    }
    retrieveFilterSettings();

    // Main settings button onClick event
    $("#btnMasterSettings").on("click", function() {
        $("#panelDisplaySettings").toggle("fast");
    });

    // Calendar view settings "Cancel" onClick event
    $("#btnCancelCalendarSettings").on("click", function() {
        // Retrieve whatever previous settings we have
        retrieveFilterSettings();
        // Refresh our events
        $('#calendar').fullCalendar('refetchEvents');
        // Hide the settings panel
        $("#panelDisplaySettings").toggle("fast");
    });

    // Calendar view settings "Apply" onClick event
    $("#btnApplyCalendarSettings").on("click", function() {
        saveFilterSettings();
        $('#calendar').fullCalendar('refetchEvents');
        $("#panelDisplaySettings").toggle("fast");
    });

});