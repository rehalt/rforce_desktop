// Enable ipc functionality, will use it to send / recieve messages between server and renderer processes.
const ipc = require('electron').ipcRenderer;

// Send an IPC message to the main process, so that we receive the user credentials
let credentials = ipc.sendSync('loggedUser', '');
// Get the add new "item" option from RData and clear the data
let noteData = ipc.sendSync('getRdataAddNew');
ipc.sendSync('clearRdataAddNew');
// Assign logged user details
$("#userIsAdmin").text("true");
$("#loggedEmployeeId").text(credentials.id);

// Set logged user name
document.getElementById("loggedUserName").innerHTML = `<span><i class="icon-user icons"></i></span>&nbsp;${credentials.lastName}, ${credentials.firstName}`;

// And yet another IPC message to retrieve the server path
let parentURL = ipc.sendSync('serverPath', '');

// Need to retrieve this from a config parameter
let googleMapsAPIKey = "";

// Retrieve our Google API Key
$.ajax({
    url: `${parentURL}/GoogleAPIKey`,
    username: credentials.user,
    password: credentials.password,
    async: false,
    type: 'GET',
    success: function (data) {
        if (data) {
            // Get API Key from response
            googleMapsAPIKey = data;
        }
    }
});

// Admin user flag was passed through the hidden P tag "userIsAdmin" to handlebars
let UserIsAdmin = ($("#userIsAdmin").text() === 'true');
let UserId = $("#loggedEmployeeId").text();
// Set outlook integration flag
let syncWithOutlook = true;
// Check if href ends with "/", if not save it on a separate var for later use (IISNode requires a / after window.location.href)
let callingURL = window.location.href;
if (callingURL.indexOf("/#") > 0) {
    callingURL = callingURL.slice(0, callingURL.indexOf("/#"));
}

let URLPathSerparator = '';
if (callingURL[callingURL.length - 1] !== "/") {
    URLPathSerparator = '/';
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

function getFormattedTime(inputDate) {
    // this one returns the time in hh:nn:ss format, but only taking hours and minutes into consideration
    let hh = inputDate.getHours();
    let nn = inputDate.getMinutes();
    return formatedTime = [(hh > 9 ? "" : "0") + hh,
    (nn > 9 ? "" : "0") + nn,
        "00"].join(":");
}

function getFormattedTimeAMPM(inputDate) {
    // this one returns the time in hh:nn AM/PM format (just hours and minutes, no seconds)
    let hours = inputDate.getHours() > 12 ? inputDate.getHours() - 12 : inputDate.getHours();
    let am_pm = inputDate.getHours() >= 12 ? "PM" : "AM";
    hours = hours < 10 ? "0" + hours : hours;
    let minutes = inputDate.getMinutes() < 10 ? "0" + inputDate.getMinutes() : inputDate.getMinutes();
    time = hours + ":" + minutes + " " + am_pm;
    return time;
};

function getFormattedDateTime(inputDate) {
    // FullCalendar requires datetime fields in "YYYY-MM-DDThh:nn:ss" format
    let formatedDateTime = getFormattedDate(inputDate) + 'T' + getFormattedTime(inputDate) + 'Z';
    return formatedDateTime;
}

// Get timezone offset
let today = new Date();
let formatedToday = getFormattedDate(today);
let timezoneOffset = today.getTimezoneOffset() * 60000;

// Google place search related stuff
let placesArray = [];
function getGooglePlaceSearch(placeName) {
    // Init places array
    placesArray.length = 0;
    // Call our API to execute the search; if successful we should receive a JSON containing places
    $.ajax({
        async: false,
        type: 'GET',
        url: `${parentURL}/companies/!/GooglePlaceSearch?placeName=${placeName}`,
        username: credentials.user,
        password: credentials.password,
        success: function (data) {
            // Check if the returning array has something
            if (data.length > 0) {
                // Push the places into the array
                data.forEach(function (placeData) {
                    placesArray.push({
                        "placeId": placeData.placeId,
                        "name": placeData.name,
                        "lat": placeData.lat,
                        "long": placeData.long,
                        "address": "",
                        "phoneNumber": "",
                        "website": "",
                        "placeTypes": "",
                        "locality": ""
                    });
                });
            }
        }
    });
}

function getGooglePlaceDetails(placeId) {
    let placeDetails = {};
    // Call our API to execute the search; if successful we should receive an object with details
    $.ajax({
        async: false,
        type: 'GET',
        url: `${parentURL}/companies/!/GooglePlaceDetails?placeId=${placeId}`,
        username: credentials.user,
        password: credentials.password,
        success: function (data) {
            // Check if the returning array has something
            placeDetails = data;
        }
    });
    return placeDetails;
}

// General AJAX functions

async function executeAjaxPost(URL, payload) {
    // This will return either 0 (error) or 1 (success)
    let result = 0;
    let ajaxPostResult = await $.ajax({
        async: true,
        type: 'POST',
        url: URL,
        username: credentials.user,
        password: credentials.password,
        data: payload,
        success: function (data) {
            result = data;
        }
    });
    return result;
}

async function executeAjaxDelete(URL) {
    // This will return either 0 (error) or 1 (success)
    let result = 0;
    let ajaxPostResult = await $.ajax({
        async: true,
        type: 'DELETE',
        url: URL,
        username: credentials.user,
        password: credentials.password,
        success: function (data) {
            result = data;
        }
    });
    return result;
}

// Turn off Dropzone autodiscovery
Dropzone.autoDiscover = false;

// The ever conspicuous document ready function...
$(document).ready(function () {
    // Load company selector
    $.ajax({
        url: `${parentURL}/!/company`,
        username: credentials.user,
        password: credentials.password,
        type: "GET",
        async: false,
        success: function (response) {
            // Traverse through result set
            for (let i = 0; i < response.data.length; i++) {
                $("#detailsCompany").append(new Option(response.data[i].Company, response.data[i].CompanyID));
            }
        },
        error: function (data) {
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
        success: function (response) {
            // Traverse through result set
            for (let i = 0; i < response.data.length; i++) {
                $("#detailsDepartment").append(new Option(response.data[i].Name, response.data[i].DepartmentId));
            }
        },
        error: function (data) {
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
        success: function (response) {
            // Traverse through result set
            for (let i = 0; i < response.data.length; i++) {
                $("#detailsExternalCompany").append(new Option(response.data[i].Name, response.data[i].ExternalCompanyId));
            }
        },
        error: function (data) {
            console.log('Ajax error retrieving external companies.');
        }
    });

    // Load employee selectors
    $.ajax({
        url: `${parentURL}/!/employee`,
        username: credentials.user,
        password: credentials.password,
        type: "GET",
        async: false,
        success: function (response) {
            // Traverse through result set
            for (let i = 0; i < response.data.length; i++) {
                $("#editNoteFollowUpEmployee").append(new Option(response.data[i].LastName + " " + response.data[i].FirstName, response.data[i].EmployeeId));
                $("#editNoteAttendeeEmployee").append(new Option(response.data[i].LastName + " " + response.data[i].FirstName, response.data[i].EmployeeId));
                $("#editAttendeeEmployee").append(new Option(response.data[i].LastName + " " + response.data[i].FirstName, response.data[i].EmployeeId));
                $("#emailNoteRecipients").append(new Option(response.data[i].LastName + " " + response.data[i].FirstName, response.data[i].EmployeeId));
            }
        },
        error: function (data) {
            console.log('Ajax error retrieving employees.');
        }
    });

    // Load contact selectors
    $.ajax({
        url: `${parentURL}/contacts/!/contactList`,
        username: credentials.user,
        password: credentials.password,
        type: "GET",
        async: false,
        success: function (response) {
            // Traverse through result set
            for (let i = 0; i < response.data.length; i++) {
                $("#editNoteAttendeeContact").append(new Option(response.data[i].LastName + " " + response.data[i].FirstName, response.data[i].ContactId));
                $("#editAttendeeContact").append(new Option(response.data[i].LastName + " " + response.data[i].FirstName, response.data[i].ContactId));
            }
        },
        error: function (data) {
            console.log('Ajax error retrieving employees.');
        }
    });

    // Retrieve URL parameters
    let URLParamList = window.location.search.substring(1).split("&");
    // First parameter contains the event id; if value is "new", then we're adding an event
    let URLParamSet = URLParamList[0].split("=");
    $("#detailsCalendarId").val(URLParamSet[1]);

    // init feedback messages
    $("#alertSuccess").hide();
    $("#alertError").hide();
    $("#loading").hide();
    $("#searchSpinnerDiv").hide();
    // Hide edit panels
    $("#panelEventEdit").toggle();
    $("#panelAttendeeListEdit").toggle();
    $("#panelAttendeeEdit").toggle();
    $("#panelNotesEmail").toggle();
    $("#panelNotesEdit").toggle();
    $("#panelGoogleSearch").hide();

    // Enable chosen selectors
    $('#editAttendeeEmployee').chosen({ width: "100%", allow_single_deselect: true });
    $('#editAttendeeContact').chosen({ width: "100%", allow_single_deselect: true });
    $('#emailNoteRecipients').chosen({ width: "100%", allow_single_deselect: true });
    $('#editNoteFollowUpEmployee').chosen({ width: "100%", allow_single_deselect: true });
    $('#editNoteAttendeeEmployee').chosen({ width: "100%", allow_single_deselect: true });
    $('#editNoteAttendeeContact').chosen({ width: "100%", allow_single_deselect: true });

    // test for null values
    function containInfo(testValue) {
        return (testValue === undefined || testValue == null || testValue.length <= 0 || testValue == 0) ? false : true;
    }

    // We can either show the edit panel when adding a new company, or show the details panel 
    // when viewing a preregistered one
    if ($("#detailsCalendarId").val() != "new") {
        // No need to show the "Add me as attendee" checkbox
        $("#divAddMeAsAttendee").hide();
        // Also, update page title
        document.title = "Riverbend - RForce (Event details)";
        // Load company details
        refreshViewMode();
    }
    else {
        // Hide all panels except the one for editing
        $("#panelEventView").toggle();
        $("#panelAttendeeView").toggle();
        $("#panelNotesView").toggle();
        $("#panelEventEdit").toggle();
        // Also, update page title
        document.title = "Riverbend - RForce (New event)";
        // By default we're assuming the event is "All-day"
        $("#detailsAllDay").prop('checked', true);
        $("#detailsEndDateTimeDiv").hide();
        // Use today's date as default date
        if ($("#detailsStartDate").val() === "") {
            let today = new Date();
            $("#detailsStartDate").val(getFormattedDate(today));
        }
    }

    // check if a note is being attached 
    if (noteData && noteData.entityId != 0) {
        // load note data
        $("#entityName").val(noteData.entityName);
        $("#entityId").val(noteData.entityId);
        $("#target").val(noteData.target);
        $("#comment").val(noteData.comment);
        $("#mailId").val(noteData.emailId);
        $("#panelAttachNote").show();
    }

    // clear note data
    $("#removeAttachmentNote").on("click", function () {
        $("#entityName").val("");
        $("#entityId").val("");
        $("#target").val("");
        $("#comment").val("");
        $("#mailId").val("");
        $("#panelAttachNote").hide(1);
        ipc.sendSync('clearRdataAddNew');
    });


    // click event button "edit" switch from View to edit modes.
    $("#editMode").on("click", async function () {
        // Load event details
        let calendarId = $("#detailsCalendarId").val();
        let detailsURL = `${parentURL}/calendar/!/events/${calendarId}`;
        $.ajax({
            url: detailsURL,
            username: credentials.user,
            password: credentials.password,
            type: "GET",
            async: true,
            success: async function (calendar) {
                // Fill the edit fields
                $("#detailsSource").val(calendar.data[0].Source);
                $("#detailsLocationLat").val(calendar.data[0].LocationLat);
                $("#detailsLocationLong").val(calendar.data[0].LocationLong);
                $("#detailsTitle").val(calendar.data[0].Title);
                $("#detailsEventType").val(calendar.data[0].EventCategory);
                $("#detailsCompany").val(calendar.data[0].CompanyId);
                $("#detailsDepartment").val(calendar.data[0].DepartmentId);
                if (calendar.data[0].ExternalCompanyId === "0") {
                    $("#detailsExternalCompany").val("");
                }
                else {
                    $("#detailsExternalCompany").val(calendar.data[0].ExternalCompanyId);
                }
                let aDate = new Date(calendar.data[0].StartDate.toString().substr(0, 4),
                    calendar.data[0].StartDate.toString().substr(5, 2) - 1,
                    calendar.data[0].StartDate.toString().substr(8, 2),
                    calendar.data[0].StartDate.toString().substr(11, 2),
                    calendar.data[0].StartDate.toString().substr(14, 2),
                    0);
                $("#detailsStartDate").val(getFormattedDate(aDate));
                $("#detailsStartTime").timepicker('setTime', getFormattedTime(aDate));
                // Check if it is an all-day event
                if (calendar.data[0].AllDay === 1) {
                    // All-day, hide the end date and time
                    $("#detailsAllDay").prop('checked', true);
                    $("#detailsEndDateTimeDiv").hide();
                }
                else {
                    // Not an all-day event, assign and show the end date/time
                    $("#detailsAllDay").prop('checked', false);
                    $("#detailsEndDateTimeDiv").show();
                    aDate = new Date(calendar.data[0].EndDate.toString().substr(0, 4),
                        calendar.data[0].EndDate.toString().substr(5, 2) - 1,
                        calendar.data[0].EndDate.toString().substr(8, 2),
                        calendar.data[0].EndDate.toString().substr(11, 2),
                        calendar.data[0].EndDate.toString().substr(14, 2),
                        0);
                    $("#detailsEndDate").val(getFormattedDate(aDate));
                    $("#detailsEndTime").timepicker('setTime', getFormattedTime(aDate));
                }
                $("#detailsLocationDetails").val(calendar.data[0].LocationDetails);
                $("#detailsLocationAddress").val(calendar.data[0].LocationAddress);
                $("#detailsLocationPhoneNumber").val(calendar.data[0].LocationPhoneNumber);
            },
            error: function (data) {
                console.log('Ajax error refreshing view mode data after update.');
            }
        })
        // Pass to "edit" mode
        $("#panelEventEdit").toggle("fast");
        $("#panelEventView").toggle("fast");
    });

    // Form validation functions, this one returns the name of missing fields
    function validateEventDetails() {
        // This var will hold the names of missing fields
        let missingFields = "";
        // Check event title
        let value = $("#detailsTitle").val().trim();
        if (value === "") {
            missingFields = missingFields + "Event title\n";
        }
        // Check department
        value = $("#detailsDepartment").val();
        if (value === null) {
            missingFields = missingFields + "Department\n";
        }
        // Check start date
        let startDate = $("#detailsStartDate").val().trim();
        if (startDate === "") {
            missingFields = missingFields + "Start date\n";
        }
        // Check start time
        let startTime = $("#detailsStartTime").val().trim();
        if ((startTime === "") && (!$("#detailsAllDay").is(":checked"))) {
            missingFields = missingFields + "Start time\n";
        }
        // If this is not an "all-day" event, we'll need an end date/time
        if (!$("#detailsAllDay").is(":checked")) {
            // Check end date
            let endDate = $("#detailsEndDate").val().trim();
            if (endDate === "") {
                missingFields = missingFields + "End date\n";
            }
            // Check end time
            let endTime = $("#detailsEndTime").val().trim();
            if (endTime === "") {
                missingFields = missingFields + "End time\n";
            }
            // If both start and end date/times are available, we need to check that the end date/time is lated than the start date/time
            if ((startDate != "") && (startTime != "") && (endDate != "") && (endTime != "")) {
                let startDateTime = new Date(startDate + " " + startTime);
                let endDateTime = new Date(endDate + " " + endTime);
                if (endDateTime <= startDateTime) {
                    missingFields = missingFields + "End date/time must be greater than start date/time\n";
                }

            }
        }

        // return whatever is missing
        return missingFields.trim();
    }

    // When clicking "All day" checkbox, end date/time get's hidden
    $("#detailsAllDay").on("change", function () {
        if ($(this).is(":checked")) {
            // Hide the "end date" section
            $("#detailsEndDateTimeDiv").hide();
        }
        else {
            if ($("#detailsEndDate").val() === "") {
                // No end date time set, lets default it to an hour later
                let startDate = $("#detailsStartDate").val().trim();
                let startTime = $("#detailsStartTime").val().trim();
                let startDateTime = new Date(startDate + " " + startTime);
                startDateTime.setTime(startDateTime.getTime() + (60 * 60 * 1000));
                $("#detailsEndDate").val(getFormattedDate(startDateTime));
                $("#detailsEndTime").timepicker('setTime', getFormattedTime(startDateTime));
            }
            $("#detailsEndDateTimeDiv").show();
        }
    });

    $("#detailsEventType").on('change', function () {
        if ($("#detailsEventType").val() === "4") {
            window.location.href = "./tripdetails.html?tripId=new";
        };
    });

    $("#detailsStartTime").timepicker({
        minuteStep: 1,
        defaultTime: "12:00 PM",
        showMeridian: true
    });

    $("#detailsEndTime").timepicker({
        minuteStep: 1,
        defaultTime: false,
        defaultTime: "12:00 PM",
        showMeridian: true
    });


    // Edit event submit and cancel OnClick functions
    $("#eventDetailsSubmit").on("click", async function () {
        // Validate that required fields are complete
        let validationResult = validateEventDetails();
        if (validationResult === "") {
            // Data is valid
            let calendarId = $("#detailsCalendarId").val();
            if (calendarId === "new") {
                calendarId = "0";
            }
            let timeSegment = $("#detailsStartTime").val().trim();
            if (timeSegment === "") {
                timeSegment = "00:00";
            }
            let startDateTime = new Date($("#detailsStartDate").val().trim() + " " + timeSegment);
            let paramStartDateTime = getFormattedDateTime(startDateTime);
            let paramEndDateTime = "";
            let allDayEvent = "0";
            if ($("#detailsAllDay").is(":checked")) {
                allDayEvent = "1";
            }
            if (allDayEvent === "0") {
                let endDateTime = new Date($("#detailsEndDate").val().trim() + " " + $("#detailsEndTime").val().trim());
                paramEndDateTime = getFormattedDateTime(endDateTime);
            }
            let externalCompanyId = $("#detailsExternalCompany").val();
            if ((externalCompanyId === "") || (externalCompanyId === null)) {
                externalCompanyId = "0";
            }

            let entityName = $("#entityName").val();
            let entityId = $("#entityId").val();
            let target = $("#target").val();
            let comment = $("#comment").val();
            let mailId = $("#mailId").val();

            // Assemble the request URL
            let saveURL = parentURL +
                "/calendar/!/events/" +
                calendarId +
                "?companyId=" + $("#detailsCompany").val() +
                "&departmentId=" + $("#detailsDepartment").val() +
                "&externalCompanyId=" + externalCompanyId +
                "&title=" + escape($("#detailsTitle").val().trim()) +
                "&source=1" +
                "&startDateTime=" + paramStartDateTime +
                "&endDateTime=" + paramEndDateTime +
                "&allDay=" + allDayEvent +
                "&eventCategory=" + $("#detailsEventType").val() +
                "&locationDetails=" + escape($("#detailsLocationDetails").val().trim()) +
                "&locationLat=" + $("#detailsLocationLat").val() +
                "&locationLong=" + $("#detailsLocationLong").val() +
                "&locationAddress=" + escape($("#detailsLocationAddress").val().trim()) +
                "&locationPhoneNumber=" + escape($("#detailsLocationPhoneNumber").val().trim()) +
                "&senderId=" + UserId +
                "&entityName=" + entityName +
                "&entityId=" + entityId +
                "&target=" + target +
                "&comment=" + comment +
                "&mailId=" + mailId;
            // Save the event
            let result = await executeAjaxPost(saveURL, {});
            let newCalendarId = result[0].Id;
            // Check if this was a new event
            if (calendarId === "0") {
                // Check if we're adding the event creator as an attendee
                if ($("#detailsAddMeAsAttendee").is(":checked")) {
                    // Add the logged in user to the attendees list
                    saveURL = parentURL +
                        "/calendar/!/events/" +
                        newCalendarId +
                        "/attendees" +
                        "?attendeeId=" + UserId +
                        "&attendeeType=1" +
                        "&optional=0" +
                        "&confirmed=1" +
                        "&attended=0";
                    // Save the event
                    let result = await executeAjaxPost(saveURL, {});
                }
                // Sync the event with outlook
                if (syncWithOutlook) {
                    await outlookUpdate(newCalendarId);
                }
                // It is a new event, lets reload the page
                window.location.href = `./calendardetails.html?calendarId=${newCalendarId}`;
            }
            else {
                if (syncWithOutlook) {
                    // Sync the event with outlook
                    await outlookUpdate(newCalendarId);
                }
                // Hides the edit panel
                $("#panelEventEdit").toggle("fast");
                $("#panelEventView").toggle("fast");
                // Reload the EventView
                await refreshViewMode();
                googleMapsInitialize();
            }
        }
        else {
            // Failed validation
            alert("Some fields failed to pass validation:\n\n" +
                validationResult);
        }
    });

    // Edit event submit and cancel OnClick functions
    $("#eventDetailsCancel").on("click", async function () {
        // Check if we're adding or editing
        if ($("#detailsCalendarId").val() != "new") {
            // Viewing a previously registered event, just toggle the panels
            $("#panelEventEdit").toggle("fast");
            $("#panelEventView").toggle("fast");
            // Reload the EventView
            await refreshViewMode();
            googleMapsInitialize();
        }
        else {
            // Adding a new one, go back to calendar main page
            window.location.href = "./calendar.html";
        }
    });

    // Event delete
    $("#eventDetailsDelete").on("click", async function () {
        // We'll need this var to delete the event
        let calendarId = $("#detailsCalendarId").val();
        // Delete the evemt 
        let deleteURL = `${parentURL}/calendar/!/events/${calendarId}`;
        result = await executeAjaxDelete(deleteURL);
        if (syncWithOutlook) {
            // Retrieve a list of synced attendees, need to delete the event from their calendar
            let syncListURL = `${parentURL}/calendar/!/events/${calendarId}/attendeeSyncList`;
            $.ajax({
                url: syncListURL,
                username: credentials.user,
                password: credentials.password,
                type: "GET",
                async: false,
                success: async function (syncList) {
                    let emptyObject = ($.isEmptyObject(syncList));
                    if (!emptyObject) {
                        // Traverse through the attendee list
                        syncList.data.forEach(async function (attendee) {
                            // Check if he has a SyncId
                            if (attendee.SyncID !== null) {
                                // Attempt to delete the entry from his calendar
                                await outlookDelete(attendee.CalendarId, attendee.AttendeeId);
                            }
                        });
                    }
                },
                error: function (data) {
                    console.log('Ajax error retrieving event outlook sync list.');
                }
            });
        }
        // Go back to calendar main page
        window.location.href = "./calendar.html";
    });

    // These functions refresh the calendar entry details viewer
    async function refreshViewMode() {
        let calendarId = $("#detailsCalendarId").val();
        let aUrl = `${parentURL}/calendar/!/events/${calendarId}`;
        $.ajax({
            url: aUrl,
            username: credentials.user,
            password: credentials.password,
            type: "GET",
            async: true,
            success: function (calendar) {
                // Update view mode panel
                addFieldViewMode("Title: &nbsp;", unescape(calendar.data[0].Title), "col-sm-12", true); // First one clears the view panel
                addFieldViewMode("Type: &nbsp;", calendar.data[0].EventCategoryDescription, "col-sm-12", false);
                addFieldViewMode("Company: &nbsp;", calendar.data[0].CompanyName, "col-sm-12", false);
                addFieldViewMode("Department: &nbsp;", calendar.data[0].DepartmentName, "col-sm-12", false);
                if (calendar.data[0].ExternalCompanyId != 0) {
                    addFieldViewMode("External company: &nbsp;", '<a href="/companies/' + calendar.data[0].ExternalCompanyId + '">' + calendar.data[0].ExternalCompanyName + '</a>', "col-sm-12", false);
                }
                if (calendar.data[0].AllDay === 1) {
                    let formattedDate = formatDateTimeYYYYMMDDHHNN(calendar.data[0].StartDate);
                    // If the event didn't have a start time, the app defaulted it to "00:00" hrs; do not render the start time
                    if (formattedDate.substr(11, 5) === "00:00") {
                        addFieldViewMode("Start date: &nbsp;", formattedDate.substr(0, 10) + " (all day)", "col-sm-12", false);
                    }
                    else {
                        addFieldViewMode("Start date: &nbsp;", formattedDate + " (all day)", "col-sm-12", false);
                    }
                }
                else {
                    addFieldViewMode("Start date: &nbsp;", formatDateTimeYYYYMMDDHHNN(calendar.data[0].StartDate), "col-sm-12", false);
                    addFieldViewMode("End date: &nbsp;", formatDateTimeYYYYMMDDHHNN(calendar.data[0].EndDate), "col-sm-12", false);
                }
                addFieldViewMode("Location: &nbsp;", unescape(calendar.data[0].LocationDetails), "col-sm-12", false);
                addFieldViewMode("Address: &nbsp;", unescape(calendar.data[0].LocationAddress), "col-sm-12", false);
                addFieldViewMode("Phone number: &nbsp;", unescape(calendar.data[0].LocationPhoneNumber), "col-sm-12", false);
                addFieldViewMode("Created: &nbsp;", formatDateTimeYYYYMMDDHHNN(calendar.data[0].WhenCreated) + " <strong>by</strong> " + calendar.data[0].WhoCreatedName, "col-sm-12", false);
                if (calendar.data[0].WhoChanged != '') {
                    addFieldViewMode("Updated: &nbsp;", formatDateTimeYYYYMMDDHHNN(calendar.data[0].WhenChanged) + " <strong>by</strong> " + calendar.data[0].WhoChangedName, "col-sm-12", false);
                }
                // Also reload the initial coordinates
                $("#detailsLocationLat").val(calendar.data[0].LocationLat);
                $("#detailsLocationLong").val(calendar.data[0].LocationLong);
                googleMapsInitialize();
            },
            error: function (data) {
                console.log('Ajax error refreshing view mode data after update.');
            }
        })
    }

    function formatDateTimeYYYYMMDDHHNN(date) {
        // this function formats the date in YYYY-MM-DD HH:NN AMPM format (no seconds)
        let inputDate = new Date(date);
        let adjustedDate = new Date(inputDate.getTime() + timezoneOffset);
        return getFormattedDate(adjustedDate) + ' ' +
            getFormattedTimeAMPM(adjustedDate);
    }

    function addFieldViewMode(fieldDescription, fieldValue, divClass, initContainer) {
        const fieldTemplate = '<div class="' + divClass + '"> <div class="form-group"><strong>[fieldDescription] </strong><em>[fieldValue]</em></div></div>';
        let viewModeContainer = $("#viewModeContainer");
        if (initContainer) {
            viewModeContainer.empty();
        }
        if (containInfo(fieldValue)) {
            viewModeContainer.append(fieldTemplate.replace('[fieldDescription]', fieldDescription).replace('[fieldValue]', fieldValue));
        }
    }

    // Attendees datatable
    let attendeesAjaxURL = parentURL +
        "/calendar/!/events/";
    if ($("#detailsCalendarId").val() != "new") {
        attendeesAjaxURL = attendeesAjaxURL + $("#detailsCalendarId").val() + "/attendees";
    }
    else {
        attendeesAjaxURL = attendeesAjaxURL + "0/attendees";
    }

    $('#tblAttendees').DataTable({
        dom: "frtip",
        ajax: attendeesAjaxURL,
        paging: false,
        info: false,
        searching: true,
        scrollX: false,
        scrollY: "200px",
        scrollCollapse: true,
        ordering: false,
        processing: true,
        language: {
            processing: '<div style="display:block;text-align:center"><img title="loading" src="../s/img/ajax-loading.gif"></div>',
            emptyTable: "There are no entries"
        },
        "columns": [
            {
                "data": "AttendeeType",
                "className": "never text-nowrap",
            },
            {
                "data": "Name",
                "className": "text-nowrap attendee-data"
            },
            {
                "data": "CompanyName",
                "className": "text-nowrap attendee-data",
            },
            {
                "data": "Optional",
                "className": "text-nowrap attendee-data dt-center",
            },
            {
                "data": "Confirmed",
                "className": "text-nowrap attendee-data dt-center",
            },
            {
                "data": "Attended",
                "className": "text-nowrap attendee-data dt-center",
            }
        ],
        "columnDefs": [
            {
                "targets": [0],
                "visible": true,
                "searchable": true,
                "render": function (data, type, row) {
                    let result = ""
                    if (row.AttendeeType === 2) {
                        result = '<span class="fa fa-address-book-o"></span>'
                    }
                    return result;
                }
            },
            {
                "targets": [1],
                "data": "FirstName",
                "className": "text-nowrap attendee-data",
                "render": function (data, type, row) {
                    let result = row.LastName + ", " + row.FirstName;
                    if (row.AttendeeType === 2) {
                        // Contact, make this a link
                        result = '<a href="/contacts/' + row.AttendeeId + '">' + row.LastName + ', ' + row.FirstName + '</a>';
                    }
                    return result;
                }
            },
            {
                "targets": [2],
                "visible": true,
                "searchable": true,
                "render": function (data, type, row) {
                    let result = "";
                    if (row.CompanyId > 0) {
                        result = '<a href="./companydetails.html?companyId=' + row.CompanyId + '">' + row.CompanyName + '</a>'
                    }
                    else if (row.AttendeeType === 1) {
                        if (row.email != "") {
                            result = '<div class="row"><a href="mailto:' + row.email + '">' + row.email + '</a></div>';
                        }
                        if (row.PhoneNumber != "") {
                            result = result + '<div class="row">' + row.PhoneNumber + '</div>';
                        }
                    }
                    return result;
                }
            },
            {
                "targets": [3],
                "visible": true,
                "searchable": false,
                "mRender": function (data, type, full) {
                    let result = ""
                    if (data === 1) {
                        result = '<span class="fa fa-check"></span>'
                    }
                    return result;
                }
            },
            {
                "targets": [4],
                "visible": true,
                "searchable": false,
                "mRender": function (data, type, full) {
                    let result = ""
                    if (data === 1) {
                        result = '<span class="fa fa-check"></span>'
                    }
                    return result;
                }
            },
            {
                "targets": [5],
                "visible": true,
                "searchable": false,
                "mRender": function (data, type, full) {
                    let result = ""
                    if (data === 1) {
                        result = '<span class="fa fa-check"></span>'
                    }
                    return result;
                }
            }
        ]
    });

    // Clicking on the notes table will toggle the edit note panel
    $('#tblAttendees tbody').on('click', '.attendee-data', function () {
        // Check if logged user is admin; otherwise just ignore him
        if (UserIsAdmin) {
            // Get the row's data
            let data = $("#tblAttendees").DataTable().row(this).data();
            // Prep up the edit panel
            $('#editAttendeeName').val(data.LastName + ", " + data.FirstName + " (" + data.AttendeeTypeDesc + ")");
            $('#editAttendeeId').val(data.AttendeeId);
            $('#editAttendeeTypeId').val(data.AttendeeType);
            $('#editAttendeeType').val(data.AttendeeType);
            $("#editAttendeeOptional").prop("checked", (data.Optional === 1));
            $("#editAttendeeConfirmed").prop("checked", (data.Confirmed === 1));
            $("#editAttendeeAttended").prop("checked", (data.Attended === 1));
            // Toggle view/edit panels
            $("#panelAttendeeView").toggle("fast");
            $("#panelAttendeeEdit").toggle("fast");
        }
    });


    // Attendee related functions
    $("#btnAddAttendee").on("click", async function () {
        // Grab the event Id
        let calendarId = $("#detailsCalendarId").val();
        // Init the employee and contact selectors
        $("#editAttendeeEmployee").val("");
        $("#editAttendeeContact").val("");
        // Load the attendee list
        let attendeeListURL = `${parentURL}/calendar/!/events/${calendarId}/attendees`;
        $.ajax({
            url: attendeeListURL,
            username: credentials.user,
            password: credentials.password,
            type: "GET",
            async: false,
            success: async function (attendeeList) {
                let emptyObject = ($.isEmptyObject(attendeeList.data));
                if (!emptyObject) {
                    // These arrays will hold the employees and contacts
                    let employeeList = [];
                    let contactList = [];
                    // Traverse through the attendee list
                    attendeeList.data.forEach(async function (attendee) {
                        // Check if it is an employee or a contact
                        if (attendee.AttendeeType === 1) {
                            // Employee
                            employeeList.push(attendee.AttendeeId.toString());
                        }
                        else {
                            // Contact
                            contactList.push(attendee.AttendeeId.toString());
                        }
                    });
                    // set the selected options
                    $("#editAttendeeEmployee").val(employeeList);
                    $("#editAttendeeContact").val(contactList);
                    // Need to call this so that chosen selector gets refreshed
                    $('#editAttendeeEmployee').trigger("chosen:updated");
                    $('#editAttendeeContact').trigger("chosen:updated");
                }
            },
            error: function (data) {
                console.log('Ajax error retrieving contact list.');
            }
        });
        // Toggle view/edit panels
        $("#panelAttendeeView").toggle("fast");
        $("#panelAttendeeListEdit").toggle("fast");
    });

    $("#btnAttendeeListSubmit").on("click", async function () {
        // Retrieve the event id
        let calendarId = $("#detailsCalendarId").val();
        // Retrieve the selected employee and contact lists
        let employees = $("#editAttendeeEmployee").val();
        let contacts = $("#editAttendeeContact").val();
        // Then create the string list
        let employeeList = "";
        if (employees.length > 0) {
            employeeList = employees.join(",");
        }
        let contactList = "";
        if (contacts.length > 0) {
            contactList = contacts.join(",");
        }
        // Let's now retrieve the update list, by calling a stored procedure that
        // identifies what has changed (added entries, removed entries)
        let updateListURL = `${parentURL}/calendar/!/events/${calendarId}/attendeeUpdateList?employeeList=${employeeList}&contactList=${contactList}`;
        $.ajax({
            url: updateListURL,
            username: credentials.user,
            password: credentials.password,
            type: "GET",
            async: false,
            success: async function (updateList) {
                let emptyList = ($.isEmptyObject(updateList.data));
                if (!emptyList) {
                    // Traverse through the update list
                    let result;
                    let URL;
                    let updateOutlook = false;
                    for (let i = 0; i < updateList.data.length; i++) {
                        // Check if we're adding or deleting
                        if (updateList.data[i].Action == "I") {
                            // Add a new attendee
                            URL = parentURL +
                                "/calendar/!/events/" +
                                calendarId +
                                "/attendees?" +
                                "attendeeId=" + updateList.data[i].AttendeeId +
                                "&attendeeType=" + updateList.data[i].AttendeeType +
                                "&optional=0" +
                                "&confirmed=0" +
                                "&attended=0";
                            result = executeAjaxPost(URL, {});
                            if (updateList.data[i].AttendeeType == 1) {
                                // At least one employee got added, let's raise this flag to indicate that
                                // outlook needs to be synced once we're done here
                                updateOutlook = true;
                            }
                        }
                        else {
                            // Check if the attendee had a SyncID and outlook syncing is enabled
                            if ((updateList.data[i].SyncID !== null) && (syncWithOutlook)) {
                                // Delete the calendar entry on outlook
                                await outlookDelete(calendarId, updateList.data[i].AttendeeId);
                            }
                            // Remove attendee
                            URL = parentURL +
                                "/calendar/!/events/" +
                                calendarId +
                                "/attendees?" +
                                "attendeeId=" + updateList.data[i].AttendeeId +
                                "&attendeeType=" + updateList.data[i].AttendeeType +
                                "&optional=0" +
                                "&confirmed=0" +
                                "&attended=0";
                            result = executeAjaxDelete(URL);
                        }
                    };
                    // Check if outlook needs to be updated
                    if ((updateOutlook) && (syncWithOutlook)) {
                        await outlookUpdate(calendarId);
                    }
                }
                // Done here, swap panels
                $("#panelAttendeeListEdit").toggle("fast");
                $("#panelAttendeeView").toggle("fast", function () {
                    $('#tblAttendees').DataTable().ajax.reload();
                });
            },
            error: function (data) {
                console.log('Ajax error retrieving update list.');
            }
        });
    });

    $("#btnAttendeeListCancel").on("click", async function () {
        // Toggle view/list edit panels
        $("#panelAttendeeListEdit").toggle("fast");
        $("#panelAttendeeView").toggle("fast", function () {
            $('#tblAttendees').DataTable().ajax.reload();
        });
    });

    $("#selectAllEmployees").on("click", function () {
        $('#editAttendeeEmployee option').prop('selected', true);
        $('#editAttendeeEmployee').trigger("chosen:updated");
    });




    $("#btnAttendeeSubmit").on("click", async function () {
        // Retrieve the event id
        let calendarId = $("#detailsCalendarId").val();
        // Retrieve the attendee details
        let attendeeId = $("#editAttendeeId").val();
        let attendeeType = $("#editAttendeeTypeId").val();
        let optional = ($("#editAttendeeOptional").is(":checked") ? 1 : 0);
        let confirmed = ($("#editAttendeeConfirmed").is(":checked") ? 1 : 0);
        let attended = ($("#editAttendeeAttended").is(":checked") ? 1 : 0);
        let saveURL = parentURL +
            "/calendar/!/events/" +
            calendarId +
            "/attendees?" +
            "attendeeId=" + attendeeId +
            "&attendeeType=" + attendeeType +
            "&optional=" + optional +
            "&confirmed=" + confirmed +
            "&attended=" + attended;
        result = executeAjaxPost(saveURL, {});
        // Done here, swap panels
        $("#panelAttendeeEdit").toggle("fast");
        $("#panelAttendeeView").toggle("fast", function () {
            $('#tblAttendees').DataTable().ajax.reload();
        });
    });

    $("#btnAttendeeCancel").on("click", async function () {
        // Toggle view/edit panels
        $("#panelAttendeeEdit").toggle("fast");
        $("#panelAttendeeView").toggle("fast", function () {
            $('#tblAttendees').DataTable().ajax.reload();
        });
    });

    /******* Notes  *******/

    // This will create a random 10 char string, we'll use this later on to identify
    // attachments for new notes (will be passed to the server via a form param)
    function makeid() {
        let text = "";
        let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < 10; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        return text;
    }

    // This will hold the name of file attached to the note
    let noteAttachments = [];

    let notesAjaxURL = parentURL +
        "/notes/!/note?noteId=0&source=301&sourceId=";
    if ($("#detailsCalendarId").val() != "new") {
        notesAjaxURL = notesAjaxURL + $("#detailsCalendarId").val();
    }
    else {
        notesAjaxURL = notesAjaxURL + "0";
    }

    // Enable rich text editor
    $('#editNoteText').jqte();

    /* Notes datatable */

    $('#tblNotes').DataTable({
        dom: "frtip",
        ajax: notesAjaxURL,
        paging: true,
        pageLength: 5,
        info: false,
        searching: true,
        scrollX: false,
        scrollY: "200px",
        scrollCollapse: true,
        ordering: false,
        processing: true,
        language: {
            processing: '<div style="display:block;text-align:center"><img title="loading" src="../s/img/ajax-loading.gif"></div>',
            emptyTable: "There are no entries"
        },
        columns: [
            {
                data: "NoteId",
                className: "never text-nowrap",
            },
            {
                data: "WhenCreated",
                className: "text-nowrap note-data dt-align-top",
                mRender: function (data, type, row) {
                    let mDate = new Date(data);
                    return getFormattedDate(mDate);
                }
            },
            {
                data: "Source",
                className: "never text-nowrap"
            },
            {
                className: "text-wrap note-data dt-align-top",
                data: "Source",
                mRender: function (data, type, row) {
                    let result;
                    switch (data) {
                        case 301:
                            return "Calendar";
                    }
                }
            },
            {
                data: "Note",
                className: "text-wrap note-data",
                mRender: function (data, type, row) {
                    if (data) {
                        // Init response
                        let response = "";
                        // Check if note has attachments (they come as a pipe separated string)
                        if (row.attachments != "") {
                            let attachments = row.attachments.split("|");
                            if (attachments.length > 0) {
                                // Note does have attachments
                                response = '<div class="row"><strong>Attachments</strong></div>';
                                for (let item = 0; item < attachments.length; item++) {
                                    response = response +
                                        `<div class="row"><span class="fa fa-paperclip"></span>&nbsp;<a href="${parentURL}/s/notes/attachments/${row.NoteId}/${attachments[item]}" target="_blank">${attachments[item]}</a></div>`;
                                }
                                response = response +
                                    '<div class="row"><hr></div></hr><div class="row"><strong>Contents</strong></div>';
                            }
                        }
                        response = response +
                            '<div class="row">' +
                            data.split(String.fromCharCode(10)).join("<br/>") +
                            '</div>';
                        return response;
                    }
                }
            },
            {
                data: "FollowUp",
                className: "text-nowrap note-data dt-align-top",
                mRender: function (data, type, full) {
                    if (data) {
                        let followDate = new Date(data);
                        followDate = new Date(followDate.getTime() + timezoneOffset);
                        return getFormattedDate(followDate);
                    }
                    else {
                        return "";
                    }
                }
            },
            {
                data: "NoteId",
                className: "never text-nowrap dt-center dt-align-top note-email",
                mRender: function (data, type, row) {
                    return '<span class="fa fa-envelope-o"></span>';
                }
            },
        ],
        columnDefs: [
            {
                targets: [0],
                visible: false,
                searchable: false
            },
            {
                targets: [1],
                visible: true,
                searchable: false
            },
            {
                targets: [2],
                visible: false,
                searchable: false
            },
            {
                targets: [3],
                visible: true,
                searchable: true
            },
            {
                targets: [4],
                visible: true,
                searchable: true,
                width: "50%"
            },
            {
                targets: [5],
                visible: true,
                searchable: false
            },
            {
                targets: [6],
                visible: true,
                searchable: false
            }
        ]
    });

    // Clicking on the notes "note-data" columns will toggle the edit note panel
    $('#tblNotes tbody').on('click', '.note-data', function () {
        // Check if logged user is admin; otherwise just ignore him
        if (UserIsAdmin) {
            // Get the row's data
            let data = $("#tblNotes").DataTable().row(this).data();
            // Check the note source, then fill the note type accordingly
            let noteTypeSelector = $("#editNoteType");
            noteTypeSelector.empty();
            if ((data.Source >= 100) & (data.Source <= 199)) {
                // External companies module
                noteTypeSelector.append('<option value="101">General notes</option>');
                noteTypeSelector.append('<option value="102">Meeting notes</option>');
            }
            else if (data.Source === 301) {
                // External companies module
                noteTypeSelector.append('<option value="301">Calendar</option>');
            }
            else if (data.Source === 402) {
                // External companies module
                noteTypeSelector.append('<option value="402">Trip activity</option>');
            }
            // Prep up the edit panel
            $('#editNoteId').val(data.NoteId);
            $('#editNoteSourceId').val(data.SourceId);
            $("#AttachmentNoteId").val(data.NoteId);
            $("#AttachmentNoteTempPath").val("");
            $('#editNoteType').val(data.Source);
            //$('#editNoteText').jqteVal(data.Note);
            $("#editNoteFollowUpType").val(data.FollowUpType);
            if (data.FollowUpType === 0) {
                // Hide Follow up section
                $("#editNoteFollowUpDetailsDiv").hide();
            }
            else {
                // Show Follow up section
                $("#editNoteFollowUpDetailsDiv").show();
            }
            if (data.FollowUp) {
                let followDate = new Date(data.FollowUp);
                followDate = new Date(followDate.getTime() + timezoneOffset);
                $('#editNoteFollowUp').val(getFormattedDate(followDate));
            }
            else {
                $('#editNoteFollowUp').val("");
            }
            // Retrieve note details (need to display who created and changed the note)
            $("#editNoteWhoChanged").val("");
            $("#editNoteWhoCreated").val("");
            $.ajax({
                url: `${parentURL}/notes/!/noteDetails?noteId=${data.NoteId}`,
                username: credentials.user,
                password: credentials.password,
                type: "GET",
                async: false,
                success: function (noteDetails) {
                    $('#editNoteText').jqteVal(noteDetails.data[0].Note);
                    $("#editNoteWhoCreated").val(noteDetails.data[0].WhoCreatedName + " on " + noteDetails.data[0].WhenCreated.substr(0, 10) + " " + noteDetails.data[0].WhenCreated.substr(11, 8));
                    if (noteDetails.data[0].WhoChangedName !== null) {
                        $("#editNoteWhoChanged").val(noteDetails.data[0].WhoChangedName + " on " + noteDetails.data[0].WhenChanged.substr(0, 10) + " " + noteDetails.data[0].WhenChanged.substr(11, 8));
                    }
                }
            });
            // Retrieve linked employees / contacts
            $.ajax({
                url: `${parentURL}/notes/!/note/${data.NoteId}/attendees`,
                username: credentials.user,
                password: credentials.password,
                type: "GET",
                async: false,
                success: function (attendees) {
                    let emptyObject = ($.isEmptyObject(attendees.data));
                    if (!emptyObject) {
                        // Init employee and contact arrays
                        let linkedEmployees = [];
                        let linkedContacts = [];
                        // There is a list of attendees, traverse through it
                        for (let item = 0; item < attendees.data.length; item++) {
                            if (attendees.data[item].AttendeeType === 1) {
                                linkedEmployees.push(attendees.data[item].AttendeeId.toString());
                            }
                            else {
                                linkedContacts.push(attendees.data[item].AttendeeId.toString());
                            }
                        }
                        // Update chosen selectors
                        $("#editNoteAttendeeEmployee").val(linkedEmployees);
                        $("#editNoteAttendeeContact").val(linkedContacts);
                    }
                    else {
                        // No attendees registered, clear the containers
                        $("#editNoteAttendeeEmployee").val("");
                        $("#editNoteAttendeeContact").val("");
                    }
                    // Need to call this so that chosen selectors gets refreshed
                    $('#editNoteAttendeeEmployee').trigger("chosen:updated");
                    $('#editNoteAttendeeContact').trigger("chosen:updated");
                }
            });
            // Retrieve follow up party
            $.ajax({
                url: `${parentURL}/notes/!/note/${data.NoteId}/followUpParty`,
                username: credentials.user,
                password: credentials.password,
                type: "GET",
                async: false,
                success: function (employees) {
                    let emptyObject = ($.isEmptyObject(employees.data));
                    if (!emptyObject) {
                        // Init employee and contact arrays
                        let followUpList = [];
                        // There is a list of employees, traverse through it
                        for (let item = 0; item < employees.data.length; item++) {
                            followUpList.push(employees.data[item].AttendeeId.toString());
                        }
                        // Update chosen selector
                        $("#editNoteFollowUpEmployee").val(followUpList);
                    }
                    else {
                        // No follow up party registered, clear the container
                        $("#editNoteFollowUpEmployee").val("");
                    }
                    // Need to call this so that chosen selector gets refreshed
                    $('#editNoteFollowUpEmployee').trigger("chosen:updated");
                }
            });
            // Retrieve attached files
            loadNoteAttachments(data.NoteId);
            // Check if this note has attached voice notes
            $.ajax({
                url: `${parentURL}/notes/!/voicenote/list/${data.NoteId}`,
                username: credentials.user,
                password: credentials.password,
                type: "GET",
                async: false,
                success: function (voiceNoteList) {
                    if (!(voiceNoteList.data === {})) {
                        // There is a list of voice notes, traverse through it
                        for (let item = 0; item < voiceNoteList.data.length; item++) {
                            // Retrieve the voice note content
                            $.ajax({
                                url: `${parentURL}/notes/!/voicenote/${voiceNoteList.data[item].VoiceNoteId}`,
                                username: credentials.user,
                                password: credentials.password,
                                type: "GET",
                                async: false,
                                success: function (voiceNote) {
                                    if (!(voiceNote.data === {})) {
                                        // Got the voice note, push it into the voice notes array
                                        pushVoiceNoteArray(voiceNoteList.data[item].VoiceNoteId, voiceNote.data[0].VoiceContent, voiceNoteList.data[item].WhenCreated);
                                        // Now let's add the link
                                        createVoiceNoteLink(voiceNotes.length - 1, "#voiceNoteList");
                                    }
                                }
                            });
                        }
                    }
                }
            });
            // Toggle the panels
            $("#calendarView").toggle("fast");
            $("#panelNotesEdit").toggle("fast");
        }
    });

    // Send note by email functionality

    $('#tblNotes tbody').on('click', '.note-email', function () {
        // Get the row's data
        let data = $("#tblNotes").DataTable().row(this).data();
        $("#emailNoteId").val(data.NoteId);
        // Retrieve linked employees / contacts
        $.ajax({
            url: `${parentURL}/notes/!/note/${data.NoteId}/attendees`,
            username: credentials.user,
            password: credentials.password,
            type: "GET",
            async: false,
            success: function (attendees) {
                let emptyObject = ($.isEmptyObject(attendees.data));
                if (!emptyObject) {
                    // Init the linked employee array
                    let linkedEmployees = [];
                    // There is a list of attendees, traverse through it
                    for (let item = 0; item < attendees.data.length; item++) {
                        if (attendees.data[item].AttendeeType === 1) {
                            linkedEmployees.push(attendees.data[item].AttendeeId.toString());
                        }
                    }
                    // Update chosen selectors
                    $("#emailNoteRecipients").val(linkedEmployees);
                    // Need to call this so that chosen selectors gets refreshed
                    $('#emailNoteRecipients').trigger("chosen:updated");
                }
            }
        });
        // Toggle the email send panel
        $("#panelNotesView").toggle("fast");
        $("#panelNotesEmail").toggle("fast");
    });

    $("#btnNoteEmailSend").on("click", function () {
        // Check if there are recipients selected
        let recipientList = $("#emailNoteRecipients").val().join(",");
        if (recipientList !== "") {
            // Got the recipient list, let's send the email
            let sendEmailURL = `${parentURL}/notes/!/note/${$("#emailNoteId").val()}/sendEmail?recipients=${recipientList}`;
            let result = executeAjaxPost(sendEmailURL, {});
            // Done here...
            alert("Email has been sent.")
            // Toggle panels
            $("#panelNotesEmail").toggle("fast", () => { $("#panelNotesView").toggle("fast"); });
        }
        else {
            alert("Please select the email recipients.")
        }
    });

    $("#btnNoteEmailCancel").on("click", function () {
        // Cancel, toggle the panels without doing anything
        $("#panelNotesEmail").toggle("fast", () => { $("#panelNotesView").toggle("fast"); });
    });

    // Click event for "New note" button
    $("#btnAddNote").on("click", function () {
        // Init the note fields
        $("#editNoteId").val("0"); // New note id
        $("#editNoteSourceId").val($("#detailsCompanyId").val()); // Note source is the external company Id
        $('#editNoteText').jqteVal("");
        $("#editNoteFollowUpType").val("0"); // Default to "None"
        $("#editNoteFollowUp").val("");
        // Clear chosen selectors
        $("#editNoteFollowUpEmployee").val("");
        $("#editNoteAttendeeEmployee").val("");
        $("#editNoteAttendeeContact").val("");
        // Hide Follow up section
        $("#editNoteFollowUpDetailsDiv").hide();
        // Need to call this so that chosen selectors gets refreshed
        $('#editNoteAttendeeEmployee').trigger("chosen:updated");
        $('#editNoteAttendeeContact').trigger("chosen:updated");
        $('#editNoteFollowUpEmployee').trigger("chosen:updated");
        // Init "Created by" and "Updated by" fields
        $("#editNoteWhoChanged").val("");
        $("#editNoteWhoCreated").val("");
        // New notes are identified by an Id = 0
        $("#AttachmentNoteId").val("0");
        // Also, we'll need a temporary Id which will be used to create the folder where attachments
        // will be stored serverside
        $("#AttachmentNoteTempPath").val(makeid());
        // Make sure the attachments container is empty
        $("#noteAttachments").empty();
        // Toggle notes panels
        $("#calendarView").toggle("fast");
        $("#panelNotesEdit").toggle("fast");
    });

    // Click event for "Submit" button on note edit panel
    $("#btnNoteSubmit").on("click", async function () {
        // Check if all fields are valid
        let notes = $('#editNoteText').val();
        if (notes != "") {
            // Get remaining params
            let noteId = $("#editNoteId").val();
            let noteSourceId = $("#detailsCalendarId").val();
            let noteType = $("#editNoteType").val();
            let followUpType = $("#editNoteFollowUpType").val();
            let followUp = $("#editNoteFollowUp").val();
            let senderId = UserId;
            let payload = {
                noteId: noteId,
                source: noteType,
                sourceId: noteSourceId,
                followUpType: followUpType,
                followUp: followUp,
                senderId: senderId,
                note: notes
            }
            // Prepare the save URL
            let saveURL = `${parentURL}/notes/!/note`;
            // Perform post
            let ajaxResult = await executeAjaxPost(saveURL, payload);
            if (ajaxResult) {
                // Get the note Id, we'll need it to tag the voice notes
                let isNewNote = ($("#editNoteId").val() === "0");
                let noteId = ajaxResult[0].Id;
                // Update linked employees, contacts and follow up party
                let linkedEmployees = $("#editNoteAttendeeEmployee").val().join(",");
                let linkedContacts = $("#editNoteAttendeeContact").val().join(",");
                let followUpParty = $("#editNoteFollowUpEmployee").val().join(",");
                let saveURL = `${parentURL}/notes/!/note/${noteId}/attendees?employeeList=${linkedEmployees}&contactList=${linkedContacts}&followUpList=${followUpParty}`;
                let result = await executeAjaxPost(saveURL, {});
                // Check if there are attachments
                if (noteAttachments.length > 0) {
                    // If this is a new note and attachments were added, we need to make sure that they get 
                    // transferred from the temporary folder to the new note attachment folder
                    if (isNewNote) {
                        let saveAttachmentsURL = `${parentURL}/notes/!/note/${noteId}/saveTempAttachments/${$("#AttachmentNoteTempPath").val()}`;
                        let result = await executeAjaxPost(saveAttachmentsURL, {});
                    }
                    // Check for attachments tagged for deletion
                    let deleteURL;
                    let attachmentIndex = 0;
                    for (attachmentIndex = 0; attachmentIndex < noteAttachments.length; attachmentIndex++) {
                        // Check if the "discard" checkbox is checked
                        if ($("#chkDiscardNoteAttachment" + (attachmentIndex + 1).toString()).is(":checked")) {
                            // Attachment is marked for deletion, let's remove it
                            deleteURL = `${parentURL}/notes/!/note/${noteId}/attachments?filename=${escape(noteAttachments[attachmentIndex])}`;
                            executeAjaxDelete(deleteURL);
                        };
                    }
                }
                // Check if there are voiceNotes to be saved
                if (voiceNotes.length > 0) {
                    // Traverse through the voice notes, check for new ones or older ones tagged to be discarded
                    let voiceNoteIndex = 0;
                    let discardVoiceNote;
                    for (voiceNoteIndex = 0; voiceNoteIndex < voiceNotes.length; voiceNoteIndex++) {
                        // Check if the item is tagged to be discarded
                        discardVoiceNote = $("#audioNote_" + voiceNoteIndex.toString()).is(":checked");
                        // Check if it's new
                        if ((voiceNotes[voiceNoteIndex].voiceNoteId === 0) && (!discardVoiceNote)) {
                            // It is a new voice note, save it
                            $.ajax({
                                url: `${parentURL}/notes/!/voicenote`,
                                username: credentials.user,
                                password: credentials.password,
                                type: "POST",
                                data: {
                                    noteId: noteId,
                                    voiceContent: voiceNotes[voiceNoteIndex].data,
                                    senderId: senderId
                                },
                                success: function () {
                                    // Saved it!
                                }
                            });
                        }
                        else if (discardVoiceNote) {
                            // This voice note was registered before, but it's tagged to be discaded... delete it.
                            $.ajax({
                                url: `${parentURL}/notes/!/voicenote/${voiceNotes[voiceNoteIndex].voiceNoteId}`,
                                username: credentials.user,
                                password: credentials.password,
                                type: "DELETE",
                                success: function () {
                                    // Deleted it!
                                }
                            });
                        }
                    }
                }
                // Clear the voice note container and array
                clearVoiceNoteContainer("#voiceNoteList");
                // Toggle notes panels
                $("#panelNotesEdit").toggle("fast");
                $("#calendarView").toggle("fast", function () { $('#tblNotes').DataTable().ajax.reload(); });
            }
            else {
                alert("Couldn't save note.");
            }
        }
        else {
            alert("Please provide some notes.");
        }
    });

    // Click event for "Cancel" button on Notes edit panel
    $("#btnNoteCancel").on("click", function () {
        // Clear our voice notes
        clearVoiceNoteContainer("#voiceNoteList");
        // Check if this is was a new note and attachments were added.
        if ($("#editNoteId").val() === "0") {
            // Make sure that the temporary attachment upload folder gets cleared
            let deleteURL = `${parentURL}/notes/!/note/clearAttachmentFolder/${$("#AttachmentNoteTempPath").val()}`;
            executeAjaxDelete(deleteURL);
        }
        // Toggle notes panels
        $("#panelNotesEdit").toggle("fast");
        $("#calendarView").toggle("fast", function () { $('#tblNotes').DataTable().ajax.reload(); });
    });

    // Note delete
    $("#btnNoteDelete").on("click", async function () {
        // We'll need this var to delete the note
        let noteId = $("#editNoteId").val();
        // Delete the note 
        let deleteURL = `${parentURL}/notes/!/note?noteId=${noteId}`;
        result = await executeAjaxDelete(deleteURL);
        // Toggle view/edit panels
        $("#panelNotesEdit").toggle("fast");
        $("#calendarView").toggle("fast", function () {
            $('#tblNotes').DataTable().ajax.reload();
        });
    });

    // FollowUp type on-change handler
    $("#editNoteFollowUpType").on("change", function (event) {
        if (event.target.value === "0") {
            $("#editNoteFollowUpDetailsDiv").hide();
        }
        else {
            $("#editNoteFollowUpDetailsDiv").show();
        }
    });

    // Attachments

    function addFileToAttachmentsContainer(noteId, arrayIndex, filename) {
        $("#noteAttachments").append('<div class="row"><div class="col"><a href="' + parentURL + '/s/notes/attachments/' + noteId + '/' + filename + '" target="_blank">' + filename + '</a></div><div class="col"><input class="form-check-input" type="checkbox" value="" id="chkDiscardNoteAttachment' + arrayIndex + '"><label class="form-check-label" for=id="chkDiscardNoteAttachment' + arrayIndex + '">&nbsp;&nbsp;&nbsp;&nbsp;   Discard</label></div></div>');
    }

    function loadNoteAttachments(notePath) {
        noteAttachments.length = 0;
        let noteAttachmentPath = `${parentURL}/notes/!/note/attachments/${notePath}`;
        $("#noteAttachments").empty();
        $.ajax({
            url: noteAttachmentPath,
            username: credentials.user,
            password: credentials.password,
            type: "GET",
            async: false,
            success: function (attachments) {
                let emptyObject = ($.isEmptyObject(attachments.data));
                if (!emptyObject) {
                    // There is a list of attached files, let's add them to the container
                    for (let item = 0; item < attachments.data.length; item++) {
                        noteAttachments.push(attachments.data[item]);
                        addFileToAttachmentsContainer(notePath, noteAttachments.length, attachments.data[item]);
                    }
                }
            }
        });
    }

    // Init Dropzone object, need to do this within the js file and not from the template
    // in order to attach the "on complete" event handler below.
    var dropZone = new Dropzone("form#FormDropZone", {
        url: `${parentURL}/notes/!/note/dropzone`
    });

    // Once the file gets uploaded, we'll remove the icon from the dropzone container and
    // refresh the attachment list
    dropZone.on("complete", function (file) {
        // Remove the file icon
        dropZone.removeFile(file);
        // Then reload the attachment list
        let notePath = "";
        if ($("#AttachmentNoteTempPath").val() === "") {
            // This note has an Id, let's use it as it's attachment path
            notePath = $("#AttachmentNoteId").val();
        }
        else {
            // This note doesn't have an Id, we need it's temporary id
            notePath = $("#AttachmentNoteTempPath").val();
        }
        loadNoteAttachments(notePath);
    });

    // Google place search results datatable

    $('#tblSearchResults').DataTable({
        dom: "frtip",
        data: placesArray,
        paging: true,
        pageLength: 10,
        info: false,
        ordering: false,
        processing: true,
        select: true,
        language: {
            processing: '<div style="display:block;text-align:center"><img title="loading" src="../s/img/ajax-loading.gif"></div>',
            emptyTable: "There are no entries"
        },
        "columns": [
            {
                "data": "placeId",
                "className": "never text-nowrap",
            },
            {
                "data": "name",
                "className": "text-wrap search-result-data"
            },
            {
                "data": "lat",
                "className": "never text-nowrap"
            },
            {
                "data": "long",
                "className": "never text-nowrap",
            },
            {
                "data": "address",
                "className": "text-wrap search-result-data",
            },
            {
                "data": "phoneNumber",
                "className": "text-wrap search-result-data",
            },
            {
                "data": "website",
                "className": "never text-nowrap",
            },
            {
                "data": "placeTypes",
                "className": "never text-nowrap",
            },
            {
                "data": "locality",
                "className": "text-nowrap search-result-data",
            }
        ],
        "columnDefs": [
            {
                "targets": [0],
                "visible": false,
                "searchable": false
            },
            {
                "targets": [1],
                "visible": true,
                "searchable": false
            },
            {
                "targets": [2],
                "visible": false,
                "searchable": false
            },
            {
                "targets": [3],
                "visible": false,
                "searchable": false
            },
            {
                "targets": [4],
                "visible": true,
                "searchable": false
            },
            {
                "targets": [5],
                "visible": false,
                "searchable": false
            },
            {
                "targets": [6],
                "visible": false,
                "searchable": false
            },
            {
                "targets": [7],
                "visible": false,
                "searchable": false
            }
        ]
    });

    let tblSearchResults = $('#tblSearchResults').DataTable();

    // Google Place search functions

    function toggleSearchPanels() {
        $("#panelActivityEdit").toggle();
        $("#panelGoogleSearch").toggle();
        $("#searchSpinnerDiv").show();
        $("#searchResultDiv").hide();
    }

    function closeSearchPanels() {
        // Clear the places array
        placesArray.length = 0;
        // Clear the datatable
        tblSearchResults.clear();
        // Toggle the panels
        $("#panelActivityEdit").toggle();
        $("#panelGoogleSearch").toggle();
        $("#searchSpinnerDiv").hide();
        $("#searchResultDiv").hide();
    }

    $("#btnGooglePlaceSearch").on("click", function () {
        // Search google for places matching the activity location
        let activityLocation = $('#detailsLocationDetails').val().trim();
        // Continue if the user provided a location
        if (activityLocation.length > 5) {
            // Hide the edit panel and display the search panel
            $.when(toggleSearchPanels()).then(function () {
                // Execute the search
                getGooglePlaceSearch(activityLocation);
                // Check if we actually received back something (placesArray should not be empty)
                if (placesArray.length > 0) {
                    // Now that we got a list of places that match our search, let's get their details
                    let details;
                    placesArray.forEach(function (place) {
                        // Get the details
                        details = getGooglePlaceDetails(place.placeId);
                        // Fill the missing gaps in the places array
                        if (details.address) {
                            place.address = details.address;
                        }
                        if (details.phoneNumber) {
                            place.phoneNumber = details.phoneNumber;
                        }
                        if (details.website) {
                            place.website = details.website;
                        }
                        if (details.placeTypes) {
                            place.placeTypes = details.placeTypes;
                        }
                        if (details.locality) {
                            place.locality = details.locality;
                        }
                    });
                }
                // Refresh datatable
                tblSearchResults.clear();
                tblSearchResults.rows.add(placesArray);
                tblSearchResults.draw();
            }).then(function () {
                $("#searchSpinnerDiv").hide();
                $("#searchResultDiv").show();
            });
        }
    });

    $("#btnSearchSelect").on("click", function () {
        if (tblSearchResults.row({ selected: true }).count() > 0) {
            // Use the first selected row
            let data = tblSearchResults.rows({ selected: true }).data()[0];
            // Populate the edit fields with this data
            $("#detailsLocationDetails").val(data.name);
            $("#detailsLocationLat").val(data.lat);
            $("#detailsLocationLong").val(data.long);
            $("#detailsLocationAddress").val(data.address);
            $("#detailsLocationPhoneNumber").val(data.phoneNumber);
            // Refresh the map
            googleMapsInitialize();
            // Close the search panels (cleanup included)
            closeSearchPanels();
        }
        else {
            alert("Please select one result.");
        }
    });

    $("#btnSearchCancel").on("click", function () {
        closeSearchPanels();
    });

    /* Google maps related functions */

    // Map related vars
    let geocoder;
    let map;
    let marker;

    function googleMapsInitialize() {
        let initialLat = $('#detailsLocationLat').val();
        let initialLong = $('#detailsLocationLong').val();
        initialLat = initialLat ? initialLat : 0;
        initialLong = initialLong ? initialLong : 0;

        let latlng = new google.maps.LatLng(initialLat, initialLong);
        let options = {
            zoom: 15,
            center: latlng,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };
        map = new google.maps.Map(document.getElementById("companyGeoMap"), options);
        geocoder = new google.maps.Geocoder();
        marker = new google.maps.Marker({
            map: map,
            draggable: false,
            position: latlng
        });
    }

    // Let's init the map
    googleMapsInitialize();

    // Point location on google map 
    $('#get_map').click(function (e) {
        var address = $(PostCodeid).val();
        geocoder.geocode({ 'address': address }, function (results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
                map.setCenter(results[0].geometry.location);
                marker.setPosition(results[0].geometry.location);
                $('#detailsLocationDetails').val(results[0].formatted_address);
                $('#detailsLocationLat').val(marker.getPosition().lat());
                $('#detailsLocationLong').val(marker.getPosition().lng());
            }
            else {
                alert("Geocode was not successful for the following reason: " + status);
            }
        });
        e.preventDefault();
    });

    // Voice note and speech to text related code

    // Speech recognition
    let speechRecognition;
    let speechRecognitionAvailable;
    try {
        speechRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition || window.msSpeechRecognition)();
        speechRecognition.lang = 'en-US';
        speechRecognition.interimResults = false;
        speechRecognition.maxAlternatives = 1;
        speechRecognitionAvailable = true;
    }
    catch (err) {
        // If we get here, then speechrecognition is not available
        speechRecognitionAvailable = false;
    }

    if (speechRecognitionAvailable) {
        speechRecognition.onaudiostart = function (event) {
            // Start audio recording if available
            if (audioRecordingAvailable) {
                startRecording();
            }
            // Add "listening" class to the button
            $('#btnNotesDictate').addClass("listening");
            // Also let's change it's style
            $('#btnNotesDictate').removeClass("fa-microphone");
            $('#btnNotesDictate').addClass("fa-stop");
            $('#btnNotesDictate').css({ "background-color": "maroon" });
            $('#btnNotesDictate').css({ "color": "white" });
        }

        speechRecognition.onaudioend = function (event) {
            // Remove "listening" class
            $("#btnNotesDictate").removeClass("listening");
            $('#btnNotesDictate').removeClass("fa-stop");
            $('#btnNotesDictate').addClass("fa-microphone");
            $('#btnNotesDictate').css({ "background-color": "" });
            $('#btnNotesDictate').css({ "color": "" });
            // Stop audio recording if it was available
            if (audioRecordingAvailable) {
                stopRecording();
            }
        }

        // Speech recognition engine is available, need to create the propper event handlers
        speechRecognition.onresult = function (event) {
            // Add the recognized text to our editor
            let contents = $('#editNoteText').val() + "<p>" + event.results[0][0].transcript + "</p>";
            $('#editNoteText').jqteVal(contents);
        };
    }
    else {
        // No speech recognition available; hide the button
        $('#btnNotesDictate').hide();
    }

    $('#btnNotesDictate').on('click', function () {
        // Check if we've got a speech recognition in progress
        if ($('#btnNotesDictate').hasClass("listening")) {
            // Stop current recognition task
            speechRecognition.stop();
        }
        else {
            // Start recognition task, it will also fire the voice recording event
            speechRecognition.start();
        }
    });


    let audio_context;
    let mp3recorder = new MicRecorder({
        bitRate: 64
    });

    let audioRecordingAvailable;
    let voiceNotes = [];

    function initVoiceNotesArray() {
        voiceNotes.length = 0;
    }

    function pushVoiceNoteArray(voiceNoteId, voiceData, whenCreated) {
        voiceNotes.push({
            voiceNoteId: voiceNoteId,
            data: voiceData,
            dateCreated: whenCreated
        }
        );
    }

    function clearVoiceNoteContainer(container) {
        // Clears both the voice note container, and the voice notes array
        $(container).empty();
        initVoiceNotesArray();
    }

    function createVoiceNoteLink(arrayIndex, container) {
        $(container).append('<div class="row"><div class="col-12"><li class="list-group-item"><audio controls src="' + voiceNotes[arrayIndex].data + '"></audio></li></div><div class="col-12"><input class="form-check-input" type="checkbox" value="" id="audioNote_' + arrayIndex.toString() + '"><label class="form-check-label" for=id="audioNote_' + arrayIndex.toString() + '">&nbsp;&nbsp;&nbsp;&nbsp;   Discard</label></div></div>');
    }

    function startUserMedia(stream) {
        let input = audio_context.createMediaStreamSource(stream);
    }

    function startRecording() {
        // recorder && recorder.record();
        mp3recorder.start();
    }

    function stopRecording() {
        mp3recorder.stop().getMp3().then(([buffer, blob]) => {
            let reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = function () {
                let whenCreated = new Date();
                pushVoiceNoteArray(0, reader.result, whenCreated);
                // Now let's add the link
                createVoiceNoteLink(voiceNotes.length - 1, "#voiceNoteList");
            }
        })
    }

    // Test if theres is support for audio recording
    window.onload = function init() {
        try {
            // webkit shim
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
            window.URL = window.URL || window.webkitURL;
            audio_context = new AudioContext;
            // Audio recording is available
            audioRecordingAvailable = true;
        } catch (e) {
            audioRecordingAvailable = false;
        }

        navigator.getUserMedia({ audio: true }, startUserMedia, function (e) {
            audioRecordingAvailable = true;
        });
    }

    // Outlook integration
    async function outlookUpdate(calendarId) {
        $.ajax({
            url: `${parentURL}/calendar/!/events/${calendarId}/syncUpdate`,
            username: credentials.user,
            password: credentials.password,
            type: "GET",
            processData: false,
            dataType: "text",
            contentType: 'application/json',
            success: function (response) {
                // do nothing
            },
            error: function (jqXHR, textStatus, errorThrown) {
            }
        });
    }

    async function outlookDelete(calendarId, attendeeId) {
        $.ajax({
            url: `${parentURL}/calendar/!/events/${calendarId}/syncDelete/${attendeeId}`,
            username: credentials.user,
            password: credentials.password,
            type: "GET",
            processData: false,
            dataType: "text",
            contentType: 'application/json',
            success: function (response) {
                // do nothing
            },
            error: function (jqXHR, textStatus, errorThrown) {
            }
        });
    }

    // Finally let's apply admin restrictions
    if (!UserIsAdmin) {
        $("#editMode").hide();
        $("#btnAddAttendee").hide();
        $("#btnAddNote").hide();
    }

});