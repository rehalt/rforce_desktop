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

// Admin user flag was passed through the hidden P tag "userIsAdmin" to handlebars
let UserIsAdmin = ($("#userIsAdmin").text() === 'true');
let UserId = $("#loggedEmployeeId").text();

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
                $("#settingsCompany").append(new Option(response.data[i].Name, response.data[i].ExternalCompanyId));
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
                $("#settingsEmployee").append(new Option(response.data[i].LastName + " " + response.data[i].FirstName, response.data[i].EmployeeId));
                $("#editNoteFollowUpEmployee").append(new Option(response.data[i].LastName + " " + response.data[i].FirstName, response.data[i].EmployeeId));
                $("#editNoteAttendeeEmployee").append(new Option(response.data[i].LastName + " " + response.data[i].FirstName, response.data[i].EmployeeId));
            }
        },
        error: function (data) {
            console.log('Ajax error retrieving employees.');
        }
    });

    // Load email recipients
    $.ajax({
        url: `${parentURL}/!/emails?includeDistributionLists=1`,
        username: credentials.user,
        password: credentials.password,
        type: "GET",
        async: false,
        success: function (response) {
            // Traverse through result set
            for (let i = 0; i < response.data.length; i++) {
                $("#emailNoteRecipients").append(new Option(response.data[i].LastName + " " + response.data[i].FirstName, response.data[i].EmployeeId));
            }
        },
        error: function (data) {
            console.log('Ajax error retrieving email recipients.');
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
            }
        },
        error: function (data) {
            console.log('Ajax error retrieving employees.');
        }
    });

    // Retrieve URL parameters
    let URLParamList = window.location.search.substring(1).split("&");
    // First parameter (if present), indicates that we're adding a new note
    let URLParamSet = URLParamList[0].split("=");

    // Hide panels
    $("#panelDisplaySettings").hide();
    $("#panelNotesEdit").hide();
    $("#panelNotesEmail").hide();

    // Enable chosen selectors
    $('#settingsCompany').chosen({ width: "100%", allow_single_deselect: true });
    $('#settingsEmployee').chosen({ width: "100%", allow_single_deselect: true });
    $('#emailNoteRecipients').chosen({ width: "100%", allow_single_deselect: true });
    $('#editNoteFollowUpEmployee').chosen({ width: "100%", allow_single_deselect: true });
    $('#editNoteAttendeeEmployee').chosen({ width: "100%", allow_single_deselect: true });
    $('#editNoteAttendeeContact').chosen({ width: "100%", allow_single_deselect: true });
    // Main settings button onClick event
    $("#btnMasterSettings").on("click", function () {
        $("#panelDisplaySettings").toggle("fast");
    });

    // Utilities
    // This will create a random 10 char string, we'll use this later on to identify
    // attachments for new notes (will be passed to the server via a form param)
    function makeid() {
        let text = "";
        let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < 10; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        return text;
    }

    // Note type functions to populate linked selector
    async function loadCompanies() {
        $.ajax({
            async: false,
            type: 'GET',
            url: `${parentURL}/companies/!/companyList`,
            username: credentials.user,
            password: credentials.password,
            success: function (result) {
                // Check if the returning array has something
                if (result.data.length > 0) {
                    // Add the companies to the selector
                    let selector = $("#editNoteSource");
                    result.data.forEach(function (company) {
                        selector.append(new Option(company.Name, company.ExternalCompanyId));
                    });
                }
            }
        });
    }

    async function loadContacts() {
        $.ajax({
            async: false,
            type: 'GET',
            url: `${parentURL}/contacts/!/contactList`,
            username: credentials.user,
            password: credentials.password,
            success: function (result) {
                // Check if the returning array has something
                if (result.data.length > 0) {
                    // Add the contacts to the selector
                    let selector = $("#editNoteSource");
                    result.data.forEach(function (contact) {
                        selector.append(new Option(contact.LastName + " " + contact.FirstName, contact.ContactId));
                    });
                }
            }
        });
    }

    // Enable rich text editor
    $('#editNoteText').jqte();

    /* Notes datatable */

    // This will hold the name of file attached to the note
    let noteAttachments = [];

    $('#tblNotes').DataTable({
        dom: "frtip",
        ajax: '',
        username: credentials.user,
        password: credentials.password,
        paging: true,
        pageLength: 10,
        info: false,
        searching: true,
        scrollX: false,
        scrollY: "500px",
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
                data: "NoteDate",
                className: "text-nowrap note-data dt-align-top",
                mRender: function (data, type, row) {
                    let mDate = new Date(data);
                    return getFormattedDate(mDate);
                }
            },
            {
                data: "NoteSource",
                className: "never text-nowrap"
            },
            {
                className: "text-wrap note-data dt-align-top",
                data: "NoteSourceDescription",
                mRender: function (data, type, row) {
                    return `<div class="row">${row.NoteSourceDescription}</div><div class="row"><i>${row.NoteTitle}</i></div>`;
                }
            },
            {
                data: "Note",
                className: "text-wrap note-data",
                mRender: function (data, type, row) {
                    if (data) {
                        let ellipsis = "";
                        if (data.length > 250) {
                            ellipsis = "..."
                        }
                        let preview = data.substr(0, 250);
                        let response = '<div class="row">' +
                            //preview.split(String.fromCharCode(10)).join("<br/>") + ellipsis +
                            preview + ellipsis +
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
                data: "attachments",
                className: "never text-nowrap dt-center note-data dt-align-top",
                mRender: function (data, type, row) {
                    if (data != "") {
                        return '<span class="fa fa-paperclip"></span>';
                    }
                    else {
                        return '';
                    }
                }
            },
            {
                data: "NoteId",
                className: "never text-nowrap dt-center note-email dt-align-top",
                mRender: function (data, type, row) {
                    return '<span class="fa fa-envelope-o"></span>';
                }
            }
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
                width: "40%"
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

    // Once the datatable is defined, apply filter settings
    applyNoteFilterToDatatable();

    // Note follow up party
    function noteFollowUpParty(noteId) {
        let followUpParty = [];
        $.ajax({
            url: `${parentURL}/notes/!/note/${noteId}/followUpParty`,
            username: credentials.user,
            password: credentials.password,
            type: "GET",
            async: false,
            success: function (employeeList) {
                if (!$.isEmptyObject(employeeList.data)) {
                    for (let item = 0; item < employeeList.data.length; item++) {
                        followUpParty.push(employeeList.data[item].LastName + " " + employeeList.data[item].FirstName);
                    }
                }
            }
        });
        return followUpParty;
    }

    // Note attendees
    function noteAttendees(noteId) {
        let employees = [];
        let contacts = []
        $.ajax({
            url: `${parentURL}/notes/!/note/${noteId}/attendees`,
            username: credentials.user,
            password: credentials.password,
            type: "GET",
            async: false,
            success: function (attendeeList) {
                if (!$.isEmptyObject(attendeeList.data)) {
                    for (let item = 0; item < attendeeList.data.length; item++) {
                        if (attendeeList.data[item].AttendeeType === 1) {
                            employees.push(attendeeList.data[item].LastName + " " + attendeeList.data[item].FirstName);
                        }
                        else {
                            contacts.push({
                                "id": attendeeList.data[item].AttendeeId,
                                "name": attendeeList.data[item].LastName + " " + attendeeList.data[item].FirstName
                            });
                        }
                    }
                }
            }
        });
        let attendeeList = {
            "employees": employees,
            "contacts": contacts
        }
        return attendeeList;
    }

    // Creates an hyperlink to a contact's page
    function contactHyperLink(contactData) {
        let htmlLinks = [];
        if (contactData.length > 0) {
            for (let item = 0; item < contactData.length; item++) {
                htmlLinks.push('<a href="./contactdetails.html?conactId=' + contactData[item].id + '">' + contactData[item].name + '</a>');
            }
        }
        return htmlLinks.join(", ");
    }

    function loadNoteView(noteId) {
        // Init the note view container
        let noteView = $("#noteContents");
        noteView.empty();
        // Retrieve note details, to start assembling the note view
        $.ajax({
            url: `${parentURL}/notes/!/noteDetails?noteId=${noteId}`,
            username: credentials.user,
            password: credentials.password,
            type: "GET",
            async: false,
            success: function (noteDetails) {
                // Let's create a URL to link to the note source
                let sourceURL;
                if ((noteDetails.data[0].Source >= 100) && (noteDetails.data[0].Source <= 199)) {
                    sourceURL = `./companydetails.html?companyId=${noteDetails.data[0].SourceId}`;
                }
                else if ((noteDetails.data[0].Source >= 200) && (noteDetails.data[0].Source <= 299)) {
                    sourceURL = `./contactdetails.html?contactId=${noteDetails.data[0].SourceId}`;
                }
                else if ((noteDetails.data[0].Source >= 300) && (noteDetails.data[0].Source <= 399)) {
                    sourceURL = `./calendardetails.html?calendarId=${noteDetails.data[0].SourceId}`;
                }
                else if (noteDetails.data[0].Source == 401) {
                    sourceURL = `./tripdetails.html?tripId=${noteDetails.data[0].SourceId}`;
                }
                else if (noteDetails.data[0].Source == 402) {
                    sourceURL = `./tripdetails.html?tripId=${noteDetails.data[0].SourceId}&activityId=${noteDetails.data[0].SourceId}`;
                }
                else if (noteDetails.data[0].Source == 501) {
                    sourceURL = `./dealdetails.html?dealNumber=${noteDetails.data[0].SourceDealNumber}`;
                }
                noteView.append('<input type="hidden" id="viewNoteId" name="viewNoteId" value="' + noteId + '"></input>');
                let attachmentIndicator = "";
                if (noteDetails.data[0].attachments != "") {
                    attachmentIndicator = '&nbsp;&nbsp;<span class="fa fa-paperclip"></span>';
                }
                noteView.append('<p>Source: <strong><a href="' + sourceURL + '">' + noteDetails.data[0].SourceDescription + ' - ' + noteDetails.data[0].SourceIdDescription + '</a></strong>' + attachmentIndicator + '</p>');
                if (noteDetails.data[0].WhenChanged === null) {
                    noteView.append('<p>Last updated on: <strong>' + noteDetails.data[0].WhenCreated.substr(0, 10) + ' ' + noteDetails.data[0].WhenCreated.substr(11, 8) + '</strong> by <strong>' + noteDetails.data[0].WhoCreatedName + '</strong></p>');
                }
                else {
                    noteView.append('<p>Last updated on: <strong>' + noteDetails.data[0].WhenChanged.substr(0, 10) + ' ' + noteDetails.data[0].WhenChanged.substr(11, 8) + '</strong> by <strong>' + noteDetails.data[0].WhoChangedName + '</strong></p>');
                }
                if (noteDetails.data[0].FollowUpType > 0) {
                    let followUpParty = noteFollowUpParty(noteId)
                    noteView.append('<p>Follow up: <strong>' + noteDetails.data[0].FollowUpTypeDescription + '</strong> on <strong>' + noteDetails.data[0].FollowUp.substr(0, 10) + '</strong> by <strong>' + followUpParty.join(", ") + '</strong></p>');
                }
                else {
                    noteView.append('<p>Follow up: <strong>None</strong></p>');
                }

                noteView.append('<hr>')
                //noteView.append(noteDetails.data[0].Note.split(String.fromCharCode(10)).join("<br/>"));
                noteView.append(noteDetails.data[0].Note);
                noteView.append('<hr>')
                let attendeeList = noteAttendees(noteId);
                if (attendeeList.employees.length > 0) {
                    noteView.append('<p>Attending employees: <strong>' + attendeeList.employees.join(", ") + '</strong></p>');
                }
                if (attendeeList.contacts.length > 0) {
                    noteView.append('<p>Attending contacts: <strong>' + contactHyperLink(attendeeList.contacts) + '</strong></p>');
                }
                if ((attendeeList.contacts.length > 0) || (attendeeList.employees.length > 0)) {
                    noteView.append('<hr>')
                }
                // Check if not has attachments
                let noteAttachmentPath = `${parentURL}/notes/!/note/attachments/${noteId}`;
                $.ajax({
                    url: noteAttachmentPath,
                    type: "GET",
                    async: false,
                    success: function (attachments) {
                        if (!$.isEmptyObject(attachments.data)) {
                            // There is a list of attached files, let's add them to the response
                            let response = '<strong>Attachments</strong>';
                            for (let item = 0; item < attachments.data.length; item++) {
                                response = response +
                                    `<p><a href="${parentURL}/s/notes/attachments/${noteId}/${attachments.data[item]}" target="_blank">${attachments.data[item]}</a></p>`;
                            }
                            noteView.append(response);
                            noteView.append("<hr>");
                        }
                    }
                });
                // Edit button is only available when user is admin
                if (UserIsAdmin) {
                    // Only admins are allowed to edit
                    noteView.append('<button type="button" id="btnNoteEdit" class="btnNoteEdit" >Edit</button>');
                    // Attach the on-click event to our newly created button
                    document.getElementById("btnNoteEdit").addEventListener("click", btnEditNoteOnClick, false);
                }
            }
        });
        // Make sure view panel is visible
        if ($("#homeView").is(":hidden")) {
            $("#homeView").show();
            $("#panelNotesEdit").hide();
        }
    }


    // Note on click (except on email icon)
    $('#tblNotes tbody').on('click', '.note-data', function () {
        loadNoteView($("#tblNotes").DataTable().row(this).data().NoteId);
        // Make sure the note view panel is visible
        $("#homeView").show();
        $("#panelNotesEdit").hide();
    })

    // New note button click event
    $("#btnNewNote").on("click", function () {
        // Init the note fields
        $("#editNoteId").val("0"); // New note id
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
        // Init note type
        let noteTypeSelector = $("#editNoteType");
        noteTypeSelector.empty();
        noteTypeSelector.append(new Option("Companies: general note", "101"));
        noteTypeSelector.append(new Option("Companies: meeting note", "102"));
        noteTypeSelector.append(new Option("Contacts: bio note", "201"));
        noteTypeSelector.append(new Option("Contacts: R&B related note", "202"));
        noteTypeSelector.val("");
        $("#editNoteSource").val("");
        $("#editNoteSource").empty();
        // Toggle notes panels
        if ($("#panelNotesEdit").is(":hidden")) {
            $("#homeView").toggle("fast");
            $("#panelNotesEdit").toggle("fast");
        }
    });

    // Note edit onclick handler
    function btnEditNoteOnClick() {
        // Get the row's data
        let noteId = $("#viewNoteId").val();
        // Retrieve note details (need to display who created and changed the note)
        $("#editNoteWhoChanged").val("");
        $("#editNoteWhoCreated").val("");
        $.ajax({
            url: `${parentURL}/notes/!/noteDetails?noteId=${noteId}`,
            username: credentials.user,
            password: credentials.password,
            type: "GET",
            async: false,
            success: function (noteDetails) {
                // Prep up the edit panel
                let noteTypeSelector = $("#editNoteType");
                noteTypeSelector.empty();
                noteTypeSelector.append(new Option(noteDetails.data[0].SourceDescription, noteDetails.data[0].Source, true, true));

                let noteSourceSelector = $("#editNoteSource");
                noteSourceSelector.empty();
                noteSourceSelector.append(new Option(noteDetails.data[0].SourceIdDescription, noteDetails.data[0].SourceId, true, true));

                $('#editNoteId').val(noteDetails.data[0].NoteId);
                $('#editNoteSourceId').val(noteDetails.data[0].SourceId);
                $("#AttachmentNoteId").val(noteDetails.data[0].NoteId);
                $("AttachmentNoteTempPath").val("");
                $('#editNoteType').val(noteDetails.data[0].Source);
                $('#editNoteText').jqteVal(noteDetails.data[0].Note);
                $("#editNoteFollowUpType").val(noteDetails.data[0].FollowUpType);
                if (noteDetails.data[0].FollowUpType === 0) {
                    // Hide Follow up section
                    $("#editNoteFollowUpDetailsDiv").hide();
                }
                else {
                    // Show Follow up section
                    $("#editNoteFollowUpDetailsDiv").show();
                }
                if (noteDetails.data[0].FollowUp) {
                    let followDate = new Date(noteDetails.data[0].FollowUp);
                    followDate = new Date(followDate.getTime() + timezoneOffset);
                    $('#editNoteFollowUp').val(getFormattedDate(followDate));
                }
                else {
                    $('#editNoteFollowUp').val("");
                }
                $("#editNoteWhoCreated").val(noteDetails.data[0].WhoCreatedName + " on " + noteDetails.data[0].WhenCreated.substr(0, 10) + " " + noteDetails.data[0].WhenCreated.substr(11, 8));
                if (noteDetails.data[0].WhoChangedName !== null) {
                    $("#editNoteWhoChanged").val(noteDetails.data[0].WhoChangedName + " on " + noteDetails.data[0].WhenChanged.substr(0, 10) + " " + noteDetails.data[0].WhenChanged.substr(11, 8));
                }
            }
        });
        // Retrieve linked employees / contacts
        $.ajax({
            url: `${parentURL}/notes/!/note/${noteId}/attendees`,
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
            url: `${parentURL}/notes/!/note/${noteId}/followUpParty`,
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
        loadNoteAttachments(noteId);
        // Check if this note has attached voice notes
        $.ajax({
            url: `${parentURL}/notes/!/voicenote/list/${noteId}`,
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
        $("#homeView").toggle("fast");
        $("#panelNotesEdit").toggle("fast");
    };

    // Note edit cancel onclick handler
    $("#btnNoteCancel").on("click", function () {
        $("#homeView").toggle("fast");
        $("#panelNotesEdit").toggle("fast");
    });

    // Click event for "Submit" button on note edit panel
    $("#btnNoteSubmit").on("click", async function () {
        // Check if all fields are valid
        let notes = $('#editNoteText').val();
        if (notes != "") {
            // Get remaining params
            let noteId = $("#editNoteId").val();
            let noteSourceId = $("#editNoteSource").val();
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
                // Refresh our datatable
                $('#tblNotes').DataTable().ajax.reload();
                // Toggle notes panels
                $("#panelNotesEdit").toggle("fast");
                $("#homeView").toggle("fast", function () { loadNoteView(noteId) });
            }
            else {
                alert("Couldn't save note.");
            }
        }
        else {
            alert("Please provide some notes.");
        }
    });

    // Note delete
    $("#btnNoteDelete").on("click", async function () {
        // We'll need this var to delete the note
        let noteId = $("#editNoteId").val();
        // Delete the note 
        let deleteURL = `${parentURL}/notes/!/note?noteId=${noteId}`;
        result = await executeAjaxDelete(deleteURL);
        // Clear the note view panel
        $("#noteContents").empty();
        // Toggle view/edit panels
        $("#panelNotesEdit").toggle("fast");
        $("#homeView").toggle("fast", function () {
            $('#tblNotes').DataTable().ajax.reload();
        });
    });

    // Note type on-change handler
    $("#editNoteType").on("change", function (event) {
        // Clear the selector content
        $("#editNoteSource").empty();
        // Then check what we're going to be loading
        let selectedValue = $("#editNoteType").val();
        if (['101', '102'].includes(selectedValue)) {
            // Load companies
            loadCompanies();
        }
        else if (['201', '202'].includes(selectedValue)) {
            // Load companies
            loadContacts();
        }
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

    // Send note by email functionality

    $('#tblNotes tbody').on('click', '.note-email', function () {
        // Get the row's data
        let data = $("#tblNotes").DataTable().row(this).data();
        $("#emailNoteId").val(data.NoteId);
        // Make sure to load the note details
        loadNoteView(data.NoteId);
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
        // Toggle thepanelNoteList email send panel
        $("#panelNoteList").toggle("fast");
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
            $("#panelNotesEmail").toggle("fast");
            $("#panelNoteList").toggle("fast", function () { $('#tblNotes').DataTable().ajax.reload(); });
        }
        else {
            alert("Please select the email recipients.")
        }
    });

    $("#btnNoteEmailCancel").on("click", function () {
        // Cancel, toggle the panels without doing anything
        $("#panelNotesEmail").toggle("fast");
        $("#panelNoteList").toggle("fast", function () { $('#tblNotes').DataTable().ajax.reload(); });
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

    // Row filtering and cookie handling functions

    // Filter init function
    function resetFilterSettings() {
        $("#chkSettingsCalendar").prop("checked", true);
        $("#chkSettingsCompanies").prop("checked", true);
        $("#chkSettingsContacts").prop("checked", true);
        $("#chkSettingsTrips").prop("checked", true);
        $("#settingsStartDate").val("2000-01-01");
        $("#settingsEndDate").val("2099-12-31");
        $("#settingsCompany").val("");
        $('#settingsCompany').trigger("chosen:updated");
        $("#settingsEmployee").val("");
        $('#settingsEmployee').trigger("chosen:updated");
    }

    function saveFilterSettings() {
        // Retrieve filter settings
        let includeCalendar = ($("#chkSettingsCalendar").is(":checked")) ? 1 : 0;
        let includeCompanies = ($("#chkSettingsCompanies").is(":checked")) ? 1 : 0;
        let includeContacts = ($("#chkSettingsContacts").is(":checked")) ? 1 : 0;
        let includeTrips = ($("#chkSettingsTrips").is(":checked")) ? 1 : 0;
        let externalCompany = $("#settingsCompany").val().join("|");
        let createdBy = $("#settingsEmployee").val().join("|");
        let startDate = $("#settingsStartDate").val();
        let endDate = $("#settingsEndDate").val();
        // Build cookie content
        let cookieContent = {
            "includeCalendar": includeCalendar,
            "includeCompanies": includeCompanies,
            "includeContacts": includeContacts,
            "includeTrips": includeTrips,
            "externalCompany": externalCompany,
            "createdBy": createdBy,
            "startDate": startDate,
            "endDate": endDate
        }
        let cookie = ["NotesFilter", "=", JSON.stringify(cookieContent)].join("");
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
                    if (cookiePairs[0].trim() === "NotesFilter") {
                        // Found the desired cookie, let's parse it
                        let settings = JSON.parse(cookiePairs[1].trim());
                        // Load the values
                        if (settings.hasOwnProperty("includeCalendar")) {
                            $("#chkSettingsCalendar").prop("checked", (settings.includeCalendar === 1));
                        }
                        if (settings.hasOwnProperty("includeCompanies")) {
                            $("#chkSettingsCompanies").prop("checked", (settings.includeCompanies === 1));
                        }
                        if (settings.hasOwnProperty("includeContacts")) {
                            $("#chkSettingsContacts").prop("checked", (settings.includeContacts === 1));
                        }
                        if (settings.hasOwnProperty("includeTrips")) {
                            $("#chkSettingsTrips").prop("checked", (settings.includeTrips === 1));
                        }
                        if (settings.hasOwnProperty("externalCompany")) {
                            $("#settingsCompany").val(settings.externalCompany.split("|"));
                            $('#settingsCompany').trigger("chosen:updated");
                        }
                        if (settings.hasOwnProperty("createdBy")) {
                            $("#settingsEmployee").val(settings.createdBy.split("|"));
                            $('#settingsEmployee').trigger("chosen:updated");
                        }
                        if (settings.hasOwnProperty("startDate")) {
                            $("#settingsStartDate").val(settings.startDate);
                        }
                        if (settings.hasOwnProperty("endDate")) {
                            $("#settingsEndDate").val(settings.endDate);
                        }
                    }
                }
            }
        }
        else {
            // No settings saved, init all filters
            resetFilterSettings();
        }
        // Apply loaded settings
        applyNoteFilterToDatatable();
    }

    // Filters
    $("#btnApplyFilterSettings").on("click", function () {
        applyNoteFilterToDatatable();
        saveFilterSettings();
        $("#panelDisplaySettings").toggle("fast");
    });

    function applyNoteFilterToDatatable() {
        // Retrieve filter settings
        let startDate = $("#settingsStartDate").val();
        let endDate = $("#settingsEndDate").val();
        let includeCalendar = ($("#chkSettingsCalendar").is(":checked")) ? 1 : 0;
        let includeCompanies = ($("#chkSettingsCompanies").is(":checked")) ? 1 : 0;
        let includeContacts = ($("#chkSettingsContacts").is(":checked")) ? 1 : 0;
        let includeTrips = ($("#chkSettingsTrips").is(":checked")) ? 1 : 0;
        let companies = $("#settingsCompany").val().join(",");
        let employees = $("#settingsEmployee").val().join(",");
        // Lets now to assemble the URL
        let notesURL = parentURL +
            "/notes/!/noteByFilters" +
            "?startDate=" + startDate +
            "&endDate=" + endDate +
            "&includeCalendar=" + includeCalendar +
            "&includeCompanies=" + includeCompanies +
            "&includeContacts=" + includeContacts +
            "&includeTrips=" + includeTrips +
            "&companies=" + companies +
            "&employees=" + employees;
        // Reset the panels
        $("#panelNoteList").show();
        $("#panelNotesEmail").hide();
        $("#homeView").show();
        $("#panelNotesEdit").hide();
        $("#noteContents").empty();
        // Reload the datatable    
        $('#tblNotes').DataTable().ajax.url(notesURL);
        $('#tblNotes').DataTable().ajax.reload();
    }

    // Initial filter retrieval
    retrieveFilterSettings();


    // Init Dropzone object, need to do this within the js file and not from the template
    // in order to attach the "on complete" event handler below.
    var dropZone = new Dropzone("form#FormDropZone", {
        url: parentURL + "/notes/!/note/dropzone"
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

    // Done loading pretty much everything, let's check if we're adding a new note
    if (URLParamSet[0] != "") {
        $("#btnNewNote").click();
    }
});