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
let colorTrip = "#008000";

// Check if user is Admin
let UserIsAdmin = ($("#userIsAdmin").text() === 'true');
let UserId = $("#loggedEmployeeId").text();

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

    // Hide the settings panel
    $("#panelDisplaySettings").hide();
    $("#calendarView").hide();

    // Main settings button onClick event
    $("#btnMasterSettings").on("click", function() {
        $("#panelDisplaySettings").toggle("fast");
    });

    // Calendar view settings "Cancel" onClick event
    $("#btnCancelCalendarSettings").on("click", function() {
        $("#panelDisplaySettings").toggle("fast");
    });

    // Calendar view settings "Apply" onClick event
    $("#btnApplyCalendarSettings").on("click", function() {
        $('#calendar').fullCalendar('refetchEvents');
        $("#panelDisplaySettings").toggle("fast");
    });

    // Switch to calendar view onclick event
    $("#btnCalendarView").on("click", function() {
        $("#upcomingPreviousView").toggle("fast");
        $("#calendarView").toggle("fast", function(){
            $('#calendar').fullCalendar('refetchEvents');
        });
    });

    // Switch to upcoming/previous view onclick event
    $("#btnUpcomingPreviousView").on("click", function(){
        $("#calendarView").toggle("fast", function(){
            if ($("#calendarView").is(":visible")) {
                // In theory calling 'render' should repaint the calendar, however it's not working,
                // so this is a walkaround to force it to repaint.
                $('#calendar').fullCalendar('next');
                $('#calendar').fullCalendar('prev');
            }
        });
        $("#upcomingPreviousView").toggle("fast", function(){ 
            if ($("#upcomingPreviousView").is(":visible")) {
                $('#tblUpcomingTrips').DataTable().ajax.reload();
                $('#tblPreviousTrips').DataTable().ajax.reload();
                $('#tblLatestTripNotes').DataTable().ajax.reload();
            }
        });
    });

    // FullCalendar related
    $('#calendar').fullCalendar({
        themeSystem: 'jquery-ui',
        header: {
            left: 'prev,next today',
            center: 'title',
            right: 'listDay,agendaWeek,month,listWeek',
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
            // Assemble the caller URL
            let eventsURL = `${parentURL}/trips/!/trips?startDate=${getFormattedDateTime(startDate)}&endDate=${getFormattedDateTime(endDate)}&companyId=${company}`;
            // Retrieve trips
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
                    let trips = [];
                    if (doc !== null){
                        let tripStartDate;
                        let tripEndDate;
                        doc.forEach(function(tripObject) {
                            tripStartDate = new Date(tripObject.StartDate.toString().substr(0, 10) + " 00:00:00");
                            tripEndDate = new Date(tripObject.EndDate.toString().substr(0, 10) + " 23:59:59");
                            trips.push({
                                id: tripObject.TripId,
                                title: tripObject.Title,
                                start: tripStartDate,
                                end: tripEndDate,
                                textColor: '#FFFFFF',
                                color: colorTrip,
                                allDay: false
                            });
                        });
                    }
                    callback(trips);
                }
            })
        },
        eventOverlap: function(stillEvent, movingEvent){
            return true;
        },
        eventClick: async function(trip, jsEvent, view){
            // Open the event
            window.location.href = `./tripdetails.html?tripId=${trip.id}`;
        },
        dayClick: function(date, jsEvent, view) {
            // Check if user is admin
            if (UserIsAdmin) {
                
            }
        }
    });

    // We'll need this URL to retrieve the trip listing by category (upcoming / previous)
    let tripListingURL = `${parentURL}/trips/!/trips/category/`;

    // Upcoming trips datatable
    $('#tblUpcomingTrips').DataTable({
        dom: "frtip",
        ajax: tripListingURL + "1",
        username: credentials.user,
        password: credentials.password,
        paging: true,
        pageLength: 10,
        info: false,
        searching: true,
        scrollX: false,
        scrollY: "200px",
        scrollCollapse: true,
        ordering: false,
        processing: true,
        language: {
            processing: '<div style="display:block;text-align:center"><img title="loading" src="../s/img/ajax-loading.gif"></div>',
            emptyTable: "There are no upcoming trips"
        },
        "columns": [
            {
                "data": "StartDate",
                "className": "trip-data text-nowrap dt-center",
                "mRender": function(data, type, full){
                    return data.substr(0, 4) + '-' + data.substr(5, 2) + '-' + data.substr(8, 2);
                }
            },
            {
                "data": "EndDate",
                "className": "trip-data text-nowrap dt-center",
                "mRender": function(data, type, full){
                    return data.substr(0, 4) + '-' + data.substr(5, 2) + '-' + data.substr(8, 2);
                }
            },
            {
                "data": "Title",
                "className": "trip-data text-nowrap"
            },
            {
                "data": "Location",
                "className": "trip-data text-nowrap",
            }
        ],
        "columnDefs": [
            {"targets": [0],
             "visible": true,
             "searchable": false
            },
            {"targets": [1],
             "visible": true,
             "searchable": false
            },
            {"targets": [2],
             "visible": true,
             "searchable": true
            },
            {"targets": [3],
             "visible": true,
             "searchable": true
            }
        ]
    });

    // Clicking on a row redirects to the trip details page
    $('#tblUpcomingTrips tbody').on('click', '.trip-data', function () {
        // Get the row's data
        let data = $("#tblUpcomingTrips").DataTable().row(this).data();
        // Get the trip ID, we need it to redirect to it's details page
        window.location.href = `./tripdetails.html?tripId=${data.TripId}`;
    });

    // Previous trips datatable
    $('#tblPreviousTrips').DataTable({
        dom: "frtip",
        ajax: tripListingURL + "2",
        username: credentials.user,
        password: credentials.password,
        paging: true,
        pageLength: 10,
        info: false,
        searching: true,
        scrollX: false,
        scrollY: "200px",
        scrollCollapse: true,
        ordering: false,
        processing: true,
        language: {
            processing: '<div style="display:block;text-align:center"><img title="loading" src="../s/img/ajax-loading.gif"></div>',
            emptyTable: "There are no previous trips"
        },
        "columns": [
            {
                "data": "StartDate",
                "className": "trip-data text-nowrap dt-center",
                "mRender": function(data, type, full){
                    return data.substr(0, 4) + '-' + data.substr(5, 2) + '-' + data.substr(8, 2);
                }
            },
            {
                "data": "EndDate",
                "className": "trip-data text-nowrap dt-center",
                "mRender": function(data, type, full){
                    return data.substr(0, 4) + '-' + data.substr(5, 2) + '-' + data.substr(8, 2);
                }
            },
            {
                "data": "Title",
                "className": "trip-data text-nowrap"
            },
            {
                "data": "Location",
                "className": "trip-data text-nowrap",
            }
        ],
        "columnDefs": [
            {"targets": [0],
             "visible": true,
             "searchable": false
            },
            {"targets": [1],
             "visible": true,
             "searchable": false
            },
            {"targets": [2],
             "visible": true,
             "searchable": true
            },
            {"targets": [3],
             "visible": true,
             "searchable": true
            }
        ]
    });

    // Clicking on a row redirects to the trip details page
    $('#tblPreviousTrips tbody').on('click', '.trip-data', function () {
        // Get the row's data
        let data = $("#tblPreviousTrips").DataTable().row(this).data();
        // Get the trip ID, we need it to redirect to it's details page
        window.location.href = `./tripdetails.html?tripId=${data.TripId}`;
    });

    // Latest trip notes
    $('#tblLatestTripNotes').DataTable({
        dom: "frtip",
        ajax: `${parentURL}/trips/!/trips/notes`,
        username: credentials.user,
        password: credentials.password,
        paging: true,
        pageLength: 20,
        info: false,
        searching: true,
        scrollX: false,
        scrollY: "400px",
        scrollCollapse: true,
        ordering: false,
        processing: true,
        language: {
            processing: '<div style="display:block;text-align:center"><img title="loading" src="../s/img/ajax-loading.gif"></div>',
            emptyTable: "There are no notes"
        },
        "columns": [
            {
                "data": "NoteDate",
                "className": "note-data text-nowrap dt-center",
                "mRender": function(data, type, full){
                    return data.substr(0, 4) + '-' + data.substr(5, 2) + '-' + data.substr(8, 2);
                }
            },
            {
                "data": "TripTitle",
                "className": "note-data text-wrap",
                "render": function(data, type, row){
                    let result = '<div class="row">' + row.TripTitle + '</div>';
                    if (row.TripActivityId > 0){
                        result = result + 
                                 '<div class="row">' + row.TripActivityTitle + '</div>';
                    }
                    return result;
                }
            },
            {
                "data": "Note",
                "className": "note-data text-wrap",
                mRender: function(data, type, full){
                    if (data){
                        return data.split(String.fromCharCode(10)).join("<br/>");
                    }
                }
            }
        ],
        "columnDefs": [
            {"targets": [0],
             "visible": true,
             "searchable": false
            },
            {"targets": [1],
             "visible": true,
             "searchable": true
            },
            {"targets": [2],
             "visible": true,
             "searchable": true
            }
        ]
    });

    // Clicking on a row redirects to the trip details page
    $('#tblLatestTripNotes tbody').on('click', '.note-data', function () {
        // Get the row's data
        let data = $("#tblLatestTripNotes").DataTable().row(this).data();
        // Get the trip ID, we need it to redirect to it's details page
        window.location.href = `./tripdetails.html?tripId=${data.TripId}`;
    });

    // Top bar onclick handlers
    $("#btnNewTrip").on("click", async function(){
        // Check if user is admin, otherwise reject this
        if (UserIsAdmin){
            window.location.href = `./tripdetails.html?tripId=new`;
        }
        else {
            alert("You don't have enough privileges to perform this action.");
        }
    });

});