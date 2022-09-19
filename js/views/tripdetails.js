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
let tripId;

// Set outlook integration flag
let syncWithOutlook = true;

// Flight, hotel and transport arrangements datatable
let AFlightAttendees = [];
let AHotelAttendees = [];
let ATransportationAttendees = [];

// Color coding for calendar
let colorTravel = "#FF9933";
let colorConfirmedMeeting = "#9FDF9F";
let colorNonConfirmedMeeting = "#FFDB4D";
let colorOpenMeeting = "#DDDDDD";
let colorConfirmedActivity = "#80CCFF";
let colorUnconfirmedActivity = "#DD99FF";
// Add this for ease of use
let eventColors = [{
    backgroundColor: colorTravel,
    textColor: "#000000"
},
{
    backgroundColor: colorConfirmedMeeting,
    textColor: "#000000"
},
{
    backgroundColor: colorNonConfirmedMeeting,
    textColor: "#000000"
},
{
    backgroundColor: colorOpenMeeting,
    textColor: "#000000"
},
{
    backgroundColor: colorConfirmedActivity,
    textColor: "#000000"
},
{
    backgroundColor: colorUnconfirmedActivity,
    textColor: "#000000"
}];

// Utilities: test for null values
function containInfo(testValue) {
    return (testValue === undefined || testValue == null || testValue.length <= 0 || testValue == 0) ? false : true;
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

function getFormattedDateTime(inputDate) {
    // FullCalendar requires datetime fields in "YYYY-MM-DDThh:nn:ss" format
    let formatedDateTime = getFormattedDate(inputDate) + 'T' + getFormattedTime(inputDate) + 'Z';
    return formatedDateTime;
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

function getFormattedTimeAMPMfromString(inputString) {
    // Same as above but uses a string as parameter
    let aDate = new Date(inputString);
    aDate = new Date(aDate.getTime() + timezoneOffset);
    return getFormattedTimeAMPM(aDate);
}

// Get timezone offset
let today = new Date();
let formatedToday = getFormattedDate(today);
let timezoneOffset = today.getTimezoneOffset() * 60000;

function convertMomentToDate(aMoment, timezoneOffset) {
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
        success: function (response) {
            result = response;
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
$(document).ready(async function () {
    let initialDate;

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
                $("#emailItineraryRecipients").append(new Option(response.data[i].LastName + " " + response.data[i].FirstName, response.data[i].EmployeeId));
                $("#editNoteFollowUpEmployee").append(new Option(response.data[i].LastName + " " + response.data[i].FirstName, response.data[i].EmployeeId));
                $("#editNoteAttendeeEmployee").append(new Option(response.data[i].LastName + " " + response.data[i].FirstName, response.data[i].EmployeeId));
                $("#editAttendeeEmployee").append(new Option(response.data[i].LastName + " " + response.data[i].FirstName, response.data[i].EmployeeId));
                $("#flightAttendeeEmployee").append(new Option(response.data[i].LastName + " " + response.data[i].FirstName, response.data[i].EmployeeId));
                $("#hotelAttendeeEmployees").append(new Option(response.data[i].LastName + " " + response.data[i].FirstName, response.data[i].EmployeeId));
                $("#transportationEmployee").append(new Option(response.data[i].LastName + " " + response.data[i].FirstName, response.data[i].EmployeeId));
                $("#emailNoteRecipients").append(new Option(response.data[i].LastName + " " + response.data[i].FirstName, response.data[i].EmployeeId));
                $("#editActivityAttendeeEmployee").append(new Option(response.data[i].LastName + " " + response.data[i].FirstName, response.data[i].EmployeeId));
                $("#emailActivityNoteRecipients").append(new Option(response.data[i].LastName + " " + response.data[i].FirstName, response.data[i].EmployeeId));
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
                $("#editActivityAttendeeContact").append(new Option(response.data[i].LastName + " " + response.data[i].FirstName, response.data[i].ContactId));
            }
        },
        error: function (data) {
            console.log('Ajax error retrieving contacts.');
        }
    });

    // Retrieve URL parameters
    let URLParamList = window.location.search.substring(1).split("&");
    // First parameter contains the event id; if value is "new", then we're adding an event
    let URLParamSet = URLParamList[0].split("=");
    $("#detailsTripId").val(URLParamSet[1]);
    tripId = URLParamSet[1];
    if (URLParamList.length > 1) {
        // Second parameter should contain the preselected activity Id
        URLParamSet = URLParamList[1].split("=");
        $("#selectedActivityId").val(URLParamSet[1]);
    }

    // Hide edit panels
    $("#panelItineraryEmail").hide();
    $("#panelAttendeeEdit").hide();
    $("#panelNotesEdit").hide();
    $("#panelNotesEmail").hide();
    $("#panelActivityEdit").hide();
    $("#panelGoogleSearch").hide();
    $("#panelActivityAttendeeEdit").hide();
    $("#panelActivityNotesEmail").hide();
    $("#panelTripActivity").hide();
    $("#panelFHTGoogleSearch").hide();
    $("#panelFlightDetails").hide();
    $("#panelHotelDetails").hide();
    $("#panelTransportationDetails").hide();

    // We can either show the edit panel when adding a new company, or show the details panel 
    // when viewing a preregistered one
    if (tripId != "new") {
        // Hide the edit panel
        $("#panelTripEdit").hide();
        // Also, update page title
        document.title = "Riverbend - RForce (Trip details)";
        // Load company details
        await refreshViewMode();
    }
    else {
        // Hide all panels except the one for editing
        $("#panelTripView").hide();
        $("#panelAttendeeView").hide();
        $("#panelNotesView").hide();
        $("#panelTripFHTArrangements").hide();
        // Also, update page title
        document.title = "Riverbend - RForce (New trip)";
        // Use today's date as default date
        let today = new Date();
        $('#detailsTitle').val('');
        $("#detailsStartDate").val(getFormattedDate(today));
        $("#detailsEndDate").val(getFormattedDate(today));
        // By default do not add trip location
        $("#chkTripLocation").prop('checked', false);
        $("#divTripLocation").hide();
        // Disable email send and PDF itinerary buttons
        $("#btnPrintItinerary").hide();
        $("#btnEmailtinerary").hide();
    }

    // Enable chosen selectors
    $('#emailItineraryRecipients').chosen({ width: "100%", allow_single_deselect: true });
    $('#transportationEmployee').chosen({ width: "100%", allow_single_deselect: true });
    $('#emailNoteRecipients').chosen({ width: "100%", allow_single_deselect: true });
    $('#editNoteFollowUpEmployee').chosen({ width: "100%", allow_single_deselect: true });
    $('#editNoteAttendeeEmployee').chosen({ width: "100%", allow_single_deselect: true });
    $('#editNoteAttendeeContact').chosen({ width: "100%", allow_single_deselect: true });

    $('#emailActivityNoteRecipients').chosen({ width: "100%", allow_single_deselect: true });
    $('#editActivityNoteFollowUpEmployee').chosen({ width: "100%", allow_single_deselect: true });
    $('#editActivityNoteAttendeeEmployee').chosen({ width: "100%", allow_single_deselect: true });
    $('#editActivityNoteAttendeeContact').chosen({ width: "100%", allow_single_deselect: true });

    $('#hotelAttendeeEmployees').chosen({ width: "100%", allow_single_deselect: true });


    // Send itinerary by email button click
    $("#btnEmailtinerary").on("click", async function () {
        // Bring up the send by email panel
        $("#panelItineraryEmail").show("fast");
    });

    // Itinerary by email - send button
    $("#btnItineraryEmailSend").on("click", async function () {
        // Check if we have a list of attendees
        let recipientList = $("#emailItineraryRecipients").val().join(",");
        if (recipientList != "") {
            // What are we sending?
            let URL = "";
            if ($("#emailItineraryType").val() == 1) {
                URL = `${parentURL}/trips/!/trips/${tripId}/sendItineraryEmail?recipients=${recipientList}`;
            }
            else {
                URL = `${parentURL}/trips/!/trips/${tripId}/sendTripSummaryEmail?recipients=${recipientList}`;
            }
            // Bombs away...
            let result = await executeAjaxPost(URL, {});
            // Clear chosen selector
            $('#emailItineraryRecipients').val([]);
            $('#emailItineraryRecipients').trigger("chosen:updated");
            // Done, hide the send by email panel
            $("#panelItineraryEmail").hide("fast");
        }
        else {
            alert("Please select at least one recipient.")
        }
    });

    // Itinerary by email - cancel button
    $("#btnItineraryEmailCancel").on("click", async function () {
        // Clear chosen selector
        $('#emailItineraryRecipients').val([]);
        $('#emailItineraryRecipients').trigger("chosen:updated");
        // Hide the send by email panel
        $("#panelItineraryEmail").hide("fast");
    });

    // click trip button "edit" switch from View to edit modes.
    $("#editMode").on("click", async function () {
        // Pass to "edit" mode
        $("#panelTripEdit").toggle("fast");
        $("#panelTripView").toggle("fast");
    });

    // Form validation functions, this one returns the name of missing fields
    function validateTripDetails() {
        // This var will hold the names of missing fields
        let missingFields = "";
        // Check trip title
        let value = $("#detailsTitle").val().trim();
        if (value === "") {
            missingFields = missingFields + "Trip title\n";
        }
        // Check start date
        let startDate = $("#detailsStartDate").val().trim();
        if (startDate === "") {
            missingFields = missingFields + "Start date\n";
        }
        // Check end date
        let endDate = $("#detailsEndDate").val().trim();
        if (endDate === "") {
            missingFields = missingFields + "End date\n";
        }
        // Check that the end date is later or equal than the start date
        if ((startDate != "") && (endDate != "")) {
            let startDateTime = new Date(startDate);
            let endDateTime = new Date(endDate);
            if (endDateTime < startDateTime) {
                missingFields = missingFields + "End date must be greater than start date\n";
            }

        }
        // return whatever is missing
        return missingFields.trim();
    }

    // Timepicker initialization
    $("#DepartureFlightTime").timepicker({
        minuteStep: 1,
        defaultTime: "12:00 PM",
        showMeridian: true
    });

    $("#ArrivalFlightTime").timepicker({
        minuteStep: 1,
        defaultTime: "12:00 PM",
        showMeridian: true
    });

    $("#hotelCheckInTime").timepicker({
        minuteStep: 1,
        defaultTime: "12:00 PM",
        showMeridian: true
    });

    $("#hotelCheckOutTime").timepicker({
        minuteStep: 1,
        defaultTime: "12:00 PM",
        showMeridian: true
    });

    $("#transportationPickupTime").timepicker({
        minuteStep: 1,
        defaultTime: "12:00 PM",
        showMeridian: true
    });

    $("#transportationDropOffTime").timepicker({
        minuteStep: 1,
        defaultTime: "12:00 PM",
        showMeridian: true
    });

    $("#detailsActivityStartTime").timepicker({
        minuteStep: 1,
        defaultTime: "12:00 PM",
        showMeridian: true
    });

    $("#detailsActivityEndTime").timepicker({
        minuteStep: 1,
        defaultTime: false,
        showMeridian: true
    });

    // Edit trip submit and cancel OnClick functions
    $("#tripDetailsSubmit").on("click", async function () {
        // Validate that required fields are complete
        let validationResult = validateTripDetails();
        if (validationResult === "") {
            // Data is valid
            let id = (tripId == "new" ? "0" : tripId);
            let title = escape($("#detailsTitle").val().trim());
            let startDateTime = new Date($("#detailsStartDate").val().trim() + " 00:00:00");
            let paramStartDateTime = getFormattedDateTime(startDateTime);
            let endDateTime = new Date($("#detailsEndDate").val().trim() + " 23:59:59");
            let paramEndDateTime = getFormattedDateTime(endDateTime);
            let companyId = $("#detailsCompany").val().trim();
            let location = "";
            let lat = "";
            let long = "";
            if ($("#chkTripLocation").is(":checked")) {
                location = $("#detailsLocation").val().trim();
                lat = $("#detailsLat").val().trim();
                long = $("#detailsLong").val().trim();
            }
            // Assemble the request URL
            let saveURL = `${parentURL}/trips/!/trips?id=${id}&title=${title}&startDateTime=${paramStartDateTime}&endDateTime=${paramEndDateTime}&companyId=${companyId}&location=${location}&lat=${lat}&long=${long}&senderId=${UserId.toString()}`;
            // Save the trip
            let result = await executeAjaxPost(saveURL, {});
            // Check if this was a new trip
            if (id == "0") {
                // It is a new trip, lets reload the page
                window.location.href = `tripdetails.html?tripId=${result[0].Id}`;
            }
            else {
                // Hides the edit panel
                $("#panelTripEdit").toggle("fast");
                $("#panelTripView").toggle("fast");
                // Reload the trip view box
                await refreshViewMode();
            }
        }
        else {
            // Failed validation
            alert("Some fields failed to pass validation:\n\n" +
                validationResult);
        }
    });

    // Edit trip submit and cancel OnClick functions
    $("#tripDetailsCancel").on("click", async function () {
        // Check if we're adding or editing
        if ($("#detailsTripId").val() != "new") {
            // Viewing a previously registered trip, just toggle the panels
            $("#panelTripEdit").toggle("fast");
            $("#panelTripView").toggle("fast", async function () {
                // Reload the tripView
                await refreshViewMode();
                googleMapsInitialize("#detailsLat", "#detailsLong", "detailsGeoMap");
            });
        }
        else {
            // Adding a new one, go back to calendar main page
            window.location.href = "./trips.html";
        }
    });

    // Trip details delete
    $("#tripDetailsDelete").on("click", async function () {
        // We'll need this var to delete the activity
        let tripId = $("#detailsTripId").val();
        // Delete the note 
        let deleteURL = `${parentURL}/trips/!/trips/${tripId}`;
        let result = await executeAjaxDelete(deleteURL);
        // Check if outlook syncing is enabled
        if (syncWithOutlook) {
            let outlookDeleteURL = `${parentURL}/trips/!/trips/${tripId}/syncDelete?tripCalendarId=0&employeeId=0`;
            result = await executeAjaxDelete(outlookDeleteURL);
        }
        // Redirect to main trips page
        window.location.href = "./trips.html";
    });

    // When clicking "Specify trip location" checkbox, location div gets toggled.
    $("#chkTripLocation").on("change", function () {
        if ($(this).is(":checked")) {
            // Hide the "end date" section
            $("#divTripLocation").show();
        }
        else {
            $("#divTripLocation").hide();
        }
    });

    // These functions refresh the calendar entry details viewer
    async function refreshViewMode() {
        let aUrl = `${parentURL}/trips/!/trips/${tripId}`;
        $.ajax({
            url: aUrl,
            username: credentials.user,
            password: credentials.password,
            type: "GET",
            async: true,
            success: function (trip) {
                // Update view mode panel
                addFieldViewMode("Title: &nbsp;", unescape(trip.data[0].Title), "col-sm-12", true, "#viewModeContainer"); // First one clears the view panel
                addFieldViewMode("Start date: &nbsp;", trip.data[0].StartDate.substr(0, 10), "col-sm-12", false, "#viewModeContainer");
                addFieldViewMode("End date: &nbsp;", trip.data[0].EndDate.substr(0, 10), "col-sm-12", false, "#viewModeContainer");
                addFieldViewMode("Company: &nbsp;", trip.data[0].CompanyName, "col-sm-12", false, "#viewModeContainer");
                addFieldViewMode("Location: &nbsp;", trip.data[0].Location, "col-sm-12", false, "#viewModeContainer");
                addFieldViewMode("Created: &nbsp;", formatDateTimeYYYYMMDDHHNN(trip.data[0].WhenCreated) + " by " + trip.data[0].WhoCreatedName, "col-sm-12", false, "#viewModeContainer");
                if (trip.data[0].WhoChanged != '') {
                    addFieldViewMode("Updated: &nbsp;", formatDateTimeYYYYMMDDHHNN(trip.data[0].WhenChanged) + " by " + trip.data[0].WhoChangedName, "col-sm-12", false, "#viewModeContainer");
                }
                // And while we're here, let's also update the edit box fields
                $("#detailsTitle").val(trip.data[0].Title);
                $("#detailsStartDate").val(trip.data[0].StartDate.substr(0, 10));
                $("#detailsEndDate").val(trip.data[0].EndDate.substr(0, 10));
                $("#detailsCompany").val(trip.data[0].CompanyId);
                $("#detailsLocation").val(trip.data[0].Location);
                $("#detailsLat").val(trip.data[0].Lat);
                $("#detailsLong").val(trip.data[0].Long);
                if (trip.data[0].Location === "") {
                    // There is no location info, hide the container
                    $("#chkTripLocation").prop('checked', false);
                    $("#divTripLocation").hide();
                }
                else {
                    // Got somne location details, show the container
                    $("#chkTripLocation").prop('checked', true);
                    $("#divTripLocation").show();
                }
                googleMapsInitialize("#detailsLat", "#detailsLong", "detailsGeoMap");
                // Set trip initial date
                initialDate = new Date(parseInt(trip.data[0].StartDate.substr(0, 4)), parseInt(trip.data[0].StartDate.substr(5, 2)) - 1, parseInt(trip.data[0].StartDate.substr(8, 2)));
                $('#calendar').fullCalendar('gotoDate', initialDate);
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

    function addFieldViewMode(fieldDescription, fieldValue, divClass, initContainer, targetContainer) {
        const fieldTemplate = '<div class="' + divClass + '"> <div class="form-group"><strong>[fieldDescription] </strong><em>[fieldValue]</em></div></div>';
        let viewModeContainer = $(targetContainer);
        if (initContainer) {
            viewModeContainer.empty();
        }
        if (containInfo(fieldValue)) {
            viewModeContainer.append(fieldTemplate.replace('[fieldDescription]', fieldDescription).replace('[fieldValue]', fieldValue));
        }
    }

    // Activity details related

    // Click event for "Cancel" button on activity edit panel
    $("#detailsActivityCancel").on("click", function () {
        // Check if we're adding a new activity
        if ($("#detailsActivityId").val() === "0") {
            // Switch back to trip details
            $("#panelActivityView").show();
            $("#panelActivityEdit").hide();
            $("#panelActivityAttendeeView").show();
            $("#panelActivityAttendeeEdit").hide();
            $("#panelActivityNotesView").show();
            // Return to trip details view
            $("#panelGeneralTrip").show();
            $("#panelTripActivity").hide();
        }
        else {
            // Reload the view panel
            refreshActivityViewMode();
            // Toggle activity panels
            $("#panelActivityEdit").toggle("fast");
            $("#panelActivityView").toggle("fast");
        }
    });

    // FullCalendar related

    // Determine if this is a new trip or if we are editing. This will help us set the initial date.
    if ($("#detailsStartDate").val() === "") {
        initialDate = new Date();
    }
    else {
        // Use provided date
        initialDate = new Date($("#detailsStartDate").val());
        // Compensate for timezone
        initialDate = new Date(initialDate.getTime() + timezoneOffset);
    }
    console.log('Initial date', initialDate);

    $('#calendar').fullCalendar({
        themeSystem: 'jquery-ui',
        height: 800,
        customButtons: {
            customNewActivity: {
                text: 'new activity',
                click: function () {
                    // Check if user is Admin
                    if (UserIsAdmin) {
                        // We're adding a new activity, check if user is not editting an activity
                        if ($("#panelTripActivity").is(":hidden")) {
                            // Hide trip details, show activity details
                            $("#panelGeneralTrip").toggle("fast");
                            $("#panelTripActivity").toggle("fast");
                        }
                        // Init trip activity details
                        $("#detailsActivityId").val("0");
                        $("#detailsActivityLat").val("");
                        $("#detailsActivityLong").val("");
                        $("#detailsActivityTitle").val("");
                        $("#detailsActivityStartDate").val("");
                        $("#detailsActivityStartTime").timepicker('setTime', '12:00 PM');
                        $("#detailsActivityEndDate").val("");
                        $("#detailsActivityEndTime").timepicker('setTime', '01:00 PM');
                        $("#detailsActivityType").val("2");
                        $("#detailsActivityLocation").val("");
                        $("#detailsActivityAddress").val("");
                        $("#detailsActivityPhoneNumber").val("");
                        // By default do not specify a location
                        $("#chkActivityLocation").prop('checked', false);
                        $("#divActivityLocation").hide();
                        // Init the activity map
                        googleMapsInitialize("#detailsActivityLat", "#detailsActivityLong", "detailsActivityGeoMap");
                        // Enable activity edit panel
                        $("#panelActivityEdit").show();
                        // Hide all other activity panels
                        $("#panelActivityView").hide();
                        $("#panelActivityAttendeeView").hide();
                        $("#panelActivityAttendeeEdit").hide();
                        $("#panelActivityNotesView").hide();
                    }
                    else {
                        alert("Sorry, but you don't have enough privileges to create a new activity.");
                    }
                }
            },
        },
        header: {
            left: 'prev,next today customNewActivity',
            center: 'title',
            right: 'agendaWeek,listWeek',
            timezone: false
        },
        // Customize the button names
        views: {
            listWeek: { buttonText: 'agenda' },
            agendaWeek: { buttonText: 'week' }
        },
        // Calendar display options
        defaultView: 'agendaWeek',
        defaultDate: initialDate,
        navLinks: true,
        editable: false,
        eventLimit: false,
        handleWindowResize: true,
        events: async function (start, end, timezone, callback) {
            $('#calendar').fullCalendar('removeEvents');
            let startDate = convertMomentToDate(start, timezoneOffset);
            let endDate = convertMomentToDate(end, timezoneOffset);
            let company = $("#settingsCompany").val();
            // Assemble the caller URL
            let itineraryURL = `${parentURL}/trips/!/trips/${(tripId == "new" ? 0 : tripId)}/itinerary`;
            // Retrieve trips
            await $.ajax({
                url: itineraryURL,
                username: credentials.user,
                password: credentials.password,
                dataType: 'json',
                data: {
                    start: getFormattedDate(startDate),
                    end: getFormattedDate(endDate)
                },
                success: function (doc) {
                    let activities = [];
                    if (doc !== null) {
                        doc.forEach(function (activityObject) {
                            // Activity colors will be retrieved from the array defined at the top of this script
                            activities.push({
                                id: activityObject.TripCalendarId,
                                title: activityObject.Title,
                                start: activityObject.StartDate,
                                end: activityObject.EndDate,
                                textColor: eventColors[activityObject.ActivityType - 1].textColor,
                                color: eventColors[activityObject.ActivityType - 1].backgroundColor,
                                allDay: false
                            });
                        });
                    }
                    callback(activities);
                }
            })
        },
        eventOverlap: function (stillEvent, movingEvent) {
            return true;
        },
        eventClick: async function (calEvent, jsEvent, view) {
            // Set the activity Id
            let activityId = calEvent.id;
            if (activityId < 0) {
                // Negative Id's pertain to flights; check if logged user is admin, otherwise just ignore him
                if (UserIsAdmin) {
                    // Retrieve flight details
                    $.ajax({
                        url: `${parentURL}/trips/!/trips/${tripId}/flights/${(activityId * -1)}`,
                        username: credentials.user,
                        password: credentials.password,
                        type: "GET",
                        async: false,
                        success: function (flight) {
                            if (!$.isEmptyObject(flight.data)) {
                                // Make sure passenger list is visible
                                $("#divFlightAttendeesDatatable").show();
                                $("#divFlightAttendeesEdit").hide();
                                // Load flight data
                                $("#flightId").val(flight.data[0].FlightId);
                                $("#flightAirline").val(flight.data[0].Airline);
                                $("#flightNumber").val(flight.data[0].FlightNumber);
                                $("#flightAirport").val(flight.data[0].Airport);
                                $("#flightAddress").val(flight.data[0].Address);
                                $("#flightPhoneNumber").val(flight.data[0].Phone);
                                $("#flightDepartureDate").val(flight.data[0].Departure.substr(0, 10));
                                let aDate = new Date(flight.data[0].Departure);
                                aDate = new Date(aDate.getTime() + timezoneOffset);
                                $("#flightDepartureTime").timepicker('setTime', getFormattedTimeAMPM(aDate));
                                $("#flightArrivalDate").val(flight.data[0].Arrival.substr(0, 10));
                                aDate = new Date(flight.data[0].Arrival);
                                aDate = new Date(aDate.getTime() + timezoneOffset);
                                $("#flightArrivalTime").timepicker('setTime', getFormattedTimeAMPM(aDate));
                                // Load flight attendees
                                loadFlightAttendees(flight.data[0].FlightId);
                                // Show the flight details panel
                                $("#panelTripFHTArrangements").toggle();
                                $("#panelFlightDetails").toggle("fast", function () {
                                    refreshFlightAttendeesDatatable();
                                });
                            }
                        }
                    });
                }
            }
            else {
                // Positive Id's pertain to manually added activities
                $("#detailsActivityId").val(activityId);
                // Call the refresh function, it will fill the edit fields
                refreshActivityViewMode();
                // Reset panels
                $("#panelActivityView").show();
                $("#panelActivityEdit").hide();
                $("#panelActivityAttendeeView").show();
                $("#panelActivityAttendeeEdit").hide();
                $("#panelActivityNotesView").show();
                // Switch panels (only if the activity panel is not already visible)
                if ($("#panelTripActivity").is(":hidden")) {
                    $("#panelGeneralTrip").toggle("fast");
                    $("#panelTripActivity").toggle("fast", function () { setActivityDatatablesAjaxURL(activityId); });
                }
                else {
                    // Adjust the notes and attendees datatables
                    setActivityDatatablesAjaxURL(activityId);
                }
            }
        },
        dayClick: function (date, jsEvent, view) {
            // Check if user is admin
            if (UserIsAdmin) {
                // We're adding a new activity, check if user is not editting an activity
                if ($("#panelTripActivity").is(":hidden")) {
                    // Hide trip details, show activity details
                    $("#panelGeneralTrip").toggle("fast");
                    $("#panelTripActivity").toggle("fast");
                }
                // Get's the clicked date/time
                let clickedDateTime = new Date(date);
                clickedDateTime = new Date(clickedDateTime.getTime() + timezoneOffset);
                let endDateTime = new Date(date);
                endDateTime = new Date(endDateTime.getTime() + timezoneOffset + (60 * 60 * 1000));
                // Init trip activity details
                $("#detailsActivityId").val("0");
                $("#detailsActivityLat").val("");
                $("#detailsActivityLong").val("");
                $("#detailsActivityTitle").val("");
                $("#detailsActivityStartDate").val(getFormattedDate(clickedDateTime));
                $("#detailsActivityStartTime").timepicker('setTime', getFormattedTimeAMPM(clickedDateTime));
                $("#detailsActivityEndDate").val(getFormattedDate(endDateTime));
                $("#detailsActivityEndTime").timepicker('setTime', getFormattedTimeAMPM(endDateTime));
                $("#detailsActivityType").val("2");
                $("#detailsActivityLocation").val("");
                $("#detailsActivityAddress").val("");
                $("#detailsActivityPhoneNumber").val("");
                // By default do not specify a location
                $("#chkActivityLocation").prop('checked', false);
                $("#divActivityLocation").hide();
                // Init the map container
                googleMapsInitialize("#detailsActivityLat", "#detailsActivityLong", "detailsActivityGeoMap");
                // Enable activity edit panel
                $("#panelActivityEdit").show();
                // Hide all other activity panels
                $("#panelActivityView").hide();
                $("#panelActivityAttendeeView").hide();
                $("#panelActivityAttendeeEdit").hide();
                $("#panelActivityNotesView").hide();
            }
        }
    });

    $('.fc-listDay-button').click(function () {
        let today = new Date();
        $('#calendar').fullCalendar('gotoDate', today);
    });


    // Trip attendees datatable
    let tripAttendeesAjaxURL = `${parentURL}/trips/!/trips/${(tripId == "new" ? 0 : tripId)}/attendees`;

    $('#tblTripAttendees').DataTable({
        dom: "frtip",
        ajax: tripAttendeesAjaxURL,
        username: credentials.user,
        password: credentials.password,
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
                "className": "never text-nowrap dt-center",
                "render": function (data, type, row) {
                    let result = ""
                    if (data === 2) {
                        result = '<span class="fa fa-address-book-o"></span>'
                    }
                    return result;
                }
            },
            {
                "data": "FirstName",
                "className": "text-nowrap attendee-data",
                "render": function (data, type, row) {
                    let result = row.LastName + ", " + row.FirstName;
                    if (row.AttendeeType === 2) {
                        // Contact, make this a link
                        result = `<a href="./contacts.html?contactId=${row.AttendeeId}">${row.LastName}, ${row.FirstName}</a>`;
                    }
                    return result;
                }
            },
            {
                "data": "ExternalCompanyName",
                "className": "text-nowrap attendee-data",
                "render": function (data, type, row) {
                    let result = "";
                    if (row.ExternalCompanyId > 0) {
                        result = `<a href="./companydetails.html?companyId=${row.ExternalCompanyId}">${row.ExternalCompanyName}</a>`
                    }
                    if (row.email != "") {
                        result = result + `<div class="row"><a href="mailto:${row.email}">${row.email}</a></div>`;
                    }
                    if (row.PhoneNumber != "") {
                        result = result + `<div class="row">${row.PhoneNumber}</div>`;
                    }
                    return result;
                }
            },
            {
                "data": "AllActivities",
                "className": "text-nowrap attendee-data dt-center",
                "render": function (data, type, row) {
                    let result = ""
                    if (data === 1) {
                        result = '<span class="fa fa-check"></span>'
                    }
                    return result;
                }
            }
        ],
        "columnDefs": [
            {
                "targets": [0],
                "visible": true,
                "searchable": false
            },
            {
                "targets": [1],
                "visible": true,
                "searchable": true
            },
            {
                "targets": [2],
                "visible": true,
                "searchable": true
            },
            {
                "targets": [3],
                "visible": true,
                "searchable": false
            }
        ]
    });

    // Clicking on the notes table will toggle the edit note panel
    $('#tblTripAttendees tbody').on('click', '.attendee-data', function () {
        // Check if logged user is admin; otherwise just ignore him
        if (UserIsAdmin) {
            // Get the row's data
            let data = $("#tblTripAttendees").DataTable().row(this).data();
            // Prep up the edit panel
            $('#editAttendeeId').val(data.AttendeeId);
            $('#editAttendeeTypeId').val(data.AttendeeType);
            $('#editAttendeeType').val(data.AttendeeType);
            if (data.AttendeeType === 1) {
                // Employee
                $("#divEditAttendeeEmployee").show();
                $("#divEditAttendeeContact").hide();
                $("#editAttendeeEmployee").val(data.AttendeeId);
            } else {
                // Contact
                $("#divEditAttendeeEmployee").hide();
                $("#divEditAttendeeContact").show();
                $("#editAttendeeContact").val(data.AttendeeId);
            }
            $("#chkAllActivities").prop('checked', (data.AllActivities === 1));
            // Toggle view/edit panels
            $("#panelAttendeeView").toggle("fast");
            $("#panelAttendeeEdit").toggle("fast");
        }
    });

    // Attendee related functions
    $("#btnAddAttendee").on("click", async function () {
        // Add new attendee, let's assume it is an employee
        $("#editAttendeeId").val("");
        $("#editAttendeeTypeId").val("");
        $("#editAttendeeType").val("1");
        $("#editAttendeeEmployee").val("");
        $("#editAttendeeContact").val("");
        $("#chkAllActivities").prop('checked', true); // Attending all events by default
        $("#divEditAttendeeEmployee").show();
        $("#divEditAttendeeContact").hide();
        // Toggle view/edit panels
        $("#panelAttendeeView").toggle("fast");
        $("#panelAttendeeEdit").toggle("fast");
    });

    $("#editAttendeeType").on('change', function () {
        if ($(this).val() === "1") {
            $("#divEditAttendeeEmployee").show();
            $("#divEditAttendeeContact").hide();
        } else {
            $("#divEditAttendeeEmployee").hide();
            $("#divEditAttendeeContact").show();
        }
    });

    $("#btnAttendeeSubmit").on("click", async function () {
        // We'll need this vars to save the attendee
        let attendeeType = $("#editAttendeeType").val();
        let attendeeId;
        // Check if we're adding an employee or a contact
        if (attendeeType === "1") {
            // Employee, check one is selected
            attendeeId = $("#editAttendeeEmployee").val();
        }
        else {
            // Contact, check one is selected
            attendeeId = $("#editAttendeeContact").val();
        }
        let allEvents = 0;
        if ($("#chkAllActivities").is(":checked")) {
            allEvents = 1;
        }
        // Check if the attendee name was selected
        if (attendeeId != "") {
            // Assemble the request URL
            let tripId = $("#detailsTripId").val();
            let saveURL = `${tripAttendeesAjaxURL}?attendeeId=${attendeeId}&attendeeType=${attendeeType}&allEvents=${allEvents}&senderId=${UserId}`;
            // Save the trip attendee
            let result = await executeAjaxPost(saveURL, {});
            // Check if outlook syncing is enabled
            if (syncWithOutlook) {
                if (attendeeType == "1") {
                    // Sync this employees events
                    let outlookSyncURL = `${parentURL}/trips/!/trips/${(tripId)}/syncUpdate?tripCalendarId=0&employeeId=${attendeeId}`;
                    let result = await executeAjaxPost(outlookSyncURL, {})
                }
            }
            // Check if there was a change of contact/employee name and type; if that's the case then
            // we need to delete the previous one
            let oldAttendeeId = $("#editAttendeeId").val();
            let oldAttendeeType = $("#editAttendeeTypeId").val();
            if ((oldAttendeeId != "") && (oldAttendeeType != "")) {
                // Compare it with the saved data
                if ((oldAttendeeId != attendeeId) || (oldAttendeeType != attendeeType)) {
                    // Check if type changed from employee to contact
                    if ((oldAttendeeType == "1") && (attendeeType == "2")) {
                        // Attendee type changed from employee to contact; unsync employee
                        let outlookSyncURL = `${parentURL}/trips/!/trips/${(tripId)}/syncDelete?tripCalendarId=0&employeeId=${oldAttendeeId}`;
                        let result = await executeAjaxDelete(outlookSyncURL);
                    }
                    // Type or attendee changed, lets delete the previous entry
                    let deleteURL = `${tripAttendeesAjaxURL}?attendeeId=${oldAttendeeId}&attendeeType=${oldAttendeeType}`;
                    result = await executeAjaxDelete(deleteURL);
                }
            }
            $("#editAttendeeTypeId").val("");
            // Toggle view/edit panels
            $("#panelAttendeeEdit").toggle("fast");
            $("#panelAttendeeView").toggle("fast", function () { $('#tblTripAttendees').DataTable().ajax.reload(); });
        }
        else {
            // No contact or employee selected
            alert("Please select the attendee name.");
        }
    });

    $("#btnAttendeeCancel").on("click", async function () {
        // Add new attendee
        // Toggle view/edit panels
        $("#panelAttendeeView").toggle("fast");
        $("#panelAttendeeEdit").toggle("fast");
    });

    // Trip attendee delete
    $("#btnAttendeeDelete").on("click", async function () {
        // We'll need this vars to delete the attendee
        let tripId = $("#detailsTripId").val();
        let attendeeType = $("#editAttendeeTypeId").val();
        let attendeeId = $("#editAttendeeId").val();
        // Check if this was an employee and if outlook syncing is enabled
        if ((attendeeType == "1") && (syncWithOutlook)) {
            // Remove the trip from the employee's calendar
            let outlookSyncURL = `${parentURL}/trips/!/trips/${(tripId)}/syncDelete?tripCalendarId=0&employeeId=${attendeeId}`;
            await executeAjaxDelete(outlookSyncURL);
        }
        // Delete the attendee
        let deleteURL = `${parentURL}/trips/!/trips/${tripId}/attendees?attendeeId=${attendeeId}&attendeeType=${attendeeType}`;
        await executeAjaxDelete(deleteURL);
        // Toggle view/edit panels
        $("#panelAttendeeEdit").toggle("fast");
        $("#panelAttendeeView").toggle("fast", function () {
            $('#tblTripAttendees').DataTable().ajax.reload();
        });
    });

    // Flight, hotel and transportation arrangements datatable
    $('#tblTripFHTArrangements').DataTable({
        dom: "frtip",
        ajax: `${parentURL}/trips/!/trips/${tripId}/arrangements`,
        username: credentials.user,
        password: credentials.password,
        paging: false,
        info: false,
        searching: false,
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
                "data": "ArrangementTypeDescription",
                "className": "text-nowrap arrangement-data"
            },
            {
                "data": "StartDate",
                "className": "text-nowrap arrangement-data",
                "render": function (data, type, row) {
                    let result = '<div class="row">' + formatDateTimeYYYYMMDDHHNN(row.StartDate) + '</div>' +
                        '<div class="row">' + formatDateTimeYYYYMMDDHHNN(row.EndDate) + '</div>';
                    return result;
                }
            },
            {
                "data": "DescriptionLine1",
                "className": "text-nowrap arrangement-data",
                "render": function (data, type, row) {
                    let result = '<div class="row">' + row.DescriptionLine1 + '</div>';
                    if (row.DescriptionLine2 != "") {
                        result = result + '<div class="row">' + row.DescriptionLine2 + '</div>';
                    }
                    return result;
                }
            },
            {
                "data": "Employees",
                "className": "text-nowrap arrangement-data",
                "render": function (data, type, row) {
                    let result = "";
                    if (row.Employees != "") {
                        // Employees come on a comma delimited list, split them on an array
                        let AEmployees = row.Employees.split(", ");
                        // Assemble the response, one row per employee
                        if (AEmployees.length > 0) {
                            for (let i = 0; i < AEmployees.length; i++) {
                                result = result + '<div class="row">' + AEmployees[i].toString().trim() + '</div>';
                            }
                        }
                    }
                    return result;
                }
            }
        ],
        "columnDefs": [
            {
                "targets": [0],
                "visible": true,
                "searchable": false
            },
            {
                "targets": [1],
                "visible": true,
                "searchable": false
            },
            {
                "targets": [2],
                "visible": true,
                "searchable": false
            },
            {
                "targets": [3],
                "visible": true,
                "searchable": false
            }
        ]
    });

    // Clicking on the trip arrangements table will toggle the edit arrangements panel
    $('#tblTripFHTArrangements tbody').on('click', '.arrangement-data', function () {
        // Check if logged user is admin; otherwise just ignore him
        if (UserIsAdmin) {
            // Get the row's data
            let data = $("#tblTripFHTArrangements").DataTable().row(this).data();
            // Is this a flight, hotel reservation or transportation arrangement?
            if (data.ArrangementType === 1) {
                // Retrieve flight details
                $.ajax({
                    url: `${parentURL}/trips/!/trips/${tripId}/flights/${data.ArrangementId}`,
                    username: credentials.user,
                    password: credentials.password,
                    type: "GET",
                    async: false,
                    success: function (flight) {
                        if (!$.isEmptyObject(flight.data)) {
                            // Make sure passenger list is visible
                            $("#divFlightAttendeesDatatable").show();
                            $("#divFlightAttendeesEdit").hide();
                            // Load flight data
                            $("#flightId").val(flight.data[0].FlightId);
                            $("#flightAirline").val(flight.data[0].Airline);
                            $("#flightNumber").val(flight.data[0].FlightNumber);

                            $("#DepartureFlightAirport").val(flight.data[0].DepartureAirport);
                            $("#DepartureFlightAddress").val(flight.data[0].DepartureAddress);
                            $("#DepartureFlightPhoneNumber").val(flight.data[0].DeparturePhone);
                            $("#DepartureFlightDate").val(flight.data[0].DepartureDateTime.substr(0, 10));
                            let aDate = new Date(flight.data[0].DepartureDateTime);
                            aDate = new Date(aDate.getTime() + timezoneOffset);
                            $("#DepartureFlightTime").timepicker('setTime', getFormattedTimeAMPM(aDate));

                            $("#ArrivalFlightAirport").val(flight.data[0].ArrivalAirport);
                            $("#ArrivalFlightAddress").val(flight.data[0].ArrivalAddress);
                            $("#ArrivalFlightPhoneNumber").val(flight.data[0].ArrivalPhone);

                            $("#ArrivalFlightDate").val(flight.data[0].ArrivalDateTime.substr(0, 10));
                            aDate = new Date(flight.data[0].ArrivalDateTime);
                            aDate = new Date(aDate.getTime() + timezoneOffset);
                            $("#ArrivalFlightTime").timepicker('setTime', getFormattedTimeAMPM(aDate));
                            // Load flight attendees
                            loadFlightAttendees(flight.data[0].FlightId);
                            // Show the flight details panel
                            $("#panelTripFHTArrangements").toggle();
                            $("#panelFlightDetails").toggle("fast", function () {
                                refreshFlightAttendeesDatatable();
                            });
                        }
                    }
                });
            }
            else if (data.ArrangementType === 2) {
                // Retrieve hotel details
                $.ajax({
                    url: `${parentURL}/trips/!/trips/${tripId}/hotel/${data.ArrangementId}`,
                    username: credentials.user,
                    password: credentials.password,
                    type: "GET",
                    async: false,
                    success: function (hotel) {
                        if (!$.isEmptyObject(hotel.data)) {
                            // Make sure guest list is visible
                            $("#divHotelAttendeesDatatable").show();
                            $("#divHotelAttendeesEdit").hide();
                            // Load flight data
                            $("#hotelId").val(hotel.data[0].HostingId);
                            $("#hotelHotel").val(hotel.data[0].Hotel);
                            $("#hotelAddress").val(unescape(hotel.data[0].Address));
                            $("#hotelPhoneNumber").val(hotel.data[0].Phone);

                            $("#hotelAttendeeReservationNumber").val(hotel.data[0].ReservationNumber);
                            $("#hotelCheckInDate").val(hotel.data[0].CheckIn.split("T")[0]);
                            let aDate = new Date(hotel.data[0].CheckIn);
                            aDate = new Date(aDate.getTime() + timezoneOffset);
                            $("#hotelCheckInTime").timepicker('setTime', getFormattedTimeAMPM(aDate));
                            //$("#hotelCheckInTime").val(hotel.data[0].CheckIn.split("T")[1]);

                            $("#hotelCheckOutDate").val(hotel.data[0].CheckOut.split("T")[0]);
                            aDate = new Date(hotel.data[0].CheckOut);
                            aDate = new Date(aDate.getTime() + timezoneOffset);
                            $("#hotelCheckOutTime").timepicker('setTime', getFormattedTimeAMPM(aDate));
                            //$("#hotelCheckOutTime").val(hotel.data[0].CheckOut.split("T")[1]);

                            $("#hotelAttendeeEmployees").val(hotel.data[0].Employees.split(","));
                            $('#hotelAttendeeEmployees').trigger("chosen:updated");

                            // Load hotel guests
                            //loadHotelAttendees(hotel.data[0].HostingId);
                            // Show the flight details panel
                            $("#panelTripFHTArrangements").toggle();
                            $("#panelHotelDetails").toggle("fast", function () {
                                refreshHotelAttendeesDatatable();
                            });
                        }
                    }
                });
            }
            else if (data.ArrangementType === 3) {
                // Retrieve transportation details
                $.ajax({
                    url: `${parentURL}/trips/!/trips/${tripId}/transportation/${data.ArrangementId}`,
                    username: credentials.user,
                    password: credentials.password,
                    type: "GET",
                    async: false,
                    success: function (transportation) {
                        if (!$.isEmptyObject(transportation.data)) {
                            // Load transportation data
                            $("#transportationId").val(transportation.data[0].TransportationId);
                            $("#transportationCompany").val(transportation.data[0].Company);
                            $("#transportationLocation").val(transportation.data[0].Location);
                            $("#transportationPhoneNumber").val(transportation.data[0].PhoneNumber);
                            $("#transportationConfirmationNumber").val(transportation.data[0].ConfirmationNumber);
                            $("#transportationPickupDate").val(transportation.data[0].Pickup.substr(0, 10));
                            let aDate = new Date(transportation.data[0].Pickup);
                            aDate = new Date(aDate.getTime() + timezoneOffset);
                            $("#transportationPickupTime").timepicker('setTime', getFormattedTimeAMPM(aDate));
                            $("#transportationDropOffDate").val(transportation.data[0].DropOff.substr(0, 10));
                            aDate = new Date(transportation.data[0].DropOff);
                            aDate = new Date(aDate.getTime() + timezoneOffset);
                            $("#transportationDropOffTime").timepicker('setTime', getFormattedTimeAMPM(aDate));
                            // Lets now retrieve the employee list
                            let employeeList = [];
                            $.ajax({
                                url: `${parentURL}/trips/!/trips/${tripId}/transportation/${data.ArrangementId}/attendees`,
                                username: credentials.user,
                                password: credentials.password,
                                type: "GET",
                                async: false,
                                success: function (employees) {
                                    if (!$.isEmptyObject(employees.data)) {
                                        for (let i = 0; i < employees.data.length; i++) {
                                            employeeList.push(employees.data[i].EmployeeId);
                                        }
                                    }
                                }
                            });
                            $("#transportationEmployee").val(employeeList);
                            $('#transportationEmployee').trigger("chosen:updated");
                            // Show the transportation details panel
                            $("#panelTripFHTArrangements").toggle();
                            $("#panelTransportationDetails").toggle();
                        }
                    }
                });
            }
        }
    });

    //*** Flights ***//

    async function loadFlightAttendees(flightId) {
        // init the flight attendees array
        AFlightAttendees.length = 0;
        // Load the flight attendees
        $.ajax({
            url: `${parentURL}/trips/!/trips/${tripId}/flights/${flightId}/attendees`,
            username: credentials.user,
            password: credentials.password,
            type: "GET",
            async: false,
            success: function (attendees) {
                if (!$.isEmptyObject(attendees.data)) {
                    for (let i = 0; i < attendees.data.length; i++) {
                        AFlightAttendees.push({
                            employeeId: attendees.data[i].EmployeeId,
                            employeeName: attendees.data[i].EmployeeName,
                            confirmationNumber: attendees.data[i].ConfirmationNumber,
                            seat: attendees.data[i].Seat,
                            deleted: 0
                        });
                    }
                }
            }
        });
    }

    function refreshFlightAttendeesDatatable() {
        $('#tblFlightAttendees').DataTable().clear().draw();
        for (let i = 0; i < AFlightAttendees.length; i++) {
            $('#tblFlightAttendees').DataTable().row.add(AFlightAttendees[i]).draw();
        }
    }

    // Flight attendees datatable
    $('#tblFlightAttendees').DataTable({
        dom: "frtip",
        data: AFlightAttendees,
        paging: false,
        info: false,
        searching: false,
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
                "data": "employeeName",
                "className": "text-nowrap attendee-data",
                "render": function (data, type, row) {
                    let result;
                    if (row.deleted === 1) {
                        result = "<strike>" + data + "</strike>";
                    }
                    else {
                        result = data;
                    }
                    return result;
                }
            },
            {
                "data": "confirmationNumber",
                "className": "text-nowrap attendee-data",
                "render": function (data, type, row) {
                    let result;
                    if (row.deleted === 1) {
                        result = "<strike>" + data + "</strike>";
                    }
                    else {
                        result = data;
                    }
                    return result;
                }
            },
            {
                "data": "seat",
                "className": "text-nowrap attendee-data",
                "render": function (data, type, row) {
                    let result;
                    if (row.deleted === 1) {
                        result = "<strike>" + data + "</strike>";
                    }
                    else {
                        result = data;
                    }
                    return result;
                }
            }
        ],
        "columnDefs": [
            {
                "targets": [0],
                "visible": true,
                "searchable": false
            },
            {
                "targets": [1],
                "visible": true,
                "searchable": true
            },
            {
                "targets": [2],
                "visible": true,
                "searchable": true
            }
        ]
    });

    // Clicking on the flight attendee table will toggle the edit attendee data section
    $("#tblFlightAttendees tbody").on("click", ".attendee-data", function () {
        // Check if logged user is admin; otherwise just ignore him
        if (UserIsAdmin) {
            // Get the row's data
            let data = $("#tblFlightAttendees").DataTable().row(this).data();
            $("#flightAttendeeEmployee").val(data.employeeId);
            $("#flightAttendeeConfirmationNumber").val(data.confirmationNumber);
            $("#flightAttendeeSeat").val(data.seat);
            // switch sections
            $("#divFlightAttendeesDatatable").toggle();
            $("#divFlightAttendeesEdit").toggle();
        }
    });

    // Add flight button
    $("#btnAddFlight").on("click", async function () {
        // Init flight attendees array
        AFlightAttendees.length = 0;
        // Make sure passenger list is visible
        $("#divFlightAttendeesDatatable").show();
        $("#divFlightAttendeesEdit").hide();
        // Init flight data
        $("#flightId").val("0");
        $("#flightAirline").val("");
        $("#flightNumber").val("");
        $("#flightAirport").val("");
        $("#flightAddress").val("");
        $("#flightPhoneNumber").val("");
        $("#flightDepartureDate").val("");
        $("#flightDepartureTime").val("12:00 PM");
        $("#flightArrivalDate").val("");
        $("#flightArrivalTime").val("12:00 PM");
        // Show the flight details panel
        $("#panelTripFHTArrangements").toggle();
        $("#panelFlightDetails").toggle("fast", function () {
            refreshFlightAttendeesDatatable();
        });
    });

    // Add flight attendee button
    $("#btnAddFlightAttendee").on("click", function () {
        // Show flight attendee edit section
        $("#flightAttendeeEmployee").val("");
        $("#flightAttendeeConfirmationNumber").val("");
        $("#flightAttendeeSeat").val("");
        $("#divFlightAttendeesDatatable").toggle();
        $("#divFlightAttendeesEdit").toggle();
    })

    // Flight edit panel submit button
    $("#btnFlightAttendeeSubmit").on("click", async function () {
        // Check if all fields got captured
        // Check if required data is available
        let employee = $("#flightAttendeeEmployee").val();
        let confirmationNumber = $("#flightAttendeeConfirmationNumber").val().trim();
        let seat = $("#flightAttendeeSeat").val().trim();

        let missingFields = [];
        if (employee === "") {
            missingFields.push('Employee');
        }
        if (confirmationNumber === "") {
            missingFields.push('Confirmation number');
        }
        if (seat === "") {
            missingFields.push('Seat');
        }
        if (missingFields.length > 0) {
            // At least one field is missing.
            alert('The following fields are required:\n\n' + missingFields.join(", "));
        }
        else {
            // Push the data into the array
            let registered = false;
            for (let i = 0; i < AFlightAttendees.length; i++) {
                if (AFlightAttendees[i].employeeId == employee) {
                    // Already registered, update his data
                    AFlightAttendees[i].confirmationNumber = confirmationNumber;
                    AFlightAttendees[i].seat = seat;
                    AFlightAttendees[i].deleted = 0;
                    // Graciously exit
                    registered = true;
                    break;
                }
            }
            if (!registered) {
                AFlightAttendees.push({
                    employeeId: employee,
                    employeeName: $("option:selected", $("#flightAttendeeEmployee")).text(),
                    confirmationNumber: confirmationNumber,
                    seat: seat,
                    deleted: 0
                });
            }
            // Show flight attendee datatable
            $("#divFlightAttendeesEdit").toggle();
            $("#divFlightAttendeesDatatable").toggle("fast", function () {
                // Refresh the datatable.
                refreshFlightAttendeesDatatable();
            });
        }
    });

    // Flight attendee edit panel cancel button
    $("#btnFlightAttendeeCancel").on("click", async function () {
        // Show flight attendee datatable
        $("#divFlightAttendeesEdit").toggle();
        $("#divFlightAttendeesDatatable").toggle();
    });

    // Flight attendee edit panel delete button
    $("#btnFlightAttendeeDelete").on("click", async function () {
        // Check that an employee has been selected
        let employeeId = $("#flightAttendeeEmployee").val()
        if (employeeId != "") {
            // Search the employee 
            let position = -1;
            for (let i = 0; i < AFlightAttendees.length; i++) {
                if (AFlightAttendees[i].employeeId == employeeId) {
                    position = i;
                    break;
                }
            }
            if (position >= 0) {
                // Tag the passenger for removal
                AFlightAttendees[position].deleted = 1;
                // Refresh the datatable
                refreshFlightAttendeesDatatable();
            }
        }
        // Switch panels
        $("#divFlightAttendeesEdit").toggle();
        $("#divFlightAttendeesDatatable").toggle("fast", function () {
            // Refresh the datatable.
            refreshFlightAttendeesDatatable();
        });
    });

    // Flight edit panel submit button
    $("#btnFlightSubmit").on("click", async function () {
        // Check if required data is available
        let airline = $("#flightAirline").val().trim();
        let flightNumber = $("#flightNumber").val().trim();
        let departureFlightAirport = $("#DepartureFlightAirport").val().trim();
        let departureFlightAddress = $("#DepartureFlightAddress").val().trim();
        let departureFlightPhoneNumber = $("#DepartureFlightPhoneNumber").val().trim();
        let departureFlightDate = $("#DepartureFlightDate").val().trim();
        let departureFlightTime = $("#DepartureFlightTime").val().trim();
        let arrivalFlightAirport = $("#ArrivalFlightAirport").val().trim();
        let arrivalFlightAddress = $("#ArrivalFlightAddress").val().trim();
        let arrivalFlightPhoneNumber = $("#ArrivalFlightPhoneNumber").val().trim();
        let arrivalFlightDate = $("#ArrivalFlightDate").val().trim();
        let arrivalFlightTime = $("#ArrivalFlightTime").val().trim();


        let missingFields = [];

        missingFields = checkMissingFields(airline, "Airline", missingFields);
        missingFields = checkMissingFields(flightNumber, "Flight number", missingFields);
        missingFields = checkMissingFields(departureFlightAirport, "Departure airport", missingFields);
        missingFields = checkMissingFields(departureFlightDate, "Departure date", missingFields);
        missingFields = checkMissingFields(departureFlightTime, "Departure time", missingFields);
        missingFields = checkMissingFields(arrivalFlightAirport, "Arrival airport", missingFields);
        missingFields = checkMissingFields(arrivalFlightDate, "Arrival date", missingFields);
        missingFields = checkMissingFields(arrivalFlightTime, "Arrival time", missingFields);

        if (missingFields.length > 0) {
            // At least one field is missing.
            alert('The following fields are required:\n\n' + missingFields.join(", "));
        }
        else {
            // All fields are available, let's first save the trip header
            let flightId = $("#flightId").val();
            let departureDateTime = new Date(departureFlightDate + " " + departureFlightTime);
            let departure = getFormattedDateTime(departureDateTime);
            let arrivalDateTime = new Date(arrivalFlightDate + " " + arrivalFlightTime);
            let arrival = getFormattedDateTime(arrivalDateTime);
            let saveURL = `${parentURL}/trips/!/trips/${tripId}/flights`;
            let result = await executeAjaxPost(saveURL, {
                tripId: tripId,
                flightId: flightId,
                airline: airline,
                flightNumber: flightNumber,
                departureFlightAirport: departureFlightAirport,
                departureFlightAddress: departureFlightAddress,
                departureFlightPhoneNumber: departureFlightPhoneNumber,
                departure: departure,
                arrivalFlightAirport: arrivalFlightAirport,
                arrivalFlightAddress: arrivalFlightAddress,
                arrivalFlightPhoneNumber: arrivalFlightPhoneNumber,
                arrival: arrival,
                senderId: UserId
            });
            flightId = result[0].Id;
            // Check if there are passengers
            if (AFlightAttendees.length > 0) {
                for (let i = 0; i < AFlightAttendees.length; i++) {
                    // Check if the passenger is tagged for deletion
                    if (AFlightAttendees[i].deleted == 0) {
                        // Save him
                        saveURL = `${parentURL}/trips/!/trips/${tripId}/flights/${flightId}/attendees?employeeId=${AFlightAttendees[i].employeeId}&confirmationNumber=${AFlightAttendees[i].confirmationNumber}&seat=${AFlightAttendees[i].seat}&senderId=${UserId}`;
                        await executeAjaxPost(saveURL, {});
                        // Check if outlook syncing is enabled
                        if (syncWithOutlook) {
                            // Resync the employee
                            let outlookSyncURL = `${parentURL}/trips/!/trips/${(tripId)}/syncUpdate?tripCalendarId=0&employeeId=${AFlightAttendees[i].employeeId}`;
                            let result = await executeAjaxPost(outlookSyncURL, {})
                        }
                    }
                    else {
                        // Check if outlook syncing is enabled
                        if (syncWithOutlook) {
                            // Remove the flight from the employee's calendar
                            let outlookSyncURL = `${parentURL}/trips/!/trips/${(tripId)}/syncDelete?tripCalendarId=-${flightId}&employeeId=${AFlightAttendees[i].employeeId}`;
                            await executeAjaxDelete(outlookSyncURL, {})
                        }
                        // Delete him
                        let deleteURL = `${parentURL}/trips/!/trips/${tripId}/flights/${flightId}/attendees?employeeId=${AFlightAttendees[i].employeeId}&senderId=${UserId}`;
                        await executeAjaxDelete(deleteURL);
                    }
                }
            }
            // Done, switch panels
            $("#panelFlightDetails").toggle();
            $("#panelTripFHTArrangements").toggle("fast", function () { $('#tblTripFHTArrangements').DataTable().ajax.reload(); });
            // clear form
            clearFlightEditPanel();
            // Also refetch the calendar
            $('#calendar').fullCalendar('refetchEvents');
        }
    });

    // Flight edit panel cancel button
    $("#btnFlightCancel").on("click", async function () {
        // clear form
        clearFlightEditPanel();

        // Show the flight details panel
        $("#panelFlightDetails").toggle();
        $("#panelTripFHTArrangements").toggle();
    });

    // Flight edit panel delete button
    $("#btnFlightDelete").on("click", async function () {
        let flightId = $("#flightId").val();
        // Check of outlook syncing is enabled
        if (syncWithOutlook) {
            // Remove the flight from all registered employee calendars
            let outlookSyncURL = `${parentURL}/trips/!/trips/${(tripId)}/syncDelete?tripCalendarId=-${flightId}&employeeId=0`;
            await executeAjaxDelete(outlookSyncURL, {})
        }
        // Delete the flight
        let deleteURL = `${parentURL}/trips/!/trips/${tripId}/flights/${flightId}?senderId=${UserId}`;
        await executeAjaxDelete(deleteURL);
        // Done, switch panels
        $("#panelFlightDetails").toggle();
        $("#panelTripFHTArrangements").toggle("fast", function () { $('#tblTripFHTArrangements').DataTable().ajax.reload(); });
        // clear form
        clearFlightEditPanel();
        // Reload the calendar
        $('#calendar').fullCalendar('refetchEvents');
    });

    function refreshHotelAttendeesDatatable() {
        $('#tblHotelAttendees').DataTable().clear().draw();
        for (let i = 0; i < AHotelAttendees.length; i++) {
            $('#tblHotelAttendees').DataTable().row.add(AHotelAttendees[i]).draw();
        }
    }

    // Hotel attendees datatable
    $('#tblHotelAttendees').DataTable({
        dom: "frtip",
        data: AHotelAttendees,
        paging: false,
        info: false,
        searching: false,
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
                "data": "employeeName",
                "className": "text-nowrap attendee-data",
                "render": function (data, type, row) {
                    let result;
                    if (row.deleted === 1) {
                        result = "<strike>" + data + "</strike>";
                    }
                    else {
                        result = data;
                    }
                    return result;
                }
            },
            {
                "data": "reservationNumber",
                "className": "text-nowrap attendee-data",
                "render": function (data, type, row) {
                    let result;
                    if (row.deleted === 1) {
                        result = "<strike>" + data + "</strike>";
                    }
                    else {
                        result = data;
                    }
                    return result;
                }
            },
            {
                "data": "checkIn",
                "className": "text-nowrap attendee-data",
                "render": function (data, type, row) {
                    let result;
                    let checkIn = new Date(row.checkIn);
                    let checkOut = new Date(row.checkOut);
                    let rowContent = '<div class="row">' + getFormattedDate(checkIn) + ' ' + getFormattedTimeAMPM(checkIn) + '</div>' +
                        '<div class="row">' + getFormattedDate(checkOut) + ' ' + getFormattedTimeAMPM(checkOut) + '</div>';
                    if (row.deleted === 1) {
                        result = "<strike>" + rowContent + "</strike>";
                    }
                    else {
                        result = rowContent;
                    }
                    return result;
                }
            }
        ],
        "columnDefs": [
            {
                "targets": [0],
                "visible": true,
                "searchable": false
            },
            {
                "targets": [1],
                "visible": true,
                "searchable": false
            },
            {
                "targets": [2],
                "visible": true,
                "searchable": false
            }
        ]
    });

    // Clicking on the flight attendee table will toggle the edit attendee data section
    $("#tblHotelAttendees tbody").on("click", ".attendee-data", function () {
        // Check if logged user is admin; otherwise just ignore him
        if (UserIsAdmin) {
            // Get the row's data
            let data = $("#tblHotelAttendees").DataTable().row(this).data();
            $("#hotelAttendeeEmployee").val(data.employeeId);
            $("#hotelAttendeeReservationNumber").val(data.reservationNumber);
            $("#hotelCheckInDate").val(getFormattedDate(data.checkIn));
            $("#hotelCheckInTime").timepicker('setTime', getFormattedTimeAMPM(data.checkIn));
            $("#hotelCheckOutDate").val(getFormattedDate(data.checkOut));
            $("#hotelCheckOutTime").timepicker('setTime', getFormattedTimeAMPM(data.checkOut));
            // switch sections
            $("#divHotelAttendeesDatatable").toggle();
            $("#divHotelAttendeesEdit").toggle();
        }
    });

    // Add hotel button
    $("#btnAddHotel").on("click", async function () {
        // Init hotel guests array
        AHotelAttendees.length = 0;
        // Make sure guest list is visible
        $("#divHotelAttendeesDatatable").show();
        $("#divHotelAttendeesEdit").hide();
        // Init hotel data
        $("#hotelId").val("0");
        $("#hotelHotel").val("");
        $("#hotelAddress").val("");
        $("#hotelPhoneNumber").val("");
        // Show the hotel details panel
        $("#panelTripFHTArrangements").toggle();
        $("#panelHotelDetails").toggle("fast", function () {
            refreshHotelAttendeesDatatable();
        });
    });

    // Add hotel attendee button
    $("#btnAddHotelAttendee").on("click", function () {
        // Show flight attendee edit section
        $("#hotelAttendeeEmployee").val("");
        $("#hotelAttendeeReservationNumber").val("");
        $("#hotelCheckInDate").val("");
        $("#hotelCheckInTime").val("12:00 PM");
        $("#hotelCheckOutDate").val("");
        $("#hotelCheckOutTime").val("12:00 PM");
        $("#divHotelAttendeesDatatable").toggle();
        $("#divHotelAttendeesEdit").toggle();
    })

    // Hotel edit panel submit button
    $("#btnHotelAttendeeSubmit").on("click", async function () {
        // Check if all fields got captured
        let employee = $("#hotelAttendeeEmployee").val();
        let reservationNumber = $("#hotelAttendeeReservationNumber").val().trim();
        let checkInDate = $("#hotelCheckInDate").val().trim();
        let checkInTime = $("#hotelCheckInTime").val().trim();
        let checkOutDate = $("#hotelCheckOutDate").val().trim();
        let checkOutTime = $("#hotelCheckOutTime").val().trim();

        let missingFields = [];
        if (employee === "") {
            missingFields.push('Employee');
        }
        if (reservationNumber === "") {
            missingFields.push('Reservation number');
        }
        if (checkInDate === "") {
            missingFields.push('Check in date');
        }
        if (checkInTime === "") {
            missingFields.push('Check in time');
        }
        if (checkOutDate === "") {
            missingFields.push('Check out date');
        }
        if (checkOutTime === "") {
            missingFields.push('Check out time');
        }
        if (missingFields.length > 0) {
            // At least one field is missing.
            alert('The following fields are required:\n\n' + missingFields.join(", "));
        }
        else {
            let checkIn = new Date(checkInDate + " " + checkInTime);
            let checkOut = new Date(checkOutDate + " " + checkOutTime);
            // Push the data into the array
            let registered = false;
            for (let i = 0; i < AHotelAttendees.length; i++) {
                if (AHotelAttendees[i].employeeId == employee) {
                    // Already registered, update his data
                    AHotelAttendees[i].reservationNumber = reservationNumber;
                    AHotelAttendees[i].checkIn = checkIn;
                    AHotelAttendees[i].checkOut = checkOut;
                    AHotelAttendees[i].deleted = 0;
                    // Graciously exit
                    registered = true;
                    break;
                }
            }
            if (!registered) {
                AHotelAttendees.push({
                    employeeId: employee,
                    employeeName: $("option:selected", $("#hotelAttendeeEmployee")).text(),
                    reservationNumber: reservationNumber,
                    checkIn: checkIn,
                    checkOut: checkOut,
                    deleted: 0
                });
            }
            // Show hotel attendee datatable
            $("#divHotelAttendeesEdit").toggle();
            $("#divHotelAttendeesDatatable").toggle("fast", function () {
                // Refresh the datatable.
                refreshHotelAttendeesDatatable();
            });
        }
    });

    // Hotel attendee edit panel cancel button
    $("#btnHotelAttendeeCancel").on("click", async function () {
        // Show hotel attendee datatable
        $("#divHotelAttendeesEdit").toggle();
        $("#divHotelAttendeesDatatable").toggle();
    });

    // Hotel attendee edit panel delete button
    $("#btnHotelAttendeeDelete").on("click", async function () {
        // Check that an employee has been selected
        let employeeId = $("#hotelAttendeeEmployee").val()
        if (employeeId != "") {
            // Search the employee 
            let position = -1;
            for (let i = 0; i < AHotelAttendees.length; i++) {
                if (AHotelAttendees[i].employeeId == employeeId) {
                    position = i;
                    break;
                }
            }
            if (position >= 0) {
                // Tag the employee for removal
                AHotelAttendees[position].deleted = 1;
                // Refresh the datatable
                refreshHotelAttendeesDatatable();
            }
        }
        // Switch panels
        $("#divHotelAttendeesEdit").toggle();
        $("#divHotelAttendeesDatatable").toggle("fast", function () {
            // Refresh the datatable.
            refreshHotelAttendeesDatatable();
        });
    });

    function checkMissingFields(field, fieldDescriptor, missingFields) {
        if (field === "")
            missingFields.push(fieldDescriptor)
        return missingFields;
    }

    // Hotel edit panel submit button
    $("#btnHotelSubmit").on("click", async function () {
        // Check if required data is available
        let hotel = $("#hotelHotel").val().trim();
        let address = $("#hotelAddress").val().trim();
        let phone = $("#hotelPhoneNumber").val().trim();
        let reservationNumber = $("#hotelAttendeeReservationNumber").val().trim();
        let checkInDate = $("#hotelCheckInDate").val().trim();
        let checkInTime = $("#hotelCheckInTime").val().trim();
        let checkOutDate = $("#hotelCheckOutDate").val().trim();
        let checkOutTime = $("#hotelCheckOutTime").val().trim();
        let employees = $("#hotelAttendeeEmployees").val().join(",");

        let missingFields = [];
        missingFields = checkMissingFields(hotel, "hotel name", missingFields);
        missingFields = checkMissingFields(address, "hotel address", missingFields);
        missingFields = checkMissingFields(phone, "hotel phone number", missingFields);
        missingFields = checkMissingFields(reservationNumber, "reservation number", missingFields);
        missingFields = checkMissingFields(checkInDate, "check in date", missingFields);
        missingFields = checkMissingFields(checkInTime, "check in time", missingFields);
        missingFields = checkMissingFields(checkOutDate, "check out date", missingFields);
        missingFields = checkMissingFields(checkOutTime, "check out time", missingFields);
        missingFields = checkMissingFields(employees, "Employees", missingFields);

        if (missingFields.length > 0) {
            // At least one field is missing.
            alert('The following fields are required:\n\n' + missingFields.join(", "));
        }
        else {
            // All fields are available, let's first save the trip header
            let hotelId = $("#hotelId").val();
            let saveURL = `${parentURL}/trips/!/trips/${tripId}/hotel`;
            let checkIn = checkInDate + ' ' + checkInTime;
            let checkOut = checkOutDate + ' ' + checkOutTime;
            let result = await executeAjaxPost(saveURL, {
                hostingId: hotelId,
                tripId: tripId,
                hotel: hotel,
                address: address,
                phone: phone,
                reservationNumber: reservationNumber,
                checkIn: checkIn,
                checkOut: checkOut,
                employees: employees,
                senderId: UserId,
            });

            hotelId = result[0].Id;
            // Done, switch panels
            $("#panelHotelDetails").toggle();
            $("#panelTripFHTArrangements").toggle("fast", function () { $('#tblTripFHTArrangements').DataTable().ajax.reload(); });
            // clear employee select
            $('#hotelAttendeeEmployees').val([]);
            $('#hotelAttendeeEmployees').trigger("chosen:updated");
            $('#hotelAttendeeReservationNumber').val('');
            $('#hotelCheckInDate').val('');
            $('#hotelCheckInTime').val('');
            $('#hotelCheckOutDate').val('');
            $('#hotelCheckOutTime').val('');


        }
    });

    // Hotel edit panel cancel button
    $("#btnHotelCancel").on("click", async function () {
        // Show the flight details panel
        $("#panelHotelDetails").toggle();
        $("#panelTripFHTArrangements").toggle();
        $('#hotelAttendeeEmployees').val([]);
        $('#hotelAttendeeEmployees').trigger("chosen:updated");
        $('#hotelAttendeeReservationNumber').val('');
        $('#hotelCheckInDate').val('');
        $('#hotelCheckInTime').val('12:00 PM');
        $('#hotelCheckOutDate').val('');
        $('#hotelCheckOutTime').val('12:00 PM');
    });

    // Hotel edit panel delete button
    $("#btnHotelDelete").on("click", async function () {
        // Delete the hotel entry
        let hotelId = $("#hotelId").val();
        let deleteURL = `${parentURL}/trips/!/trips/${tripId}/hotel/${hotelId}?senderId=${UserId}`;
        await executeAjaxDelete(deleteURL);
        // Done, switch panels
        $("#panelHotelDetails").toggle();
        $("#panelTripFHTArrangements").toggle("fast", function () { $('#tblTripFHTArrangements').DataTable().ajax.reload(); });
    });

    /*** Transportation arrangements ***/

    // Add transportation arrangements button
    $("#btnAddTransport").on("click", async function () {
        // Init transportation arrangement data
        $("#transportationId").val("0");
        $("#transportationCompany").val("");
        $("#transportationLocation").val("");
        $("#transportationPhoneNumber").val("");
        $("#transportationConfirmationNumber").val("");
        $("#transportationPickupDate").val("");
        $("#transportationPickupTime").val("12:00 PM");
        $("#transportationDropOffDate").val("");
        $("#transportationDropOffTime").val("12:00 PM");
        $("#transportationEmployee").val([]);
        $('#transportationEmployee').trigger("chosen:updated");
        // Show the transportation arrangement panel
        $("#panelTripFHTArrangements").toggle();
        $("#panelTransportationDetails").toggle();
    });

    // Transportation edit panel cancel button
    $("#btnTransportationCancel").on("click", async function () {
        // Show the flight details panel
        $("#panelTransportationDetails").toggle();
        $("#panelTripFHTArrangements").toggle("fast", function () { $('#tblTripFHTArrangements').DataTable().ajax.reload(); });
    });

    // Transportation edit panel submit button
    $("#btnTransportationSubmit").on("click", async function () {
        // Check if required data is available
        let transportationCompany = $("#transportationCompany").val().trim();
        let transportationLocation = $("#transportationLocation").val().trim();
        let transportationPhoneNumber = $("#transportationPhoneNumber").val().trim();
        let transportationConfirmationNumber = $("#transportationConfirmationNumber").val().trim();
        let transportationPickupDate = $("#transportationPickupDate").val().trim();
        let transportationPickupTime = $("#transportationPickupTime").val().trim();
        let transportationDropOffDate = $("#transportationDropOffDate").val().trim();
        let transportationDropOffTime = $("#transportationDropOffTime").val().trim();
        let transportationEmployeeList = $("#transportationEmployee").val().join(",");

        let missingFields = [];
        if (transportationCompany === "") {
            missingFields.push('Company');
        }
        if (transportationLocation === "") {
            missingFields.push('Location');
        }
        if (transportationPhoneNumber === "") {
            missingFields.push('Company phone number');
        }
        if (transportationConfirmationNumber === "") {
            missingFields.push('Confirmation number');
        }
        if (transportationPickupDate === "") {
            missingFields.push('Pickup date');
        }
        if (transportationPickupTime === "") {
            missingFields.push('Pickup time');
        }
        if (transportationDropOffDate === "") {
            missingFields.push('Drop off date');
        }
        if (transportationDropOffTime === "") {
            missingFields.push('Drop off time');
        }

        if (missingFields.length > 0) {
            // At least one field is missing.
            alert('The following fields are required:\n\n' + missingFields.join(", "));
        }
        else {
            // All fields are available, save the transportation arrangements
            let transportationId = $("#transportationId").val();
            let saveURL = `${parentURL}/trips/!/trips/${tripId}/transportation?transportationId=${transportationId}&company=${transportationCompany}&location=${escape(transportationLocation)}&phoneNumber=${escape(transportationPhoneNumber)}&confirmationNumber=${escape(transportationConfirmationNumber)}&pickup=${transportationPickupDate + ' ' + transportationPickupTime}&dropOff=${transportationDropOffDate + ' ' + transportationDropOffTime}&employeeList=${transportationEmployeeList}&senderId=${UserId}`;
            let result = await executeAjaxPost(saveURL, {});
            // Done, switch panels
            $("#panelTransportationDetails").toggle();
            $("#panelTripFHTArrangements").toggle("fast", function () { $('#tblTripFHTArrangements').DataTable().ajax.reload(); });
        }
    });

    // Transportation edit panel delete button
    $("#btnTransportationDelete").on("click", async function () {
        // Delete the transportation arrangement
        let transportationId = $("#transportationId").val();
        let deleteURL = `${parentURL}/trips/!/trips/${tripId}/transportation/${transportationId}?senderId=${UserId}`;
        await executeAjaxDelete(deleteURL);
        // Done, switch panels
        $("#panelHotelDetails").toggle();
        $("#panelTripFHTArrangements").toggle("fast", function () { $('#tblTripFHTArrangements').DataTable().ajax.reload(); });
    });


    /**** Activity details ***/

    $("#btnBackToTripDetails").on("click", async function () {
        // Reset the activity details panel
        $("#panelActivityView").show();
        $("#panelActivityEdit").hide();
        $("#panelActivityAttendeeView").show();
        $("#panelActivityAttendeeEdit").hide();
        $("#panelActivityNotesView").show();
        // Return to trip details view
        $("#panelGeneralTrip").toggle("fast");
        $("#panelTripActivity").toggle("fast");
    });

    // click trip button "edit" switch from View to edit modes.
    $("#activityEditMode").on("click", async function () {
        // Pass to "edit" mode
        $("#panelActivityView").toggle("fast");
        $("#panelActivityEdit").toggle("fast");
    });

    // These functions refresh the activity entry details viewer
    async function refreshActivityViewMode() {
        let activityId = $("#detailsActivityId").val();
        let aUrl = `${parentURL}/trips/!/trips/${tripId}/itinerary/${activityId}`;
        $.ajax({
            url: aUrl,
            username: credentials.user,
            password: credentials.password,
            type: "GET",
            async: true,
            success: function (activity) {
                // Update view mode panel
                addFieldViewMode("Title: &nbsp;", unescape(activity.data.Title), "col-sm-12", true, "#activityViewModeContainer"); // First one clears the view panel
                addFieldViewMode("Start date: &nbsp;", formatDateTimeYYYYMMDDHHNN(activity.data.StartDate), "col-sm-12", false, "#activityViewModeContainer");
                addFieldViewMode("End date: &nbsp;", formatDateTimeYYYYMMDDHHNN(activity.data.EndDate), "col-sm-12", false, "#activityViewModeContainer");
                addFieldViewMode("Ativity type: &nbsp;", activity.data.ActivityTypeDesc, "col-sm-12", false, "#activityViewModeContainer");
                addFieldViewMode("Location: &nbsp;", activity.data.Location, "col-sm-12", false, "#activityViewModeContainer");
                addFieldViewMode("Address: &nbsp;", activity.data.Address, "col-sm-12", false, "#activityViewModeContainer");
                addFieldViewMode("Phone number: &nbsp;", activity.data.PhoneNumber, "col-sm-12", false, "#activityViewModeContainer");
                addFieldViewMode("Created: &nbsp;", formatDateTimeYYYYMMDDHHNN(activity.data.WhenCreated) + " by " + activity.data.WhoCreatedName, "col-sm-12", false, "#activityViewModeContainer");
                if (activity.data.WhoChanged != '') {
                    addFieldViewMode("Updated: &nbsp;", formatDateTimeYYYYMMDDHHNN(activity.data.WhenChanged) + " by " + activity.data.WhoChangedName, "col-sm-12", false, "#activityViewModeContainer");
                }
                // And while we're here, let's also update the edit box fields
                $("#detailsActivityLat").val(activity.data.Lat);
                $("#detailsActivityLong").val(activity.data.Long);
                $("#detailsActivityTitle").val(activity.data.Title);
                $("#detailsActivityStartDate").val(activity.data.StartDate.substr(0, 10));
                $("#detailsActivityStartTime").timepicker('setTime', getFormattedTimeAMPMfromString(activity.data.StartDate));
                $("#detailsActivityEndDate").val(activity.data.EndDate.substr(0, 10));
                $("#detailsActivityEndTime").timepicker('setTime', getFormattedTimeAMPMfromString(activity.data.EndDate));
                $("#detailsActivityType").val(activity.data.ActivityType);
                $("#detailsActivityLocation").val(activity.data.Location);
                $("#detailsActivityAddress").val(activity.data.Address);
                $("#detailsActivityPhoneNumber").val(activity.data.PhoneNumber);
                if (activity.data.Location === "") {
                    $("#chkActivityLocation").prop('checked', false);
                    $("#divActivityLocation").hide();
                }
                else {
                    $("#chkActivityLocation").prop('checked', true);
                    $("#divActivityLocation").show();
                }
                // Init the map container
                googleMapsInitialize("#detailsActivityLat", "#detailsActivityLong", "detailsActivityGeoMap");
            },
            error: function (data) {
                console.log('Ajax error refreshing view mode data after update.');
            }
        })
    }

    function setActivityDatatablesAjaxURL(activityId) {
        // Lets use the activity Id to assemble the URL
        let attendeesURL = `${parentURL}/trips/!/trips/${tripId}/itinerary/${activityId}/attendees`;
        $('#tblActivityAttendees').DataTable().ajax.url(attendeesURL);
        $('#tblActivityAttendees').DataTable().ajax.reload();

        let notesURL = `${parentURL}/notes/!/note?noteId=0&source=402&sourceId=${activityId}`;
        $('#tblActivityNotes').DataTable().ajax.url(notesURL);
        $('#tblActivityNotes').DataTable().ajax.reload();
    }

    // Form validation functions, this one returns the name of missing fields
    function validateActivityDetails() {
        // This var will hold the names of missing fields
        let missingFields = "";
        // Check trip title
        let value = $("#detailsActivityTitle").val().trim();
        if (value === "") {
            missingFields = missingFields + "Activity title\n";
        }
        // Check start date
        let startDate = $("#detailsActivityStartDate").val().trim();
        if (startDate === "") {
            missingFields = missingFields + "Start date\n";
        }
        // Check start time
        let startTime = $("#detailsActivityStartTime").val().trim();
        if (startTime === "") {
            missingFields = missingFields + "Start time\n";
        }
        // Check end date
        let endDate = $("#detailsActivityEndDate").val().trim();
        if (endDate === "") {
            missingFields = missingFields + "End date\n";
        }
        // Check end time
        let endTime = $("#detailsActivityEndTime").val().trim();
        if (endTime === "") {
            missingFields = missingFields + "End time\n";
        }
        // Check that the end date is later or equal than the start date
        if ((startDate != "") && (startTime != "") & (endDate != "") && (endTime != "")) {
            let startDateTime = new Date(startDate + " " + startTime);
            let endDateTime = new Date(endDate + " " + endTime);
            if (endDateTime <= startDateTime) {
                missingFields = missingFields + "End date/time must be greater than start date/time\n";
            }
        }
        // return whatever is missing
        return missingFields.trim();
    }

    // When clicking "Specify activity location" checkbox, activity location panel gets toggled
    $("#chkActivityLocation").on("change", function () {
        if ($(this).is(":checked")) {
            // Hide the "end date" section
            $("#divActivityLocation").show();
        }
        else {
            $("#divActivityLocation").hide();
        }
    });

    // Edit trip submit and cancel OnClick functions
    $("#detailsActivitySubmit").on("click", async function () {
        // Validate that required fields are complete
        let validationResult = validateActivityDetails();
        if (validationResult === "") {
            // Data is valid
            let activityId = $("#detailsActivityId").val();
            let title = $("#detailsActivityTitle").val().trim();
            let startDateTime = new Date($("#detailsActivityStartDate").val().trim() + " " + $("#detailsActivityStartTime").val().trim());
            let paramStartDateTime = getFormattedDateTime(startDateTime);
            let endDateTime = new Date($("#detailsActivityEndDate").val().trim() + " " + $("#detailsActivityEndTime").val().trim());
            let paramEndDateTime = getFormattedDateTime(endDateTime);
            let activityType = $("#detailsActivityType").val();
            let locationDetails = "";
            let lat = "";
            let long = "";
            let address = "";
            let phoneNumber = "";
            if ($("#chkActivityLocation").is(":checked")) {
                locationDetails = $("#detailsActivityLocation").val();
                lat = $("#detailsActivityLat").val();
                long = $("#detailsActivityLong").val();
                address = $("#detailsActivityAddress").val();
                phoneNumber = $("#detailsActivityPhoneNumber").val();
                long = $("#detailsActivityLong").val();
            }
            // Assemble the request URL
            let saveURL = `${parentURL}/trips/!/trips/${tripId}/itinerary?activityId=${activityId}&title=${escape(title)}&startDate=${paramStartDateTime}&endDate=${paramEndDateTime}&activityType=${activityType}&locationDetails=${escape(locationDetails)}&lat=${lat}&long=${long}&address=${escape(address)}&phoneNumber=${phoneNumber}&senderId=${UserId}`;
            // Save the trip
            let result = await executeAjaxPost(saveURL, {});
            // Check if the activity needs to be synced
            if (syncWithOutlook) {
                // Sync with whoever is added to the activity / trip
                let outlookSyncURL = `${parentURL}/trips/!/trips/${(tripId)}/syncUpdate?tripCalendarId=${result[0].ID}&employeeId=0`;
                await executeAjaxPost(outlookSyncURL, {})
            }
            // Reload the calendar
            $('#calendar').fullCalendar('refetchEvents');
            // Refresh the actvity view mode
            refreshActivityViewMode();
            // If we added a new activity, go back to trip details
            if (activityId === "0") {
                // Hides the activity edit panel, returns to trip details
                $("#panelGeneralTrip").toggle("fast");
                $("#panelTripActivity").toggle("fast");
            }
            else {
                // Hide the activity edit panel, show the activity view panel
                $("#panelActivityView").toggle("fast");
                $("#panelActivityEdit").toggle("fast");
            }
        }
        else {
            // Failed validation
            alert("Some fields failed to pass validation:\n\n" +
                validationResult);
        }
    });

    // Trip activity delete
    $("#detailsActivityDelete").on("click", async function () {
        // We'll need this var to delete the activity
        let tripCalendarId = $("#detailsActivityId").val();
        // Check of outlook syncing is enabled
        if (syncWithOutlook) {
            // Remove the activity from all registered employee calendars
            let outlookSyncURL = `${parentURL}/trips/!/trips/${tripId}/syncDelete?tripCalendarId=${tripCalendarId}&employeeId=0`;
            await executeAjaxDelete(outlookSyncURL, {})
        }
        // Delete the note 
        let deleteURL = `${parentURL}/trips/!/trips/${tripId}/itinerary/${tripCalendarId}`;
        await executeAjaxDelete(deleteURL);
        // Hide the activity panel, show the trip view panel
        $("#panelGeneralTrip").toggle("fast");
        $("#panelTripActivity").toggle("fast");
        $('#calendar').fullCalendar('refetchEvents');
    });

    // Activity attendees datatable
    let activityAttendeesAjaxURL = `${parentURL}/trips/!/trips/${tripId}/itinerary/0/attendees`;

    $('#tblActivityAttendees').DataTable({
        dom: "frtip",
        ajax: activityAttendeesAjaxURL,
        username: credentials.user,
        password: credentials.password,
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
                "className": "never text-nowrap dt-center",
                "render": function (data, type, row) {
                    let result = ""
                    if (data === 2) {
                        result = '<span class="fa fa-address-book-o"></span>'
                    }
                    return result;
                }
            },
            {
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
                "data": "ExternalCompanyName",
                "className": "text-nowrap attendee-data",
                "render": function (data, type, row) {
                    let result = "";
                    if (row.ExternalCompanyId > 0) {
                        result = `<a href="./companydetails.html?companyId=${row.ExternalCompanyId}">${row.ExternalCompanyName}</a>`;
                    }
                    if (row.email != "") {
                        result = result + `<div class="row"><a href="mailto:${row.email}">${row.email}</a></div>`;
                    }
                    if (row.PhoneNumber != "") {
                        result = result + `<div class="row">${row.PhoneNumber}</div>`;
                    }
                    return result;
                }
            },
            {
                "data": "AllActivities",
                "className": "text-nowrap attendee-data dt-center",
                "render": function (data, type, row) {
                    let result = ""
                    if (data === 1) {
                        result = '<span class="fa fa-check"></span>'
                    }
                    return result;
                }
            }
        ],
        "columnDefs": [
            {
                "targets": [0],
                "visible": true,
                "searchable": false
            },
            {
                "targets": [1],
                "visible": true,
                "searchable": true
            },
            {
                "targets": [2],
                "visible": true,
                "searchable": true
            },
            {
                "targets": [3],
                "visible": true,
                "searchable": false
            }
        ]
    });

    // Clicking on the notes table will toggle the edit note panel
    $('#tblActivityAttendees tbody').on('click', '.attendee-data', function () {
        // Check if logged user is admin; otherwise just ignore him
        if (UserIsAdmin) {
            // Get the row's data
            let data = $("#tblActivityAttendees").DataTable().row(this).data();
            // Check if the contact was added as "All activities" on a trip level
            if (data.AllActivities === 0) {
                // Prep up the edit panel
                $('#editActivityAttendeeId').val(data.AttendeeId);
                $('#editActivityAttendeeTypeId').val(data.AttendeeType);
                $('#editActivityAttendeeType').val(data.AttendeeType);
                if (data.AttendeeType === 1) {
                    // Employee
                    $("#divEditActivityAttendeeEmployee").show();
                    $("#divEditActivityAttendeeContact").hide();
                    $("#editActivityAttendeeEmployee").val(data.AttendeeId);
                } else {
                    // Contact
                    $("#divEditActivityAttendeeEmployee").hide();
                    $("#divEditActivityAttendeeContact").show();
                    $("#editActivityAttendeeContact").val(data.AttendeeId);
                }
                // Toggle view/edit panels
                $("#panelActivityAttendeeView").toggle("fast");
                $("#panelActivityAttendeeEdit").toggle("fast");
            }
        }
    });

    // Attendee related functions
    $("#btnAddActivityAttendee").on("click", async function () {
        // Add new attendee, let's assume it is an employee
        $("#editActivityAttendeeId").val("");
        $("#editActivityAttendeeTypeId").val("");
        $("#editActivityAttendeeType").val("1");
        $("#editActivityAttendeeEmployee").val("");
        $("#editActivityAttendeeContact").val("");
        $("#divEditActivityAttendeeEmployee").show();
        $("#divEditActivityAttendeeContact").hide();
        // Toggle view/edit panels
        $("#panelActivityAttendeeView").toggle("fast");
        $("#panelActivityAttendeeEdit").toggle("fast");
    });

    $("#editActivityAttendeeType").on('change', function () {
        if ($(this).val() === "1") {
            $("#divEditActivityAttendeeEmployee").show();
            $("#divEditActivityAttendeeContact").hide();
        } else {
            $("#divEditActivityAttendeeEmployee").hide();
            $("#divEditActivityAttendeeContact").show();
        }
    });

    $("#btnActivityAttendeeSubmit").on("click", async function () {
        // We'll need this vars to save the attendee
        let attendeeType = $("#editActivityAttendeeType").val();
        let attendeeId;
        // Check if we're adding an employee or a contact
        if (attendeeType == "1") {
            // Employee, check one is selected
            attendeeId = $("#editActivityAttendeeEmployee").val();
        }
        else {
            // Contact, check one is selected
            attendeeId = $("#editActivityAttendeeContact").val();
        }
        // Check if the attendee name was selected
        if (attendeeId != "") {
            // Assemble the POST URL
            let saveURL = `${parentURL}/trips/!/trips/${tripId}/itinerary/${$("#detailsActivityId").val()}/attendees?attendeeId=${attendeeId}&attendeeType=${attendeeType}&senderId=${UserId.toString()}`;
            // Save the activity attendee
            let result = await executeAjaxPost(saveURL, {});
            // Check if we need to sync
            if ((attendeeType == "1") && (syncWithOutlook)) {
                // Sync the activity
                await outlookUpdate($("#detailsTripId").val(), $("#detailsActivityId").val(), attendeeId);
            }
            // Check if there was a change of contact/employee name and type; if that's the case then
            // we need to delete the previous one
            let oldAttendeeId = $("#editActivityAttendeeId").val();
            let oldAttendeeType = $("#editActivityAttendeeTypeId").val();
            if ((oldAttendeeId != "") && (oldAttendeeType != "")) {
                // Compare it with the saved data
                if ((oldAttendeeId != attendeeId) || (oldAttendeeType != attendeeType)) {
                    // Type or attendee changed, lets delete 
                    let activityId = $("#detailsActivityId").val();
                    let deleteURL = `${parentURL}/trips/!/trips/${tripId}/itinerary/${activityId}/attendees?attendeeId=${oldAttendeeId}&attendeeType=${oldAttendeeType}`;
                    result = await executeAjaxDelete(deleteURL);
                }
            }
            $("#editActivityAttendeeTypeId").val("");
            // Toggle view/edit panels
            $("#panelActivityAttendeeEdit").toggle("fast");
            $("#panelActivityAttendeeView").toggle("fast", function () { $('#tblActivityAttendees').DataTable().ajax.reload(); });
        }
        else {
            // No contact or employee selected
            alert("Please select the attendee name.");
        }
    });

    $("#btnActivityAttendeeDelete").on("click", async function () {
        // We'll need this vars to save the attendee
        let attendeeType = $("#editActivityAttendeeType").val();
        let attendeeId;
        // Check if we're adding an employee or a contact
        if (attendeeType === "1") {
            // Employee, check one is selected
            attendeeId = $("#editActivityAttendeeEmployee").val();
        }
        else {
            // Contact, check one is selected
            attendeeId = $("#editActivityAttendeeContact").val();
        }
        // Check if the attendee name was selected
        if (attendeeId != "") {
            // Assemble the POST URL
            let activityId = $("#detailsActivityId").val();
            let deleteURL = `${parentURL}/trips/!/trips/${tripId}/itinerary/${activityId}/attendees?attendeeId=${attendeeId}&attendeeType=${attendeeType}`;
            // Delete the activity attendee
            let result = await executeAjaxDelete(deleteURL);
            $("#editActivityAttendeeTypeId").val("");
            // Toggle view/edit panels
            $("#panelActivityAttendeeEdit").toggle("fast");
            $("#panelActivityAttendeeView").toggle("fast", function () { $('#tblActivityAttendees').DataTable().ajax.reload(); });
        }
        else {
            // No contact or employee selected
            alert("Please select the attendee name.");
        }
    });

    $("#btnActivityAttendeeCancel").on("click", async function () {
        // Toggle view/edit panels
        $("#panelActivityAttendeeEdit").toggle("fast");
        $("#panelActivityAttendeeView").toggle("fast", function () { $('#tblActivityAttendees').DataTable().ajax.reload(); });
    });

    // Trip attendee delete
    $("#btnActivityAttendeeDelete").on("click", async function () {
        // We'll need this vars to delete the attendee
        let tripCalendarId = $("#detailsActivityId").val();
        let attendeeType = $("#editActivityAttendeeTypeId").val();
        let attendeeId = $("#editActivityAttendeeId").val();
        // Delete the attendee 
        let deleteURL = `${parentURL}/trips/!/trips/${tripId}/itinerary/${tripCalendarId}/attendees?attendeeId=${attendeeId}&attendeeType=${attendeeType}`;
        await executeAjaxDelete(deleteURL);
        // Toggle view/edit panels
        $("#panelActivityAttendeeEdit").toggle("fast");
        $("#panelActivityAttendeeView").toggle("fast", function () {
            $('#tblActivityAttendees').DataTable().ajax.reload();
        });
    });

    /* Notes */

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

    // -> General trip notes 

    let notesAjaxURL = `${parentURL}/notes/!/note?noteId=0&source=400&sourceId=${tripId}`;

    // Enable rich text editor
    $('#editNoteText').jqte();

    // Notes datatable

    $('#tblNotes').DataTable({
        dom: "frtip",
        ajax: notesAjaxURL,
        username: credentials.user,
        password: credentials.password,
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
                    let sourceType = '';
                    switch (data) {
                        case 400:
                            sourceType = "Trip"
                            break;
                        case 401:
                            sourceType = "Trip (general)"
                            break;
                        case 402:
                            sourceType = "Trip (activity)"
                            break;
                        case 403:
                            sourceType = "Trip (flight)"
                            break;
                        case 404:
                            sourceType = "Trip (hotel)"
                            break;
                        case 405:
                            sourceType = "Trip (transportation)"
                            break;
                    }
                    return sourceType;
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
                        let ellipsis = "";
                        if (data.length > 250) {
                            ellipsis = "..."
                        }
                        let preview = data.substr(0, 250);
                        response = response +
                            '<div class="row">' +
                            preview.split(String.fromCharCode(10)).join("<br/>") + ellipsis +
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
                className: "never text-nowrap dt-center note-email dt-align-top",
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

    // Set activity notes datatable. Please note that the AJAX URL will be changed at
    // runtime, given the selected activity
    $('#tblActivityNotes').DataTable({
        dom: "frtip",
        ajax: `${parentURL}/notes/!/note?noteId=0&source=402&sourceId=0`,
        username: credentials.user,
        password: credentials.password,
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
                    return "Trip activity"
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
                        let ellipsis = "";
                        if (data.length > 250) {
                            ellipsis = "..."
                        }
                        let preview = data.substr(0, 250);
                        response = response +
                            '<div class="row">' +
                            preview.split(String.fromCharCode(10)).join("<br/>") + ellipsis +
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

    // Send note by email functionality
    $('#tblNotes tbody').on('click', '.note-email', function () {
        // Get the row's data
        let data = $("#tblNotes").DataTable().row(this).data();
        $("#emailNoteId").val(data.NoteId);
        // Retrieve linked employees / contacts
        $.ajax({
            url: `${parentURL}/notes/!/note/${data.NoteId}/attendees}`,
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
        let noteId = $("#emailNoteId").val();
        let recipientList = $("#emailNoteRecipients").val().join(",");
        if (recipientList !== "") {
            // Got the recipient list, let's send the email
            let sendEmailURL = `${parentURL}/notes/!/note/${noteId}/sendEmail?recipients=${recipientList}`;
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

    // Send activity note by email functionality
    $('#tblActivityNotes tbody').on('click', '.note-email', function () {
        // Get the row's data
        let data = $("#tblActivityNotes").DataTable().row(this).data();
        $("#emailActivityNoteId").val(data.NoteId);
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
                    $("#emailActivityNoteRecipients").val(linkedEmployees);
                    // Need to call this so that chosen selectors gets refreshed
                    $('#emailActivityNoteRecipients').trigger("chosen:updated");
                }
            }
        });
        // Toggle the email send panel
        $("#panelActivityNotesView").toggle("fast");
        $("#panelActivityNotesEmail").toggle("fast");
    });

    $("#btnActivityNoteEmailSend").on("click", function () {
        // Check if there are recipients selected
        let recipientList = $("#emailActivityNoteRecipients").val().join(",");
        if (recipientList !== "") {
            // Got the recipient list, let's send the email
            let noteId = $("#emailActivityNoteId").val();
            let sendEmailURL = `${parentURL}/notes/!/note/${noteId}/sendEmail?recipients=${recipientList}`;
            let result = executeAjaxPost(sendEmailURL, {});
            // Done here...
            alert("Email has been sent.")
            // Toggle panels
            $("#panelActivityNotesEmail").toggle("fast", () => { $("#panelActivityNotesView").toggle("fast"); });
        }
        else {
            alert("Please select the email recipients.")
        }
    });

    $("#btnActivityNoteEmailCancel").on("click", function () {
        // Cancel, toggle the panels without doing anything
        $("#panelActivityNotesEmail").toggle("fast", () => { $("#panelActivityNotesView").toggle("fast"); });
    });

    // Note fields handling
    function initNoteFields(source, sourceId) {
        // Init note contents
        $('#editNoteText').jqteVal("");
        // Prepare note type selector
        $("#editNoteType").empty();
        if (source == "Trip") {
            // Trip (General)
            $("#editNoteType").append('<option value="401">General trip notes</option>');
            $("#editNoteType").append('<option value="403">Trip/flight notes</option>');
            $("#editNoteType").append('<option value="404">Trip/hotel notes</option>');
            $("#editNoteType").append('<option value="405">Trip/transportation notes</option>');
        }
        else {
            // Trip (Activity)
            $("#editNoteType").append('<option value="402">Trip activity</option>');
        }
        // Init the note fields
        $("#editNoteId").val("0"); // New note id
        $("#editNoteSource").val(source); // New note id
        $("#editNoteSourceId").val(sourceId); // Note source, either trip or trip activity id
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
    }

    function loadNoteFields(source, data) {
        // Prepare note type selector
        $("#editNoteType").empty();
        if (source == "Trip") {
            // Trip (General)
            $("#editNoteType").append('<option value="401">General trip notes</option>');
            $("#editNoteType").append('<option value="403">Trip/flight notes</option>');
            $("#editNoteType").append('<option value="404">Trip/hotel notes</option>');
            $("#editNoteType").append('<option value="405">Trip/transportation notes</option>');


        }
        else {
            // Trip (Activity)
            $("#editNoteType").append('<option value="402" selected>Trip activity</option>');
        }
        // Prep up the edit panel
        $('#editNoteId').val(data.NoteId);
        $('#editNoteSource').val(source);
        $('#editNoteSourceId').val(data.SourceId);
        $("#AttachmentNoteId").val(data.NoteId);
        $("AttachmentNoteTempPath").val("");
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
                $("#editNoteWhoCreated").val(noteDetails.data[0].WhoCreatedName + " on " + noteDetails.data[0].WhenCreated.substr(0, 10) + " " + noteDetails.data[0].WhenCreated.substr(11, 8));
                $('#editNoteText').jqteVal(noteDetails.data[0].Note);
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
    }

    // Clicking on the notes "note-data" columns will toggle the edit note panel
    $('#tblNotes tbody').on('click', '.note-data', function () {
        // Check if logged user is admin; otherwise just ignore him
        if (UserIsAdmin) {
            // Get the row's data
            let data = $("#tblNotes").DataTable().row(this).data();
            // Load the note contents
            loadNoteFields("Trip", data);
            // Toggle the panels
            $("#tripView").toggle("fast");
            $("#panelNotesEdit").toggle("fast");
        }
    });

    // Clicking on the notes "note-data" columns will toggle the edit note panel
    $('#tblActivityNotes tbody').on('click', '.note-data', function () {
        // Check if logged user is admin; otherwise just ignore him
        if (UserIsAdmin) {
            // Get the row's data
            let data = $("#tblActivityNotes").DataTable().row(this).data();
            // Load the note contents
            loadNoteFields("Activity", data);
            // Toggle the panels
            $("#tripView").toggle("fast");
            $("#panelNotesEdit").toggle("fast");
        }
    });

    // Click event for "New note" button
    $("#btnAddNote").on("click", function () {
        // Init note fields
        initNoteFields("Trip", tripId);
        // Toggle notes panels
        $("#tripView").toggle("fast");
        $("#panelNotesEdit").toggle("fast");
    });

    // Click event for "New note" button
    $("#btnAddActivityNote").on("click", function () {
        // Init note fields
        initNoteFields("Activity", $("#detailsActivityId").val());
        // Toggle notes panels
        $("#tripView").toggle("fast");
        $("#panelNotesEdit").toggle("fast");
    });

    // Click event for "Submit" button on note edit panel
    $("#btnNoteSubmit").on("click", async function () {
        // Retrieve note content, make sure there is something to be stored
        let notes = $('#editNoteText').val();
        if (notes != "") {
            // Get remaining params
            let noteId = $("#editNoteId").val();
            let noteSource = $("#editNoteSource").val();
            let noteSourceId = $("#editNoteSourceId").val();
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
                await executeAjaxPost(saveURL, {});
                // Check if there are attachments
                if (noteAttachments.length > 0) {
                    // If this is a new note and attachments were added, we need to make sure that they get 
                    // transferred from the temporary folder to the new note attachment folder
                    if (isNewNote) {
                        let attachmentTempPath = $("#AttachmentNoteTempPath").val()
                        let saveAttachmentsURL = `${parentURL}/notes/!/note/${noteId}/saveTempAttachments/${attachmentTempPath}`;
                        await executeAjaxPost(saveAttachmentsURL, {});
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
                $("#tripView").toggle("fast", function () {
                    if (noteSource == "Trip") {
                        $('#tblNotes').DataTable().ajax.reload();
                    }
                    else {
                        $('#tblActivityNotes').DataTable().ajax.reload();
                    }
                });
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
        // Who called this?
        let noteSource = $("#editNoteSource").val();
        // Clear our voice notes
        clearVoiceNoteContainer("#voiceNoteList");
        // Check if this is was a new note and attachments were added.
        if ($("#editNoteId").val() === "0") {
            // Make sure that the temporary attachment upload folder gets cleared
            let attachmentTempPath = $("#AttachmentNoteTempPath").val();
            let deleteURL = `${parentURL}/notes/!/note/clearAttachmentFolder/${attachmentTempPath}`;
            executeAjaxDelete(deleteURL);
        }
        // Toggle notes panels
        $("#panelNotesEdit").toggle("fast");
        $("#tripView").toggle("fast", function () {
            if (noteSource == "Trip") {
                $('#tblNotes').DataTable().ajax.reload();
            }
            else {
                $('#tblActivityNotes').DataTable().ajax.reload();
            }
        });
    });

    // Note delete
    $("#btnNoteDelete").on("click", async function () {
        // Who called this?
        let noteSource = $("#editNoteSource").val();
        // We'll need this var to delete the note
        let noteId = $("#editNoteId").val();
        // Delete the note 
        let deleteURL = `${parentURL}/notes/!/note?noteId=${noteId}`;
        result = await executeAjaxDelete(deleteURL);
        // Toggle view/edit panels
        $("#panelNotesEdit").toggle("fast");
        $("#tripView").toggle("fast", function () {
            if (noteSource == "Trip") {
                $('#tblNotes').DataTable().ajax.reload();
            }
            else {
                $('#tblActivityNotes').DataTable().ajax.reload();
            }
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
                        addFileToAttachmentsContainer(notePath, item, attachments.data[item]);
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

    /* Itinerary print to PDF related */
    let fonts = {
        Roboto: {
            normal: '/s/fonts/Roboto-Regular.ttf',
            bold: '/s/fonts/Roboto-Medium.ttf',
            italics: '/s/fonts/Roboto-Italic.ttf',
            bolditalics: '/s/fonts/Roboto-MediumItalic.ttf'
        }
    };

    function getLocationTimezone(lat, long, referenceDateTime) {
        // Check if there is a location specified for the trip
        let timezoneURL = `${parentURL}/trips/!/GoogleTimezone`;
        let tripTimeZone = "";
        // Got a location, retrieve it's timezone
        let startDateTime = new Date(referenceDateTime + " 00:00:00");
        $.ajax({
            url: `${timezoneURL}?lat=${lat}&long=${long}&date=${getFormattedDateTime(startDateTime)}`,
            username: credentials.user,
            password: credentials.password,
            dataType: 'json',
            async: false,
            success: function (timezoneData) {
                if (timezoneData !== {}) {
                    tripTimeZone = timezoneData.timeZoneName;
                }
            }
        })
        return tripTimeZone;
    }

    $("#btnPrintItinerary").on("click", function () {
        // Check if we have a general trip location, if so we'll use it to determine it's timezone
        let tripTimezone = "";
        if (($("#detailsLat").val().trim() !== "") && ($("#detailsLat").val().trim() !== "")) {
            tripTimezone = getLocationTimezone($("#detailsLat").val().trim(),
                $("#detailsLong").val().trim(),
                $("#detailsStartDate").val().trim());
        }
        // Let's start by getting flight details
        let flights = [];
        $.ajax({
            url: `${parentURL}/trips/!/trips/${$("#detailsTripId").val().trim()}/flights/0`,
            username: credentials.user,
            password: credentials.password,
            dataType: 'json',
            async: false,
            success: function (flight) {
                if (flight.data.length > 0) {
                    // Setup an array to hold flight passengers
                    let flightAttendees;
                    // Traverse through the flights
                    for (let i = 0; i < flight.data.length; i++) {
                        // Init flight passenger (attendees) array
                        flightAttendees = [];
                        // Get the passenger list
                        $.ajax({
                            url: `${parentURL}/trips/!/trips/${$("#detailsTripId").val().trim()}/flights/${flight.data[i].FlightId}/attendees`,
                            username: credentials.user,
                            password: credentials.password,
                            dataType: 'json',
                            async: false,
                            success: function (attendees) {
                                for (let index = 0; index < attendees.data.length; index++) {
                                    flightAttendees.push({
                                        employeeName: attendees.data[index].EmployeeName,
                                        confirmationNumber: attendees.data[index].ConfirmationNumber,
                                        seat: attendees.data[index].Seat
                                    });
                                }
                            }
                        })
                        // Save the trip data
                        flights.push({
                            airline: flight.data[i].Airline,
                            flightNumber: flight.data[i].FlightNumber,
                            depAirport: flight.data[i].DepartureAirport,
                            depAddress: flight.data[i].DepartureAddress,
                            depPhone: flight.data[i].DeparturePhone,
                            departure: flight.data[i].DepartureDateTime,
                            arrAirport: flight.data[i].ArrivalAirport,
                            arrAddress: flight.data[i].ArrivalAddress,
                            arrPhone: flight.data[i].ArrivalPhone,
                            arrival: flight.data[i].ArrivalDateTime,
                            employees: flightAttendees
                        });
                    }
                }
            }
        });
        // Retrieve hotel arrangements
        let hotels = [];
        $.ajax({
            url: `${parentURL}/trips/!/trips/${$("#detailsTripId").val().trim()}/hotel/0`,
            username: credentials.user,
            password: credentials.password,
            dataType: 'json',
            async: false,
            success: function (hotel) {
                if (hotel.data.length > 0) {
                    // Setup an array to hold hotel guests
                    let hotelAttendees;
                    // Traverse through the hotels
                    for (let i = 0; i < hotel.data.length; i++) {
                        // Save the hotel data
                        hotels.push({
                            hotel: hotel.data[i].Hotel,
                            address: hotel.data[i].Address,
                            phone: hotel.data[i].Phone,
                            confirmation: hotel.data[i].ReservationNumber,
                            checkIn: hotel.data[i].CheckIn,
                            checkOut: hotel.data[i].CheckOut,
                            employees: hotel.data[i].EmployeeNames.split(", ")
                        });
                    }
                }
            }
        });
        // Retrieve transportation arrangements
        let transports = [];
        $.ajax({
            url: `${parentURL}/trips/!/trips/${$("#detailsTripId").val().trim()}/transportation/0`,
            username: credentials.user,
            password: credentials.password,
            dataType: 'json',
            async: false,
            success: function (transport) {
                if (transport.data.length > 0) {
                    // Setup an array to hold transportation attendees
                    let transportAttendees;
                    // Traverse through the transportation arrangements
                    for (let i = 0; i < transport.data.length; i++) {
                        // Init transportation attendees array
                        transportAttendees = [];
                        // Get the employee list
                        $.ajax({
                            url: `${parentURL}/trips/!/trips/${$("#detailsTripId").val().trim()}/transportation/${transport.data[i].TransportationId}/attendees`,
                            username: credentials.user,
                            password: credentials.password,
                            dataType: 'json',
                            async: false,
                            success: function (attendees) {
                                for (let index = 0; index < attendees.data.length; index++) {
                                    transportAttendees.push({
                                        employeeName: attendees.data[index].LastName + " " + attendees.data[index].FirstName,
                                    });
                                }
                            }
                        })
                        // Save transportation arrangement details
                        transports.push({
                            company: transport.data[i].Company,
                            location: transport.data[i].Location,
                            phone: transport.data[i].PhoneNumber,
                            confirmationNumber: transport.data[i].ConfirmationNumber,
                            pickup: transport.data[i].Pickup,
                            dropOff: transport.data[i].DropOff,
                            employees: transportAttendees
                        });
                    }
                }
            }
        });

        // Then let's retrieve the trip's itinerary, ignoring "Flight" events; we'll hold relevant data on an array
        let activities = [];
        $.ajax({
            url: `${parentURL}/trips/!/trips/${$("#detailsTripId").val().trim()}/itinerary`,
            username: credentials.user,
            password: credentials.password,
            dataType: 'json',
            async: false,
            success: function (events) {
                if (events !== null) {
                    let activityTimezone;
                    let activityAttendees = [];
                    for (let index = 0; index < events.length; index++) {
                        // Let's ignore Flight activities, these get printed on a section of their own
                        if (events[index].ActivityType !== 1) {
                            // Check if the activity has location info
                            if ((events[index].Lat != "") && (events[index].Long != "")) {
                                activityTimezone = getLocationTimezone(events[index].Lat,
                                    events[index].Long,
                                    events[index].StartDate.toString().substr(0, 10));
                            }
                            else {
                                activityTimezone = tripTimezone;
                            }
                            // Get the activity attendees
                            activityAttendees = [];
                            $.ajax({
                                url: `${parentURL}/trips/!/trips/${$("#detailsTripId").val().trim()}/itinerary/${events[index].TripCalendarId}/attendees`,
                                username: credentials.user,
                                password: credentials.password,
                                dataType: 'json',
                                async: false,
                                success: function (attendees) {
                                    for (let index = 0; index < attendees.data.length; index++) {
                                        activityAttendees.push({
                                            contactName: attendees.data[index].FirstName + " " + attendees.data[index].LastName
                                        });
                                    }
                                }
                            })
                            if (activityAttendees.length == 0) {
                                activityAttendees.push({
                                    contactName: ""
                                });
                            }
                            // Add the activity
                            activities.push({
                                id: events[index].TripCalendarId,
                                title: events[index].Title,
                                start: events[index].StartDate,
                                end: events[index].EndDate,
                                activityType: events[index].ActivityTypeDesc,
                                location: events[index].Location,
                                address: events[index].Address,
                                phoneNumber: events[index].PhoneNumber,
                                activityTimezone: activityTimezone,
                                attendees: activityAttendees
                            });
                        }
                    }
                }
            }
        });
        // Let's then retrieve the attendees for the trip directory
        let tripAttendees = [];
        $.ajax({
            url: `${parentURL}/trips/!/trips/${$("#detailsTripId").val().trim()}/attendeesPDF`,
            username: credentials.user,
            password: credentials.password,
            dataType: 'json',
            async: false,
            success: function (attendees) {
                if (attendees.data.length > 0) {
                    attendees.data.forEach(function (attendee) {
                        tripAttendees.push(attendee);
                    })
                }
            }
        });

        // Retrieve flight notes
        let flightNotes = [];
        $.ajax({
            url: `${parentURL}/trips/!/trips/${$("#detailsTripId").val().trim()}/notes/source/403`,
            username: credentials.user,
            password: credentials.password,
            dataType: 'json',
            async: false,
            success: function (notes) {
                if (notes.data) {
                    flightNotes.push([{ text: 'Flight notes:', fontSize: 8, bold: true }]);
                    for (let i = 0; i < notes.data.length; i++) {
                        flightNotes.push([{ text: notes.data[i].NoteText, fontSize: 8 }]);
                    }
                }
                else flightNotes.push(['']);
            }
        });

        // Retrieve hotel notes
        let hotelNotes = [];
        $.ajax({
            url: `${parentURL}/trips/!/trips/${$("#detailsTripId").val().trim()}/notes/source/404`,
            username: credentials.user,
            password: credentials.password,
            dataType: 'json',
            async: false,
            success: function (notes) {
                if (notes.data) {
                    hotelNotes.push([{ text: 'Hotel notes:', fontSize: 8, bold: true }]);
                    for (let i = 0; i < notes.data.length; i++) {
                        hotelNotes.push([{ text: notes.data[i].NoteText, fontSize: 8 }]);
                    }
                }
                else hotelNotes.push(['']);
            }
        });

        // Retrieve transportation notes
        let transportationNotes = [];
        $.ajax({
            url: `${parentURL}/trips/!/trips/${$("#detailsTripId").val().trim()}/notes/source/405`,
            username: credentials.user,
            password: credentials.password,
            dataType: 'json',
            async: false,
            success: function (notes) {
                if (notes.data) {
                    transportationNotes.push([{ text: 'Transportation notes:', fontSize: 8, bold: true }]);
                    for (let i = 0; i < notes.data.length; i++) {
                        transportationNotes.push([{ text: notes.data[i].NoteText, fontSize: 8 }]);
                    }
                }
                else transportationNotes.push(['']);
            }
        });

        // this vars will hold the PDF's components
        let pdfMetadata = {
            title: $("#detailsTitle").val(),
            author: "YAMMM",
            subject: "Trip itinerary",
            keywords: ""
        };

        let pdfPageSize = 'LETTER';

        let pdfPageOrientation = 'portrait';

        let pdfPageMargins = [40, 80, 40, 60]; // left, top, right, bottom

        let pdfHeader = {
            table: {
                headerRows: 0,
                widths: [120, '*'],
                body: [
                    [{
                        image: "data:image/jpeg;base64,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",
                        fit: [100, 100]
                    },
                    {
                        text: $("#detailsTitle").val(),
                        alignment: 'right'
                    }]
                ]
            },
            layout: 'noBorders',
            margin: [40, 20, 40] // left, top; header starts with no top/left margins regardless of what specified by the document's margin settings
        }

        let pdfTripDetails = {
            table: {
                headerRows: 0,
                widths: [100, '*'],
                body: []
            },
            layout: 'noBorders'
        }
        pdfTripDetails.table.body.push(['Starts',
            $('#detailsStartDate').val()]);
        pdfTripDetails.table.body.push(['Ends',
            $('#detailsEndDate').val()]);
        if ($("#detailsCompany").val() !== "") {
            pdfTripDetails.table.body.push(['Internal company',
                $("#detailsCompany option[value='" + $("#detailsCompany").val() + "']").text()]);
        }
        if ($("#chkTripLocation").is(":checked")) {
            pdfTripDetails.table.body.push(['Location',
                $('#detailsLocation').val()]);
        }

        let pdfFlights = {};
        if (flights.length > 0) {
            let flightRows = [];
            let employees = [];
            flights.forEach(function (flight) {
                employees = [];
                if (flight.employees.length > 0) {
                    employees = [{
                        table: {
                            headerRows: 1,
                            widths: [100, 100, "*"],
                            layout: 'noBorders',
                            body: [
                                [{ text: "Name", alignment: "center", fillColor: "#eeeeee", bold: true },
                                { text: "Confirmation", alignment: "center", fillColor: "#eeeeee", bold: true },
                                { text: "Seat", alignment: "center", fillColor: "#eeeeee", bold: true }]
                            ]
                        },
                    }];

                    flight.employees.forEach(function (employee) {
                        employees[0].table.body.push(
                            [employee.employeeName,
                            employee.confirmationNumber,
                            employee.seat]
                        )
                    });
                }
                flightRows.push([
                    flight.airline + " flight #" + flight.flightNumber + "\n" +
                    " » DEPARTURE: " + "\n " +
                    flight.depAirport + "\n " +
                    flight.depAddress + "\n " +
                    flight.depPhone + "\n " +
                    flight.departure.substr(0, 10) + " " + flight.departure.substr(11, 5) + "\n" +
                    " » ARRIVAL: " + "\n " +
                    flight.arrAirport + "\n " +
                    flight.arrAddress + "\n " +
                    flight.arrPhone + "\n " +
                    flight.arrival.substr(0, 10) + " " + flight.arrival.substr(11, 5),
                    employees
                ])
            });

            pdfFlights = [
                { text: "\n" },
                {
                    table: {
                        headerRows: 0,
                        widths: ['*'],
                        body: [
                            [{ text: "Flights", alignment: "center", fillColor: "#eeeeee", bold: true }]
                        ]
                    },
                    layout: 'noBorders'
                },
                { text: "\n" },
                {
                    style: 'itineraryData',
                    table:
                    {
                        headerRows: 0,
                        widths: [200, '*'],
                        // First element of the body array contains the header, as per stated by "headerRows"
                        body: []
                    }
                },
                { text: "\n" },
                {
                    style: 'itineraryData',
                    table: {
                        headerRows: 0,
                        widths: ['*'],
                        body: []
                    },
                    layout: 'lightHorizontalLines'
                }

            ]


            flightRows.forEach(function (flightRow) {
                pdfFlights[3].table.body.push(flightRow);
            });

            flightNotes.forEach(function (flightNote) {
                pdfFlights[5].table.body.push([flightNote]);
            });

        }

        let pdfHotels = {};

        if (hotels.length > 0) {
            let hotelRows = [];
            let employees = [];
            hotels.forEach(function (hotel) {
                employees = [];
                if (hotel.employees.length > 0) {
                    employees = [{
                        table: {
                            headerRows: 1,
                            widths: ["*"],
                            layout: 'noBorders',
                            body: [
                                [{ text: "Name", alignment: "center", fillColor: "#eeeeee", bold: true }]
                            ]
                        },
                    }];

                    hotel.employees.forEach(function (employee) {
                        employees[0].table.body.push(
                            [employee]
                        )
                    });
                }

                hotelRows.push([
                    hotel.hotel + "\n" +
                    hotel.address + "\n" +
                    hotel.phone + "\n" +
                    "Confirmation: " + hotel.confirmation + "\n" +
                    "Check in: " + hotel.checkIn.substr(0, 10) + " " + hotel.checkIn.substr(11, 5) + "\n" +
                    "Check out: " + hotel.checkOut.substr(0, 10) + " " + hotel.checkOut.substr(11, 5),
                    employees
                ])
            });

            pdfHotels = [
                { text: "\n" },
                {
                    table: {
                        headerRows: 0,
                        widths: ['*'],
                        body: [
                            [{ text: "Hotel", alignment: "center", fillColor: "#eeeeee", bold: true }]
                        ]
                    },
                    layout: 'noBorders'
                },
                { text: "\n" },
                {
                    style: 'itineraryData',
                    table:
                    {
                        headerRows: 0,
                        widths: [200, '*'],
                        // First element of the body array contains the header, as per stated by "headerRows"
                        body: []
                    }
                },
                { text: "\n" },
                {
                    style: 'itineraryData',
                    table: {
                        headerRows: 0,
                        widths: ['*'],
                        body: []
                    },
                    layout: 'lightHorizontalLines'
                }

            ]

            hotelRows.forEach(function (hotelRow) {
                pdfHotels[3].table.body.push(hotelRow);
            });

            hotelNotes.forEach(function (hotelNote) {
                pdfHotels[5].table.body.push([hotelNote]);
            });
        }

        let pdfTransport = {};
        if (transports.length > 0) {
            let transportRows = [];
            let employees = [];
            transports.forEach(function (transport) {
                employees = [];
                if (transport.employees.length > 0) {
                    employees = [{
                        table: {
                            headerRows: 1,
                            widths: ["*"],
                            layout: 'noBorders',
                            body: [
                                [{ text: "Name", alignment: "center", fillColor: "#eeeeee", bold: true }]
                            ]
                        },
                    }];

                    transport.employees.forEach(function (employee) {
                        employees[0].table.body.push(
                            [employee.employeeName]
                        )
                    });
                }

                transportRows.push([
                    transport.company + "\n" +
                    transport.location + " " + transport.phone + "\n" +
                    "Confirmation #" + transport.confirmationNumber + "\n" +
                    "Pickup: " + transport.pickup.substr(0, 10) + " " + transport.pickup.substr(11, 5) + "\n" +
                    "Drop off: " + transport.dropOff.substr(0, 10) + " " + transport.dropOff.substr(11, 5),
                    employees
                ])
            });

            pdfTransport = [
                { text: "\n" },
                {
                    table: {
                        headerRows: 0,
                        widths: ['*'],
                        body: [
                            [{ text: "Transportation arrangements", alignment: "center", fillColor: "#eeeeee", bold: true }]
                        ]
                    },
                    layout: 'noBorders'
                },
                { text: "\n" },
                {
                    style: 'itineraryData',
                    table:
                    {
                        headerRows: 0,
                        widths: [200, '*'],
                        // First element of the body array contains the header, as per stated by "headerRows"
                        body: []
                    }
                },
                { text: "\n" },
                {
                    style: 'itineraryData',
                    table: {
                        headerRows: 0,
                        widths: ['*'],
                        body: []
                    },
                    layout: 'lightHorizontalLines'
                },
                { text: "\n" },
            ]

            transportRows.forEach(function (transportRow) {
                pdfTransport[3].table.body.push(transportRow);
            });

            transportationNotes.forEach(function (transportationNote) {
                pdfTransport[5].table.body.push([transportationNote]);
            });

        }

        let pdfItinerary = {
            style: 'itineraryData',
            table: {
                headerRows: 1,
                widths: [120, 100, 100, '*'],
                // First element of the body array contains the header, as per stated by "headerRows"
                body: [
                    [{ text: "Timeframe", alignment: "center", fillColor: "#eeeeee", bold: true },
                    { text: "Type", alignment: "center", fillColor: "#eeeeee", bold: true },
                    { text: "Description", alignment: "center", fillColor: "#eeeeee", bold: true },
                    { text: "Location", alignment: "center", fillColor: "#eeeeee", bold: true }]
                ]
            }
        };
        // Fill the itinerary table
        let activityLocation;
        activities.forEach(function (activity) {
            // Retrieve the applicable timezone
            let activityTimeframe = activity.start.toString().substr(0, 10) + " " + activity.start.toString().substr(11, 5) + " to ";
            if (activity.start.toString().substr(0, 10) === activity.end.toString().substr(0, 10)) {
                activityTimeframe = activityTimeframe + activity.end.toString().substr(11, 5);
            }
            else {
                activityTimeframe = activityTimeframe + activity.end.toString().substr(0, 10) + " " + activity.end.toString().substr(11, 5);
            }
            // Assemble the location text
            activityLocation = activity.location;
            if (activity.address !== "") {
                activityLocation = activityLocation + "\n" +
                    "a: " + activity.address;
            }
            if (activity.phoneNumber !== "") {
                activityLocation = activityLocation + "\n" +
                    "p: " + activity.phoneNumber;
            }


            // Add the activity
            pdfItinerary.table.body.push([
                activityTimeframe + "\n" +
                activity.activityTimezone,
                activity.activityType,
                activity.title,
                activityLocation
            ]);

            // Check if the activity has contacts
            if (activity.attendees.length > 0) {
                let names = "";
                activity.attendees.forEach(function (attendee) {
                    if (names !== "") {
                        names = names + ", " + attendee.contactName;
                    }
                    else {
                        names = "Attendees: " + attendee.contactName;
                    }
                });
                pdfItinerary.table.body.push([
                    { colSpan: 4, text: names },
                    {},
                    {},
                    {}
                ]);
            }

            // Add a space 
            pdfItinerary.table.body.push([
                { colSpan: 4, text: "", border: [false, false, false, false] },
                {},
                {},
                {}
            ]);
        });

        let pdfDirectory = {
            style: 'itineraryData',
            table: {
                headerRows: 1,
                widths: [50, 80, 80, 80, '*'],
                // First element of the body array contains the header, as per stated by "headerRows"
                body: [
                    [{ text: "Type", alignment: "center", fillColor: "#eeeeee", bold: true },
                    { text: "Name", alignment: "center", fillColor: "#eeeeee", bold: true },
                    { text: "Company", alignment: "center", fillColor: "#eeeeee", bold: true },
                    { text: "Phone", alignment: "center", fillColor: "#eeeeee", bold: true },
                    { text: "email", alignment: "center", fillColor: "#eeeeee", bold: true }]
                ]
            }
        };

        tripAttendees.forEach(function (attendee) {
            // Add the attendee
            pdfDirectory.table.body.push([
                attendee.AttendeeTypeDescription,
                attendee.LastName + " " + attendee.FirstName,
                attendee.CompanyName,
                attendee.PhoneNumber,
                attendee.email
            ]);
        });


        // Assemble the PDF document
        pdfDocument = {
            info: pdfMetadata,
            pagesize: pdfPageSize,
            pageOrientation: pdfPageOrientation,
            pageMargins: pdfPageMargins,
            header: pdfHeader,
            content: [
                {
                    table: {
                        headerRows: 0,
                        widths: ['*'],
                        body: [
                            [{ text: "Trip details", alignment: "center", fillColor: "#eeeeee", bold: true }]
                        ]
                    },
                    layout: 'noBorders'
                },
                pdfTripDetails,
                pdfFlights,
                pdfHotels,
                pdfTransport,
                {
                    table: {
                        headerRows: 0,
                        widths: ['*'],
                        body: [
                            [{ text: "Itinerary", alignment: "center", fillColor: "#eeeeee", bold: true }]
                        ]
                    },
                    layout: 'noBorders'
                },
                { text: "\n" },
                pdfItinerary,
                { text: "\n" },
                {
                    table: {
                        headerRows: 0,
                        widths: ['*'],
                        body: [
                            [{ text: "Directory", alignment: "center", fillColor: "#eeeeee", bold: true }]
                        ]
                    },
                    layout: 'noBorders'
                },
                { text: "\n" },
                pdfDirectory
            ],
            styles: {
                itineraryData: {
                    fontSize: 10
                }
            }
        }
        // Done assembling the PDF, build and open
        // pdfMake.createPdf(pdfDocument).open();
        pdfMake.createPdf(pdfDocument).getBase64(function (data) {
            // win.loadURL("data:application/pdf;base64," + data);
            let response = ipc.sendSync('displayPDF', data);
            // win.document.write("<iframe width='100%' height='100%' src='data:application/pdf;base64, " + encodeURI(data) + "'");
        });
    })

    // Voice note and speech to text related code
    let speechRecognition;
    let speechRecognitionAvailable;
    let whoCalledSpeechRecognition;
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
            // Who is calling?
            let callingButton = ['#btnNotesDictate', '#btnActivityNotesDictate'][whoCalledSpeechRecognition - 1];
            // Add "listening" class to the button
            $(callingButton).addClass("listening");
            // Also let's change it's style
            $(callingButton).removeClass("fa-microphone");
            $(callingButton).addClass("fa-stop");
            $(callingButton).css({ "background-color": "maroon" });
            $(callingButton).css({ "color": "white" });
        }

        speechRecognition.onaudioend = function (event) {
            // Who is calling?
            let callingButton = ['#btnNotesDictate', '#btnActivityNotesDictate'][whoCalledSpeechRecognition - 1];
            // Remove "listening" class
            $(callingButton).removeClass("listening");
            $(callingButton).removeClass("fa-stop");
            $(callingButton).addClass("fa-microphone");
            $(callingButton).css({ "background-color": "" });
            $(callingButton).css({ "color": "" });
            // Stop audio recording if it was available
            if (audioRecordingAvailable) {
                stopRecording();
            }
        }

        // Speech recognition engine is available, need to create the propper event handlers
        speechRecognition.onresult = function (event) {
            // Who is calling?
            if (whoCalledSpeechRecognition == 1) {
                // Get note contents
                let contents = $('#editNoteText').val() + "<p>" + event.results[0][0].transcript + "</p>";
                // Then add the recognized text to our editor
                $('#editNoteText').jqteVal(contents);
            }
            else {
                // Get note contents
                let contents = qActivityNotes.root.innerHTML + "<p>" + event.results[0][0].transcript + "</p>";
                // Then add the recognized text to our editor
                qActivityNotes.root.innerHTML = contents;
            }
        };
    }
    else {
        // No speech recognition engine available, hide the buttons
        $('#btnNotesDictate').hide();
        $('#btnActivityNotesDictate').hide();
    }

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
                // Who is calling?
                let targetContainer = ['#tripVoiceNoteList', '#activityVoiceNoteList'][whoCalledSpeechRecognition - 1];
                // Now let's add the link
                createVoiceNoteLink(voiceNotes.length - 1, targetContainer);
            }
        })
    }

    // General trip notes dictate button
    $('#btnNotesDictate').on('click', function () {
        // Identify who is calling the speech recognition engine
        whoCalledSpeechRecognition = 1;
        // Check if we've got a speech recognition in progress
        if ($('#btnNotesDictate').hasClass("listening")) {
            // Stop current recognition task
            speechRecognition.stop();
        }
        else {
            // Start recognition task
            speechRecognition.start();
        }
    });

    // Trip activity notes dictate button
    $('#btnActivityNotesDictate').on('click', function () {
        // Identify who is calling the speech recognition engine
        whoCalledSpeechRecognition = 2;
        // Check if we've got a speech recognition in progress
        if ($('#btnActivityNotesDictate').hasClass("listening")) {
            // Stop current recognition task
            speechRecognition.stop();
        }
        else {
            // Start recognition task
            speechRecognition.start();
        }
    });

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

    // Google Place search functions

    // Google place search results datatable for trip Activities
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
        let activityLocation = $('#detailsActivityLocation').val().trim();
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
            $("#detailsActivityLocation").val(data.name);
            $("#detailsActivityLat").val(data.lat);
            $("#detailsActivityLong").val(data.long);
            $("#detailsActivityAddress").val(data.address);
            $("#detailsActivityPhoneNumber").val(data.phoneNumber);
            // Refresh the map
            googleMapsInitialize("#detailsActivityLat", "#detailsActivityLong", "detailsActivityGeoMap");
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

    // Search routines for Flight, Hotel and Transportation

    $('#tblFHTSearchResults').DataTable({
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

    let tblFHTSearchResults = $('#tblFHTSearchResults').DataTable();

    $("#btnDepartureGoogleFLPlaceSearch").on("click", function () {
        // Search google for places matching the hotel name
        let airportLocation = $('#DepartureFlightAirport').val().trim();
        // Continue airportLocation the user provided a location
        if (airportLocation.length > 5) {
            // Let's keep track of who is calling the search function
            $("#FHTSearchRequestedBy").val("DEPARTUREFLIGHT");
            // Hide the edit panel and display the search panel
            $("#searchFHTResultDiv").hide();
            $("#searchFHTSpinnerDiv").show();
            $("#panelFlightDetails").hide();
            $("#panelFHTGoogleSearch").show();
            // Execute the search
            getGooglePlaceSearch(airportLocation);
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
            // Display the results
            $("#searchFHTSpinnerDiv").hide();
            $("#searchFHTResultDiv").show();
            // Refresh datatable
            tblFHTSearchResults.clear();
            tblFHTSearchResults.rows.add(placesArray);
            tblFHTSearchResults.draw();
        }
    });

    $("#btnArrivalGoogleFLPlaceSearch").on("click", function () {
        // Search google for places matching the hotel name
        let airportLocation = $('#ArrivalFlightAirport').val().trim();
        // Continue airportLocation the user provided a location
        if (airportLocation.length > 5) {
            // Let's keep track of who is calling the search function
            $("#FHTSearchRequestedBy").val("ARRIVALFLIGHT");
            // Hide the edit panel and display the search panel
            $("#searchFHTResultDiv").hide();
            $("#searchFHTSpinnerDiv").show();
            $("#panelFlightDetails").hide();
            $("#panelFHTGoogleSearch").show();
            // Execute the search
            getGooglePlaceSearch(airportLocation);
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
            // Display the results
            $("#searchFHTSpinnerDiv").hide();
            $("#searchFHTResultDiv").show();
            // Refresh datatable
            tblFHTSearchResults.clear();
            tblFHTSearchResults.rows.add(placesArray);
            tblFHTSearchResults.draw();
        }
    });

    $("#btnGoogleHTPlaceSearch").on("click", function () {
        // Search google for places matching the hotel name
        let hotelLocation = $('#hotelHotel').val().trim();
        // Continue if the user provided a location
        if (hotelLocation.length > 5) {
            // Let's keep track of who is calling the search function
            $("#FHTSearchRequestedBy").val("HOTEL");
            // Hide the edit panel and display the search panel
            $("#searchFHTResultDiv").hide();
            $("#searchFHTSpinnerDiv").show();
            $("#panelHotelDetails").hide();
            $("#panelFHTGoogleSearch").show();
            // Execute the search
            getGooglePlaceSearch(hotelLocation);
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
            // Display the results
            $("#searchFHTSpinnerDiv").hide();
            $("#searchFHTResultDiv").show();
            // Refresh datatable
            tblFHTSearchResults.clear();
            tblFHTSearchResults.rows.add(placesArray);
            tblFHTSearchResults.draw();
        }
    });

    $("#btnGoogleTAPlaceSearch").on("click", function () {
        // Search google for places matching the transportation company name
        let tCompanyLocation = $('#transportationCompany').val().trim();
        // Continue if the user provided a location
        if (tCompanyLocation.length > 5) {
            // Let's keep track of who is calling the search function
            $("#FHTSearchRequestedBy").val("TRANSPORTATION");
            // Hide the edit panel and display the search panel
            $("#searchFHTResultDiv").hide();
            $("#searchFHTSpinnerDiv").show();
            $("#panelTransportationDetails").hide();
            $("#panelFHTGoogleSearch").show();
            // Execute the search
            getGooglePlaceSearch(tCompanyLocation);
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
            // Display the results
            $("#searchFHTSpinnerDiv").hide();
            $("#searchFHTResultDiv").show();
            // Refresh datatable
            tblFHTSearchResults.clear();
            tblFHTSearchResults.rows.add(placesArray);
            tblFHTSearchResults.draw();
        }
    });

    $("#btnFHTSearchSelect").on("click", function () {
        if (tblFHTSearchResults.row({ selected: true }).count() > 0) {
            // Use the first selected row
            let data = tblFHTSearchResults.rows({ selected: true }).data()[0];
            // Who called this?
            if ($("#FHTSearchRequestedBy").val() == "DEPARTUREFLIGHT") {
                // Called by Flights
                $("#DepartureFlightAirport").val(data.name);
                $("#DepartureFlightAddress").val(data.address);
                $("#DepartureFlightPhoneNumber").val(data.phoneNumber);
                // Show flight details panel
                $("#panelFlightDetails").show();
            } else if ($("#FHTSearchRequestedBy").val() == "ARRIVALFLIGHT") {
                // Called by Flights
                $("#ArrivalFlightAirport").val(data.name);
                $("#ArrivalFlightAddress").val(data.address);
                $("#ArrivalFlightPhoneNumber").val(data.phoneNumber);
                // Show flight details panel
                $("#panelFlightDetails").show();
            } else if ($("#FHTSearchRequestedBy").val() == "HOTEL") {
                // Called by Hotel
                $("#hotelHotel").val(data.name);
                $("#hotelAddress").val(data.address);
                $("#hotelPhoneNumber").val(data.phoneNumber);
                // Show hotel details panel
                $("#panelHotelDetails").show();
            }
            else {
                // Called by Transportation
                $("#transportationCompany").val(data.name);
                $("#transportationLocation").val(data.address);
                $("#transportationPhoneNumber").val(data.phoneNumber);
                // Show transport details panel
                $("#panelTransportationDetails").show();
            }
            // Done, restore panels
            $("#panelFHTGoogleSearch").hide();
        }
        else {
            alert("Please select one result.");
        }
    });

    $("#btnFHTSearchCancel").on("click", function () {
        $("#panelFHTGoogleSearch").hide();
        // Who called this?
        if ($("#FHTSearchRequestedBy").val() == "FLIGHT") {
            $("#panelFlightDetails").show();
        }
        else if ($("#FHTSearchRequestedBy").val() == "HOTEL") {
            $("#panelHotelDetails").show();
        }
        else {
            $("#panelTransportationDetails").show();
        }
    });

    /* Google maps related code */

    // Map related vars
    let geocoder;
    let map;
    let marker;

    function googleMapsInitialize(latContainer, longContainer, mapContainer) {
        let initialLat = $(latContainer).val();
        let initialLong = $(longContainer).val();
        initialLat = initialLat ? initialLat : 0;
        initialLong = initialLong ? initialLong : 0;
        let latlng = new google.maps.LatLng(initialLat, initialLong);
        let options = {
            zoom: 15,
            center: latlng,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };
        map = new google.maps.Map(document.getElementById(mapContainer), options);
        geocoder = new google.maps.Geocoder();
        marker = new google.maps.Marker({
            map: map,
            draggable: false,
            position: latlng
        });
    }

    // Let's init both maps
    googleMapsInitialize("#detailsLat", "#detailsLong", "detailsGeoMap");
    // googleMapsInitialize("#activityLat", "#activityLong", "#activityGeoMap");

    // Autocomplete function for trip location
    let autocompleteDetailsLocation = '#detailsLocation';
    $(function () {
        $(autocompleteDetailsLocation).autocomplete({
            source: function (request, response) {
                geocoder.geocode({
                    'address': request.term
                },
                    function (results, status) {
                        response($.map(results, function (item) {
                            return {
                                label: item.formatted_address,
                                value: item.formatted_address,
                                lat: item.geometry.location.lat(),
                                lon: item.geometry.location.lng()
                            };
                        }));
                    });
            },
            select: function (event, ui) {
                $('#detailsLocation').val(ui.item.value);
                $('#detailsLat').val(ui.item.lat);
                $('#detailsLong').val(ui.item.lon);
                let latlng = new google.maps.LatLng(ui.item.lat, ui.item.lon);
                marker.setPosition(latlng);
                googleMapsInitialize("#detailsLat", "#detailsLong", "detailsGeoMap");
            }
        });
    });

    // Outlook integration
    async function outlookUpdate(tripId, tripCalendarId, employeeId) {
        $.ajax({
            url: `${parentURL}/trips/!/trips/${tripId}/syncUpdate?tripCalendarId=${tripCalendarId}&employeeId=${employeeId}`,
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

    // Check if a specific activity Id was provided
    let preselectedActivityId = $("#selectedActivityId").text();
    if (preselectedActivityId != "") {
        $("#detailsActivityId").val(preselectedActivityId);
        // Call the refresh function, it will fill the edit fields
        refreshActivityViewMode();
        // Reset panels
        $("#panelActivityView").show();
        $("#panelActivityEdit").hide();
        $("#panelActivityAttendeeView").show();
        $("#panelActivityAttendeeEdit").hide();
        $("#panelActivityNotesView").show();
        // Switch panels (only if the activity panel is not already visible)
        if ($("#panelTripActivity").is(":hidden")) {
            $("#panelGeneralTrip").toggle("fast");
            $("#panelTripActivity").toggle("fast", function () { setActivityDatatablesAjaxURL(preselectedActivityId); });
        }
        else {
            // Adjust the notes and attendees datatables
            setActivityDatatablesAjaxURL(preselectedActivityId);
        }
    }

    // Finally let's apply admin restrictions
    if (!UserIsAdmin) {
        // Disable trip details
        $("#detailsTitle").attr("disabled", true);
        $("#detailsStartDate").attr("disabled", true);
        $("#detailsEndDate").attr("disabled", true);
        $("#detailsCompany").attr("disabled", true);
        $("#chkTripLocation").attr("disabled", true);
        $("#detailsLocation").attr("disabled", true);
        $("#tripDetailsDelete").hide();
        $("#tripDetailsSubmit").hide();
        // Disable trip attendee/notes datatable add buttons
        $("#btnAddAttendee").hide();
        $("#btnAddNote").hide();
        // Disable activity details
        $("#detailsActivityTitle").attr("disabled", true);
        $("#detailsActivityStartDate").attr("disabled", true);
        $("#detailsActivityStartTime").attr("disabled", true);
        $("#detailsActivityEndDate").attr("disabled", true);
        $("#detailsActivityEndTime").attr("disabled", true);
        $("#detailsActivityType").attr("disabled", true);
        $("#chkActivityLocation").attr("disabled", true);
        $("#detailsActivityLocation").attr("disabled", true);
        $("#btnGooglePlaceSearch").hide();
        $("#detailsActivityAddress").attr("disabled", true);
        $("#detailsActivityPhoneNumber").attr("disabled", true);
        $("#detailsActivitySubmit").hide();
        $("#detailsActivityDelete").hide();
        // Disable activity attendee/notes datatable add buttons
        $("#btnAddActivityAttendee").hide();
        $("#btnAddActivityNote").hide();
    }

    function clearFlightEditPanel() {
        $("#flightAirline").val("");
        $("#flightNumber").val("");
        $("#DepartureFlightAirport").val("");
        $("#DepartureFlightAddress").val("");
        $("#DepartureFlightPhoneNumber").val("");
        $("#DepartureFlightDate").val("");
        $("#DepartureFlightTime").val("12:00 PM");
        $("#ArrivalFlightAirport").val("");
        $("#ArrivalFlightAddress").val("");
        $("#ArrivalFlightPhoneNumber").val("");
        $("#ArrivalFlightDate").val("");
        $("#ArrivalFlightTime").val("12:00 PM");
        $("#tblFlightAttendees").DataTable().clear().draw();
    }

});