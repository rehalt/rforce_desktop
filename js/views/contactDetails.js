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

const get = 'get';
const post = 'post';
const put = 'put';
const del = 'delete';

var contactId;
var editorEmail;
var editorPhone;
var editorAddress;
var editorPositions;
var editorDeals;
var editorAttachments;
var tblContactEmails;
var tblContactPhones;
var tblContactAddresses;
var tblPositions;
var tblNotes;
var tblRelationships;
var tblConfirmNew;
var tblAttachments;
var UserId = $("#loggedEmployeeId").val();
var appURL = window.location.href;
//var parentURL = appURL.substring(0, appURL.lastIndexOf( "/contacts" ));
var today = new Date();
var timezoneOffset = today.getTimezoneOffset() * 60000;
var contactAttachments = [];


// generic function to populate dropdowns from a REST source
function loadDropDown(dropDownName, itemText, itemValue, selectedValue, urlAjaxSource, arrExtraItems) {
    // Load a list of dearequest, status, errorls
    $.ajax({
        async: true,
        type: 'get',
        url: urlAjaxSource,
        username: credentials.user,
        password: credentials.password,
        success: dropDownAjaxLoad(dropDownName, itemText, itemValue, selectedValue, arrExtraItems),
        error: function (jqXHR, exception) {
            console.error(jqXHR.responseText);
        }
    });
};


var dropDownAjaxLoad = function (dropDownName, itemText, itemValue, selectedValue, arrExtraItems) {
    return function (resp, textStatus, jqXHR) {
        if (dropDownName == '#editNoteAttendeeContact')
            $(dropDownName).empty();

        // add static elements defined by an array of {text:"", value:"", location:""}
        // location = 'pre' defines they are meant to be displayed before the data
        if (arrExtraItems.length) {
            for (let index = 0; index < arrExtraItems.length; index++) {
                // next line is a workarround: options with empty text would not be added as an option. Replacing with non-break space (ALT+0160)
                if (arrExtraItems[index].text == '' || arrExtraItems[index].text == '') { arrExtraItems[index].text = String.fromCharCode(160) }
                if (!(arrExtraItems[index].location) || arrExtraItems[index].location == 'pre') {
                    $(dropDownName).append(new Option(arrExtraItems[index].text, arrExtraItems[index].value));
                }
            }
        }

        // Load ajax data
        if (resp.data) {
            if (resp.data.length) {
                for (let index = 0; index < resp.data.length; index++) {
                    $(dropDownName).append(new Option(resp.data[index][itemText], resp.data[index][itemValue]));
                };
            }
        }

        // add static elements defined by an array of {text:"", value:"", location:""}
        if (arrExtraItems.length) {
            for (let index = 0; index < arrExtraItems.length; index++) {
                if (arrExtraItems[index].location == 'post') {
                    $(dropDownName).append(new Option(arrExtraItems[index].text, arrExtraItems[index].value));
                }
            }
        }
        $(`${dropDownName} option[value='${selectedValue}']`).prop('selected', 'selected');
        $(dropDownName).trigger("chosen:updated");
    };
};


// Date formatting functions, needed to pass dates and times to FullCalendar
function getFormattedDate(inputDate) {
    // FullCalendar expects to receive the default date in YYYY-MM-DD format, let's get to it
    let dd = inputDate.getDate();
    let mm = inputDate.getMonth() + 1; // Remember, getMonth returns 0 to 11
    return [inputDate.getFullYear(),
    (mm > 9 ? "" : "0") + mm,
    (dd > 9 ? "" : "0") + dd].join("-");
}


// Turn off Dropzone autodiscovery
Dropzone.autoDiscover = false;





// The ever conspicuous document ready function...
$(document).ready(function () {
    $.ajaxSetup({
        beforeSend: function () {
            $("#loading").show();
        },
        complete: function () {
            $("#loading").hide();
        }
    });

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

    $("#newContact").val((window.location.href.includes("?new=yes") ? "yes" : ""));
    // Retrieve URL parameters
    let URLParamList = window.location.search.substring(1).split("&");
    let URLParamSet = URLParamList[0].split("=");
    contactId = URLParamSet[1];
    $("#ContactId").val(contactId);



    $.ajax({
        url: `${parentURL}/contacts/!/application/context/`,
        type: "GET",
        async: false,
        username: credentials.user,
        password: credentials.password,
        success: function (context) {
            $("#loggedEmployeeId").val(context.employeeId);
            $("#userIsAdmin").val(context.userIsAdmin);
        },
        error: function () {
            $("#loggedEmployeeId").val('');
            $("#userIsAdmin").val('no');
        }
    });

    loadDropDown('#editNoteAttendeeContact', 'FullName', 'ContactId', 0, `${parentURL}/contacts/!/contacts/shortList`, {});
    loadDropDown('#emailNoteRecipients', 'FullName', 'EmployeeId', 0, `${parentURL}/contacts/!/employees`, {});
    loadDropDown('#editNoteFollowUpEmployee', 'FullName', 'EmployeeId', 0, `${parentURL}/contacts/!/employees`, {});
    loadDropDown('#editNoteAttendeeEmployee', 'FullName', 'EmployeeId', 0, `${parentURL}/contacts/!/employees`, {});


    $("#editNoteFollowUpDetailsDiv").hide();

    // Init enhanced select/options via plugin "chosen"
    $("#ContactDeals").chosen({ "allow_singe_deselect": false, "width": "95%" });
    $("#ContactSubscriptions").chosen({ "allow_singe_deselect": false, "width": "95%" });
    $("#ExternalCompanyId").chosen({ "allow_singe_deselect": true, "width": "95%" });
    $("#AssistantId").chosen({ "allow_singe_deselect": true, "width": "95%" });

    $('#emailNoteRecipients').chosen({ width: "100%", allow_single_deselect: true });
    $('#editNoteFollowUpEmployee').chosen({ width: "100%", allow_single_deselect: true });
    $('#editNoteAttendeeEmployee').chosen({ width: "100%", allow_single_deselect: true });
    $('#editNoteAttendeeContact').chosen({ width: "100%", allow_single_deselect: true });

    $("#ExternalCompanyId").bind("change", function () {
        if ($(this).val() == -1) {
            $("#addNewCompany1").show(500);
            $("#addNewCompany2").show(500);
        }
        else {
            $("#addNewCompany1").hide(500);
            $("#addNewCompany2").hide(500);
        }
    });

    $("#AssistantId").bind("change", function () {
        if ($(this).val() == -1) {
            $("#addNewAssistant1").show(500);
            $("#addNewAssistant2").show(500);
        }
        else {
            $("#addNewAssistant1").hide(500);
            $("#addNewAssistant2").hide(500);
        }
    });


    // init DATATABLE Editors

    editorEmail = new $.fn.DataTable.Editor({
        ajax: `${parentURL}/contacts/!/contacts/${contactId}/emailAdresses/_id_/`,
        table: "#tblContactEmails",
        idSrc: 'ContactPhoneEmailId',
        fields: [
            {
                label: "Type:",
                name: "Type",
                type: "select",
                options: [
                    { label: "Corporate Email", value: "11" },
                    { label: "Personal Email", value: "12" }
                ]
            },
            {
                label: "Email:",
                name: "Email"
            },
            {
                label: "Is Primary:",
                name: "IsPrimary",
                type: "select",
                options: [
                    { label: "No", value: "0" },
                    { label: "Yes", value: "1" }
                ]
            },
        ]
    });

    editorPhone = new $.fn.DataTable.Editor({
        ajax: `${parentURL}/contacts/!/contacts/${contactId}/phones/_id_/`,
        table: "#tblContactPhones",
        idSrc: 'ContactPhoneEmailId',
        fields: [
            {
                label: "Type:",
                name: "Type",
                type: "select",
                options: [
                    { label: "Office phone", value: "1" },
                    { label: "Office mobile phone", value: "2" },
                    { label: "Office fax", value: "3" },
                    { label: "Personal phone", value: "4" },
                    { label: "Personal mobile", value: "5" },
                    { label: "Personal fax", value: "6" }
                ]
            },
            {
                label: "Phone:",
                name: "Phone"
            },
            {
                label: "Extension:",
                name: "Extension"
            },
            {
                label: "Is Primary:",
                name: "IsPrimary",
                type: "select",
                options: [
                    { label: "No", value: "0" },
                    { label: "Yes", value: "1" }
                ]
            },
        ]
    });

    editorAddress = new $.fn.DataTable.Editor({
        ajax: `${parentURL}/contacts/!/contacts/${contactId}/addresses/_id_/`,
        idSrc: 'ContactAddressId',
        table: "#tblContactAddresses",
        fields: [
            {
                label: "Type:",
                name: "Type",
                type: "select",
                options: [
                    { label: "Corporate Address", value: "1" },
                    { label: "Mailing Address", value: "4" },
                    { label: "Personal (Home)", value: "2" },
                    { label: "Other", value: "3" },
                ]
            },
            {
                label: "Street:",
                name: "Street"
            },
            {
                label: "City:",
                name: "City"
            },
            {
                label: "State:",
                name: "State"
            },
            {
                label: "Country:",
                name: "Country"
            },
            {
                label: "Zip Code:",
                name: "ZipCode"
            }
        ]
    });

    editorPositions = new $.fn.DataTable.Editor({
        ajax: `${parentURL}/contacts/!/contacts/${contactId}/position-history/_id_/`,
        idSrc: 'ContactPositionId',
        table: "#tblPositions",
        fields: [
            { label: "Position:", name: "Position" },
            { label: "Company Name:", name: "CompanyName" },
            { label: "Department:", name: "Department" },
            { label: "Start Date:", name: "DateStarted", type: "datetime", attr: { autocomplete: "off" } },
            { label: "End Date:", name: "DateEnded", type: "datetime", attr: { autocomplete: "off" } },
            { label: "Is Current:", name: "IsCurrent", type: "select", options: [{ label: "No", value: "0" }, { label: "Yes", value: "1" }] }
        ]
    });

    editorSocialMedia = new $.fn.DataTable.Editor({
        ajax: `${parentURL}/contacts/!/contacts/${contactId}/social-media/_id_/`,
        idSrc: 'ContactSocialMediaId',
        table: "#tblContactSocialMedia",
        fields: [

            {
                label: "Social Media:",
                name: "SocialMediaId",
                type: "select"
            },
            { label: "Handler:", name: "Handler" },
        ]
    });

    editorNotes = new $.fn.DataTable.Editor({
        ajax: `${parentURL}/contacts/!/contacts/${contactId}/notes/_id_/`,
        idSrc: 'NoteId',
        table: "#tblNotes",
        fields: [
            { label: "Note:", name: "Note", type: "textarea" },
            { label: "Follow Up:", name: "FollowUp", type: "datetime", attr: { autocomplete: "off" } }
        ]
    });


    // editor validations

    editorPositions.on('preSubmit', function (e, o, action) {
        if (action !== 'remove') {
            var dateStarted = this.field('DateStarted');
            var dateEnded = this.field('DateEnded');

            if (!isValidDate(dateStarted.val())) {
                dateStarted.error('Start Date is invalid ');
            }

            if (!isValidDate(dateEnded.val())) {
                dateEnded.error('End Date is invalid ');
            }

            if (this.inError()) {
                return false;
            }
        }
    });



    // init DATATABLES

    tblContactEmails = $('#tblContactEmails').DataTable({
        dom: "Bfrtip",
        scrollX: true,
        paging: false,
        ordering: false,
        info: false,
        select: { style: 'single' },
        columns: [
            {
                data: "Email",
                mRender: function (data, type, full) {
                    return '<a href="mailto:' + data + '"><i class="fa fa-envelope fa-lg"></i></a>';
                }
            },
            { data: "TypeDesc" },
            { data: "Email" },
            { data: "IsPrimaryDesc" },
            { data: "IsPrimary" },
            { data: "ContactPhoneEmailId" },
            { data: "Type" }
        ],
        columnDefs: [
            { "targets": [4, 5, 6], "visible": false },
        ],
        buttons: [
            { extend: "create", editor: editorEmail },
            { extend: "edit", editor: editorEmail },
            { extend: "remove", editor: editorEmail }
        ]
    });

    tblContactPhones = $('#tblContactPhones').DataTable({
        dom: "Bfrtip",
        scrollX: true,
        paging: false,
        ordering: false,
        info: false,
        select: { style: 'single' },
        columns: [
            {
                data: "Phone",
                mRender: function (data, type, full) {
                    return '<a href="tel:' + data + '"><i class="fa fa-phone fa-lg"></i></a>';
                }
            },
            { data: "TypeDesc" },
            { data: "Phone" },
            { data: "IsPrimaryDesc" },
            { data: "IsPrimary" },
            { data: "ContactPhoneEmailId" },
            { data: "Type" }
        ],
        columnDefs: [
            { "targets": [4, 5, 6], "visible": false },
        ],
        buttons: [
            { extend: "create", editor: editorPhone },
            { extend: "edit", editor: editorPhone },
            { extend: "remove", editor: editorPhone }
        ]
    });

    tblContactAddresses = $('#tblContactAddresses').DataTable({
        dom: "Bfrtip",
        scrollX: true,
        paging: false,
        ordering: false,
        info: false,
        select: true,
        columns: [
            {
                data: "Street",
                mRender: function (data, type, full) {
                    return '<i class="fa fa-address-card fa-lg"></i>';
                }
            },
            { data: "Type" },
            { data: "Street" },
            { data: "City" },
            { data: "State" },
            { data: "Country" },
            { data: "ZipCode" },
            { data: "ContactAddressId" },
            { data: "TypeOfAddress" }

        ],
        columnDefs: [
            { "targets": [7, 8], "visible": false },
        ],
        buttons: [
            { extend: "create", editor: editorAddress },
            { extend: "edit", editor: editorAddress },
            { extend: "remove", editor: editorAddress }
        ]
    });

    tblPositions = $('#tblPositions').DataTable({
        dom: "Bfrtip",
        scrollX: true,
        paging: false,
        ordering: false,
        info: false,
        select: true,
        columns: [
            { data: "Position" },
            { data: "CompanyName" },
            { data: "Department" },
            { data: "DateStarted" },
            { data: "DateEnded" },
            { data: "ContactPositionId" },
            { data: "IsCurrent" }
        ],
        columnDefs: [
            { "targets": [3, 4], "class": "nowrap" },
            { "targets": [5, 6], "visible": false }
        ],
        buttons: [
            { extend: "create", editor: editorPositions },
            { extend: "edit", editor: editorPositions },
            { extend: "remove", editor: editorPositions }
        ]
    });

    tblContactSocialMedia = $('#tblContactSocialMedia').DataTable({
        dom: "Bfrtip",
        scrollX: true,
        paging: false,
        ordering: false,
        info: false,
        select: true,
        columns: [
            {
                data: "IconCode",
                mRender: function (data, type, row) {
                    return '<a href="' + row.UrlHandler + '" target="_blank" ><i class="' + data + ' fa-lg"></i></a>';
                }
            },
            { data: "Description" },
            { data: "UrlHandler" },
            { data: "SocialMediaId" },
            { data: "ContactSocialMediaId" },
            { data: "Handler" }
        ],
        columnDefs: [
            { "targets": [3, 4, 5], "visible": false },
        ],
        buttons: [
            { extend: "create", editor: editorSocialMedia },
            { extend: "edit", editor: editorSocialMedia },
            { extend: "remove", editor: editorSocialMedia }
        ]
    });

    tblNotes = $('#tblNotes').DataTable({
        dom: "Bfrtip",
        scrollX: true,
        paging: false,
        ordering: false,
        info: false,
        select: true,
        columns: [
            {
                data: "NoteId",
                className: "never text-nowrap",
            },
            {
                data: "WhenCreated",
                className: "text-nowrap note-data dt-align-top note-row",
                mRender: function (data, type, row) {
                    let mDate = new Date(data);
                    return getFormattedDate(mDate);
                }
            },
            {
                data: "Source",
                className: "never text-nowrap note-row"
            },
            {
                data: "Source",
                className: "text-nowrap note-data dt-align-top",
                mRender: function (data, type, row) {
                    let result = '';
                    switch (row.Source) {
                        case 101:
                            result = '<a href="./companydetails.html?companyId=' + row.SourceId + '">Companies (general)</a>';
                            break;
                        case 102:
                            result = '<a href="./companydetails.html?companyId=' + row.SourceId + '">Companies (meeting)</a>';
                            break;
                        case 202:
                            result = "Contact";
                            break;
                        case 301:
                            result = '<a href="./calendarDetails.html?calendarId=' + row.SourceId + '">Calendar</a>';
                            break;
                        case 401:
                            result = '<a href="./tripDetails.html?tripId=' + row.SourceId + '">Trip</a>';
                            break;
                        case 402:
                            result = '<a href="./tripDetails.html?tripId=' + row.OId2 + '&activityId=' + row.SourceId + '">Trip</a>';
                            break;
                    }
                    return result;
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
                className: "text-nowrap note-data dt-align-top note-row",
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
            {
                data: "FollowUpType"
            }

        ],
        rowCallback: function (row, data, index) {
            // note-row class makes the cell "clickable", to open note dialog editor
            if (data.Source > 199 && data.Source < 300) {
                $("td:eq(1)", row).addClass("note-row");
            }
        },
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
            },
            {
                targets: [7],
                visible: false,
                searchable: false
            }
        ],
        buttons: [
            {
                "text": "<i class='fa fa-plus'></i> &nbsp; New Note", "action": function (e, dt, node, config) {
                    /* clear data from dialog */
                    clearNoteControls();
                    $("#notesDialogEdit").dialog("open");
                }
            }
        ]
    });

    tblDeals = $('#tblDeals').DataTable({
        dom: "Bfrtip",
        scrollX: true,
        paging: false,
        ordering: false,
        info: false,
        select: { style: 'single' },
        columns: [
            {
                data: "DealNumber",
                mRender: function (data, type, row) {
                    return '<a href="' + parentURL + './dealdetails.html?dealNumber=' + row.DealNumber + '"><i class="fa fa-handshake-o fa-lg"></i></a>';
                }
            },
            { data: "DealNumber" },
            { data: "DealName" }
        ],
        columnDefs: [
        ],
        buttons: [
            {
                "text": "<i class='fa fa-plus'></i> &nbsp; New Deal", "action": function (e, dt, node, config) {
                    $("#dealsDialogEdit").dialog("open");
                }
            },
            {
                "text": "Delete", "action": function (e, dt, node, config) {
                    let r = tblDeals.rows({ selected: true }).data();
                    if (r.length) {
                        $("#dealsDialogDelete").dialog("open");
                    }
                    else
                        alert('Please select the record you want to delete.');

                }
            }
        ]
    });

    tblConfirmNew = $('#tblConfirmNew').DataTable({
        dom: "Bfrtip",
        scrollX: true,
        paging: false,
        ordering: false,
        searching: false,
        info: false,
        rowId: "ContactId",
        select: { style: 'single' },
        columns: [
            { data: "FirstName" },
            { data: "LastName" },
            { data: "PrimaryEmail" },
            { data: "PrimaryPhone" },
            { data: "CompanyName" },
            { data: "ContactId" }
        ],
        columnDefs: [
            { "targets": [5], "visible": false },
        ],
        buttons: []
    });


    tblAttachments = $('#tblAttachments').DataTable({
        dom: "Bfrtip",
        language: {
            "emptyTable": "There are no attachments for this contact"
        },
        scrollX: true,
        paging: false,
        ordering: false,
        info: false,
        select: true,
        columns: [
            {
                data: "fullFileName",
                mRender: function (data, type, row) {
                    return '<a href="' + parentURL + '/contacts/!/contacts/' + row.contactId + '/attachments/' + data + '"><i class="fa fa-download"></i></a>';
                }
            },
            { data: "fileName" },
            { data: "fileDate" },
            { data: "contactId" },
        ],
        columnDefs: [
            {
                targets: [3],
                visible: false
            }
        ],
        buttons: [
            {
                "text": "Delete", "action": function (e, dt, node, config) {
                    let r = tblAttachments.rows({ selected: true }).data();
                    if (r.length) {
                        $("#attachmentsDialogDelete").dialog("open");
                    }
                    else
                        alert('Please select the attachment you want to delete.');

                }
            }
        ]
    });


    // init event handlers
    $("#btnSubmit").click(function () {
        storeRecord();
    })

    $("#btnCancel").click(function () {
        window.location.href = "./contacts.html";
    })


    $("#FirstName").blur(function () {
        checkExistingContact()
    });

    $("#DTE_Field_Phone").blur(function () {
        formatPhoneNumber(this.value);
    });

    $("#DTE_Field_Phone").focus(function () {
    });

    editorPhone.field('Phone').input().on('focus', function () {
        this.value = cleanPhoneNumber(this.value);
    });

    $("#goToCompany").click(function () {
        let companyId = $("#ExternalCompanyId").val();
        if (companyId > 0)
            window.location.href = `./companyDetails.html?companyId=${companyId}`;
        else
            alert('There is no company selected');
    });


    editorPhone.field('Phone').input().on('blur', function () {
        this.value = formatPhoneNumber(this.value);
    });

    editorPhone.on('open', function (e, json, data) {
        // split phone attribute in phone and extension
        let phoneNumber = editorPhone.field('Phone').val();
        editorPhone.set('Phone', phoneNumber.substring(0, 14));
        editorPhone.set('Extension', phoneNumber.substring(14).replace(/\D/g, ''));
    });




    $("#PrimaryPhone").on('focus', function () {
        this.value = cleanPhoneNumber(this.value);
    });

    $("#PrimaryPhone").on('blur', function () {
        this.value = formatPhoneNumber(this.value);
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

    $('#tblNotes tbody').on('click', '.note-row', function () {
        let data = $("#tblNotes").DataTable().row(this).data();
        loadNote(data);
        $("#notesDialogEdit").dialog("open");
    });

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
        $("#notesDialogEmail").dialog("open");
    });

    /*
    
        DIALOG DEFINITIONS 
    
    */

    $("#dealsDialogEdit").dialog({
        autoOpen: false,
        height: 500,
        buttons:
            [
                {
                    text: "Update",
                    click: function () {
                        let newDealNumber = $("#newDeal").val();
                        // Store deal
                        $.ajax({
                            async: true,
                            type: post,
                            url: `${parentURL}/contacts/!/contacts/${contactId}/deals/${newDealNumber}`,
                            username: credentials.user,
                            password: credentials.password,
                            success: function (data) {
                                tblDeals.ajax.url(`${parentURL}/contacts/!/contacts/${contactId}/deals`).load();
                            },
                            error: function () {
                                console.log('deal added: error');
                            }
                        });
                        $(this).dialog("close");
                    }
                },
                {
                    text: "Cancel",
                    click: function () {
                        $(this).dialog("close");
                    }
                }
            ],
        show: {
            effect: "fade",
            duration: 500
        },
        hide: {
            effect: "fade",
            duration: 500
        }
    });

    $("#dealsDialogDelete").dialog({
        autoOpen: false,
        width: 300,
        height: 300,
        buttons:
            [
                {
                    text: "Delete",
                    click: function () {
                        let r = tblDeals.rows({ selected: true }).data();
                        let dealNumber = r[0].DealNumber;
                        // Store deal
                        $.ajax({
                            async: true,
                            type: del,
                            url: `${parentURL}/contacts/!/contacts/${contactId}/deals/${dealNumber}`,
                            username: credentials.user,
                            password: credentials.password,
                            success: function (data) {
                                tblDeals.ajax.url(`${parentURL}/contacts/!/contacts/${contactId}/deals`).load();
                            },
                            error: function () {
                                console.log('Deal removed: error');
                            }
                        });
                        $(this).dialog("close");
                    }
                },
                {
                    text: "Cancel",
                    click: function () {
                        $(this).dialog("close");
                    }
                }
            ],
        show: {
            effect: "fade",
            duration: 500
        },
        hide: {
            effect: "fade",
            duration: 500
        }
    });


    $("#attachmentsDialogDelete").dialog({
        autoOpen: false,
        width: 300,
        height: 300,
        buttons:
            [
                {
                    text: "Delete",
                    click: function () {
                        let r = tblAttachments.rows({ selected: true }).data();
                        let fileNames = '';
                        for (let i = 0; i < r.length; i++) {
                            fileNames = fileNames + r[i].fullFileName + ',';
                        }
                        fileNames = fileNames.slice(0, -1);
                        // Delete attachment
                        $.ajax({
                            async: true,
                            type: del,
                            url: `${parentURL}/contacts/!/contacts/${contactId}/attachments/${fileNames}`,
                            username: credentials.user,
                            password: credentials.password,
                            success: function (data) {
                                tblAttachments.ajax.reload();
                            },
                            error: function (err) {
                                console.log('attachment was not removed, error: ' + err);
                            }
                        });
                        $(this).dialog("close");
                    }
                },
                {
                    text: "Cancel",
                    click: function () {
                        $(this).dialog("close");
                    }
                }
            ],
        show: {
            effect: "fade",
            duration: 500
        },
        hide: {
            effect: "fade",
            duration: 500
        }
    });


    $("#notesDialogEdit").dialog({
        autoOpen: false,
        width: $(window).width(),
        height: $(window).height(),
        buttons:
            [
                {
                    text: "Submit",
                    click: function () {
                        submitNote();
                        $(this).dialog("close");
                    }
                },
                {
                    text: "Cancel",
                    click: function () {
                        $(this).dialog("close");
                    }
                },
                {
                    text: "Delete...",
                    click: function () {
                        if (confirm('Are you sure you want to delete this note?')) {
                            let noteId = $("#editNoteId").val();
                            let contactId = $("#ContactId").val();
                            deleteNote(contactId, noteId);
                            $(this).dialog("close");
                        }
                    }
                }
            ],
        show: {
            effect: "fade",
            duration: 500
        },
        hide: {
            effect: "fade",
            duration: 500
        }
    });

    $("#notesDialogEmail").dialog({
        autoOpen: false,
        width: 400,
        height: 300,
        buttons:
            [
                {
                    text: "Send",
                    click: function () {
                        sendNoteEmail();
                        $(this).dialog("close");
                    }
                },
                {
                    text: "Cancel",
                    click: function () {
                        $(this).dialog("close");
                    }
                }
            ],
        show: {
            effect: "fade",
            duration: 500
        },
        hide: {
            effect: "fade",
            duration: 500
        }
    });

    $("#newContactDialogConfirm").dialog({
        autoOpen: false,
        width: 600,
        height: 300,
        buttons:
            [
                {
                    text: "Yes, edit suggested contact",
                    click: function () {
                        // load selected contact
                        let selectedContactId = tblConfirmNew.row({ selected: true }).id();
                        if (selectedContactId) {
                            window.location.href = `/contacts/${selectedContactId}`;
                            $(this).dialog("close");
                        }
                        else {
                            alert('Please select a contact from the list');
                        }

                    }
                },
                {
                    text: "No, create new contact",
                    click: function () {
                        $("#newContact").val("no");
                        $(this).dialog("close");
                    }
                }
            ],
        show: {
            effect: "fade",
            duration: 500
        },
        hide: {
            effect: "fade",
            duration: 500
        }
    });





    // this is a workaround to fix columns for hidden tables on second tab "bio"
    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        $.fn.dataTable.tables({ visible: true, api: true }).columns.adjust();
    });

    // General functions
    function loadRecord() {
        contactId = $("#ContactId").val();
        let ajaxUrl = `${parentURL}/contacts/!/contacts/${contactId}`;
        $.ajax({
            url: ajaxUrl,
            type: get,
            username: credentials.user,
            password: credentials.password,
            success: function (response) {
                console.log('response: ', response);
                let p = response.data[0];
                contactId = p.ContactId;
                refreshView(p)
            },
            error: function () {
                displayError('We were unable to load this record, please try again later.');
            }
        });
    }

    function storeRecord() {
        contactId = $("#ContactId").val();
        //$("#ContactAttachments").val(JSON.stringify(contactAttachments));
        let form = $("#LastName").closest("form");
        let contactData = toJSONString(form);
        let deals = [];
        let contactDeals = {};
        let subscriptions = [];
        let contactSubscriptions = {};
        let externalCompanyId = $("#ExternalCompanyId").val();

        if (externalCompanyId != 0) {
            // Save the contact
            $.ajax({
                url: `${parentURL}/contacts/!/contacts/${contactId}`,
                type: put,
                data: contactData,
                username: credentials.user,
                password: credentials.password,
                processData: false,
                dataType: "text",
                contentType: 'application/json',
                success: function (response) {
                    displaySuccessMessage('Record successfully updated.');
                    //contactAttachments = [];
                    loadRecord();
                    syncRecord();
                    //$("#attachmentDropZone").empty();
                    //$('#attachmentDropZone')[0].dropzone.files.forEach(function(file) { 
                    //    file.previewElement.remove(); 
                    //  });
                    //  $('#attachmentDropZone').removeClass('dz-started');

                },
                error: function (jqXHR, textStatus, errorThrown) {
                    displayError('We were unable to store this record, please try again later. (' + textStatus + ')');
                }
            });

            // save subscriptions associated to the contact
            $("#ContactSubscriptions option:selected").each(function (i, obj) {
                subscriptions.push(obj.value);
            });

            contactSubscriptions = JSON.stringify({ subscriptions: subscriptions });

            $.ajax({
                url: `${parentURL}/contacts/!/contacts/${contactId}/subscriptions`,
                type: post,
                data: contactSubscriptions,
                username: credentials.user,
                password: credentials.password,
                processData: false,
                dataType: "text",
                contentType: 'application/json',
                success: function () { },
                error: function (jqXHR, textStatus, errorThrown) {
                    displayError('We were unable to store subscriptions for this contact. (' + textStatus + ')');
                }
            });
        } else {
            alert('Please select a Company from the list \n  or\nselect "** Add a new company **" and provide a Company name if you don\' see the company name listed.');
            $("#ExternalCompanyId").focus();
        }
    }

    function syncRecord() {
        // Sync the contact
        contactId = $("#ContactId").val();
        $.ajax({
            url: `${parentURL}/contacts/!/contacts/${contactId}/sync`,
            username: credentials.user,
            password: credentials.password,
            type: get,
            processData: false,
            dataType: "text",
            contentType: 'application/json',
            username: credentials.user,
            password: credentials.password,
            success: function (response) {
                // do nothing
            },
            error: function (jqXHR, textStatus, errorThrown) {
            }
        });
    }

    function refreshView(p) {
        for (var key in p) {
            if (p.hasOwnProperty(key)) {
                $("#" + key).val(p[key]);
            }
        }

        // telephone and extension
        let fullTelephone = $("#PrimaryPhone").val();
        $("#PrimaryPhone").val(fullTelephone.substring(0, 14));
        $("#PrimaryPhoneExtension").val(fullTelephone.substring(14).replace(/\D/g, ''));

        // load photo
        $("#photoContainer").attr("src", `${parentURL}/contacts/!/contacts/${contactId}/photo`);

        // load addresses, phones, email, job history, social media and notes.
        tblContactEmails.ajax.url(`${parentURL}/contacts/!/contacts/${contactId}/emailAdresses`).load();
        tblContactPhones.ajax.url(`${parentURL}/contacts/!/contacts/${contactId}/phones`).load();
        tblContactAddresses.ajax.url(`${parentURL}/contacts/!/contacts/${contactId}/addresses`).load();
        tblPositions.ajax.url(`${parentURL}/contacts/!/contacts/${contactId}/position-history`).load();
        tblContactSocialMedia.ajax.url(`${parentURL}/contacts/!/contacts/${contactId}/social-media`).load();
        tblNotes.ajax.url(`${parentURL}/contacts/!/contacts/${contactId}/notes`).load();
        tblDeals.ajax.url(`${parentURL}/contacts/!/contacts/${contactId}/deals`).load();
        tblAttachments.ajax.url(`${parentURL}/contacts/!/contacts/${contactId}/attachments`).load();

        // load companies
        $.ajax({
            async: true,
            type: get,
            url: `${parentURL}/contacts/!/contacts/${contactId}/company`,
            username: credentials.user,
            password: credentials.password,
            username: credentials.user,
            password: credentials.password,
            success: function (data) {
                if (data.data) {
                    let companies = $("#ExternalCompanyId");
                    companies.append(new Option('', 0));
                    companies.append(new Option(' ** Add a new company ** ', -1));
                    $.each(data.data, function (index, value) {
                        companies.append(new Option(this.Name, this.ExternalCompanyId, false, (this.Selected == 'true')));
                    });
                    companies.trigger("chosen:updated");
                }
            }
        });

        // load selected deals
        $.ajax({
            async: true,
            type: get,
            url: `${parentURL}/contacts/!/contacts/${contactId}/deals`,
            username: credentials.user,
            password: credentials.password,
            success: function (data) {
                if (data.data) {
                    let deals = $("#ContactDeals");
                    deals.append(new Option('', 0));
                    $.each(data.data, function (index, value) {
                        deals.append(new Option(this.DealNumber, this.DealNumber, false, (this.Selected == 'true')));
                    });
                    deals.trigger("chosen:updated");
                }
            }
        });

        // load selected subscriptions
        $('#ContactSubscriptions').empty();
        $.ajax({
            async: true,
            type: get,
            url: `${parentURL}/contacts/!/contacts/${contactId}/subscriptions`,
            username: credentials.user,
            password: credentials.password,
            success: function (data) {
                if (data.data) {
                    let subscriptions = $("#ContactSubscriptions");
                    subscriptions.append(new Option('', 0));
                    $.each(data.data, function (index, value) {
                        subscriptions.append(new Option(this.Description, this.SubscriptionId, false, (this.Selected == 'true')));
                    });
                    subscriptions.trigger("chosen:updated");
                }
            }
        });

        // Load a list of social media
        $.ajax({
            async: true,
            type: get,
            url: `${parentURL}/contacts/!/social-media`,
            username: credentials.user,
            password: credentials.password,
            success: function (data) {
                let socialMedia = [];
                if (data) {
                    for (let index = 0; index < data[0].length; index++) {
                        socialMedia.push({
                            value: data[0][index].SocialMediaId,
                            label: data[0][index].Description
                        });
                    };
                    editorSocialMedia.field('SocialMediaId').update(socialMedia);
                }
            }
        });

        // Load a list of deals
        $.ajax({
            async: true,
            type: get,
            url: `${parentURL}/contacts/!/deals`,
            username: credentials.user,
            password: credentials.password,
            success: function (data) {
                if (data) {
                    $("#newDeal").empty();
                    $("#newDeal").append(new Option("Select new option", "0"));
                    if (data[0]) {
                        for (let index = 0; index < data[0].length; index++) {
                            $("#newDeal").append(new Option(data[0][index].DealNumber, data[0][index].DealNumber));
                        };
                    }
                }
                $("#newDeal").chosen({ "allow_singe_deselect": true, "width": "95%" });
            }
        });
    };


    // Init photo drop zone
    $("#photoDropZone").dropzone({
        url: `${parentURL}/contacts/!/contacts/${contactId}/photo/`,
        acceptedFiles: 'image/jpeg,image/png,image/gif',
        params: { contactId: contactId },
        createImageThumbnails: false,
        success: function (file, response) {
            let d = new Date();
            file.previewElement.innerHTML = "";
            $("#photoContainer").attr("src", "/contacts/!/contacts/" + contactId + "/photo?" + d.getTime());
        }
    });

    // Init contact's attachments drop zone
    $("#attachmentDropZone").dropzone({
        url: `${parentURL}/contacts/!/contacts/${contactId}/attachments/`,
        params: { contactId: contactId },
        dictDefaultMessage: '<big><big><big><i class="fa fa-paperclip"></i></big></big></big> <b>Drop files here to upload</b>',
        createImageThumbnails: false,
        success: function (file, response) {
            contactAttachments.push(response);
            $('#attachmentDropZone')[0].dropzone.files.forEach(function (file) {
                file.previewElement.remove();
            });
            $('#attachmentDropZone').removeClass('dz-started');

            if (contactId > 0) {
                tblAttachments.ajax.url(`${parentURL}/contacts/!/contacts/${contactId}/attachments`).load();
            }
        },
        error: function (errorMessage, xhr) {
            console.log('errorMessage : ', errorMessage);
        }
    });


    // Converts an html form to its JSON representation (for form submission via ajax)
    function toJSONString(form) {
        var obj = {};
        var elements = form.serializeArray();
        for (var i = 0; i < elements.length; ++i) {
            var element = elements[i];
            var name = element.name;
            var value = element.value;

            if (name) {
                obj[name] = value;
            }
        }
        return JSON.stringify(obj);
    }

    // Display temporary panel with error message
    function displayError(errorMessage) {
        $("#errorMessage").text(errorMessage);
        $("#errorPanel").show('fade');
        setTimeout(function () {
            $("#errorPanel").hide('fade');
        }, 5000);

    }

    // Display temporary panel with success message
    function displaySuccessMessage(successMessage) {
        $("#successMessage").text(successMessage);
        $("#successPanel").show('fade');
        setTimeout(function () {
            $("#successPanel").hide('fade')
        }, 1000);
    }

    // Check a date is valid
    function isValidDate(d) {
        if (d) {
            let m = moment(d, 'YYYY-MM-DD');
            return m.isValid(); // false
        }
        else
            return true
    }


    // clear phone number formatting
    function cleanPhoneNumber(phoneNumberString) {
        return ('' + phoneNumberString).replace(/\D/g, '');
    }


    // forma phone numbers (US Standard 10 digits (nnn) nnn-nnnn )
    function formatPhoneNumber(phoneNumberString) {
        phoneNumberString = cleanPhoneNumber(phoneNumberString);
        let match = phoneNumberString.match(/^(\d{3})(\d{3})(\d{4})$/);
        if (match) {
            editorPhone.field('Phone').error('');
            return '(' + match[1] + ') ' + match[2] + '-' + match[3];
        }
        else {
            // there is a validation error, we need 10 numbers
            editorPhone.field('Phone').error('The standard American telephone number is ten digits.');
            return phoneNumberString
        }
    }


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

    let notesAjaxURL = `${parentURL}/companies/!/companies/`;
    if ($("#detailsCompanyId").val() != "") {
        notesAjaxURL = notesAjaxURL + $("#detailsCompanyId").val() + "/notes";
    }
    else {
        notesAjaxURL = notesAjaxURL + "0" + "/notes";
    }

    // Enable rich text editor
    $('#editNoteText').jqte();

    function clearNoteControls() {
        // Init the note fields
        $("#editNoteId").val("0"); // New note id
        $("#editNoteSourceId").val($("#detailsCompanyId").val()); // Note source is the external company Id
        $('#editNoteText').jqteVal("")
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
        // Clear the voice note container and array
        clearVoiceNoteContainer("#voiceNoteList");
    };

    function loadNote(data) {
        let formatedToday = getFormattedDate(today);
        // Prep up the edit panel
        $('#editNoteId').val(data.NoteId);
        $('#editNoteSourceId').val(data.SourceId);
        $("#AttachmentNoteId").val(data.NoteId);
        $("#AttachmentNoteTempPath").val("");
        $('#editNoteType').val(data.Source);
        $('#editNoteText').jqteVal(data.Note);
        $("#editNoteFollowUpType").val(data.FollowUpType);
        // Clear the voice note container and array
        clearVoiceNoteContainer("#voiceNoteList");
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
            type: "GET",
            async: false,
            username: credentials.user,
            password: credentials.password,
            success: function (noteDetails) {
                $("#editNoteWhoCreated").val(noteDetails.data[0].WhoCreatedName + " on " + noteDetails.data[0].WhenCreated.substr(0, 10) + " " + noteDetails.data[0].WhenCreated.substr(11, 8));
                if (noteDetails.data[0].WhoChangedName !== null) {
                    $("#editNoteWhoChanged").val(noteDetails.data[0].WhoChangedName + " on " + noteDetails.data[0].WhenChanged.substr(0, 10) + " " + noteDetails.data[0].WhenChanged.substr(11, 8));
                }
            }
        });

        // Retrieve linked employees / contacts
        $.ajax({
            url: `${parentURL}/notes/!/note/${data.NoteId}/attendees`,
            type: "GET",
            async: false,
            username: credentials.user,
            password: credentials.password,
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
            type: "GET",
            async: false,
            username: credentials.user,
            password: credentials.password,
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
            type: "GET",
            async: false,
            username: credentials.user,
            password: credentials.password,
            success: function (voiceNoteList) {
                if (!(voiceNoteList.data === {})) {
                    // There is a list of voice notes, traverse through it
                    for (let item = 0; item < voiceNoteList.data.length; item++) {
                        // Retrieve the voice note content
                        $.ajax({
                            url: `${parentURL}/notes/!/voicenote/` + voiceNoteList.data[item].VoiceNoteId,
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


    // Attachments

    function addFileToAttachmentsContainer(noteId, arrayIndex, filename) {
        $("#noteAttachments").append('<div class="row"><div class="col"><a href="/s/notes/attachments/' + noteId + '/' + filename + '" target="_blank">' + filename + '</a></div><div class="col"><input class="form-check-input" type="checkbox" value="" id="chkDiscardNoteAttachment' + arrayIndex + '"><label class="form-check-label" for=id="chkDiscardNoteAttachment' + arrayIndex + '">&nbsp;&nbsp;&nbsp;&nbsp;   Discard</label></div></div>');
    }

    function loadNoteAttachments(notePath) {
        noteAttachments.length = 0;
        let noteAttachmentPath = `${parentURL}/notes/!/note/attachments/` + notePath;
        $("#noteAttachments").empty();
        $.ajax({
            url: noteAttachmentPath,
            type: "GET",
            async: false,
            username: credentials.user,
            password: credentials.password,
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

    function deleteNote(contactId, noteId) {
        let url = `${parentURL}/contacts/!/contacts/${contactId}/notes/${noteId}/`;
        let data = { action: 'remove' };
        $.ajax({
            url: url,
            type: "POST",
            async: false,
            data: data,
            username: credentials.user,
            password: credentials.password,
            success: function () {
                tblNotes.ajax.reload(null, false);
            }
        });
    }

    function sendNoteEmail() {
        // Check if there are recipients selected
        let recipientList = $("#emailNoteRecipients").val().join(",");
        if (recipientList !== "") {
            // Got the recipient list, let's send the email
            let sendEmailURL = parentURL + "/notes/!/note/" + $("#emailNoteId").val() + "/sendEmail" + "?recipients=" + recipientList;
            $.ajax({
                url: sendEmailURL,
                type: "POST",
                username: credentials.user,
                password: credentials.password,
                success: function () {
                    alert("Email has been sent.");
                    $("#notesDialogEmail").dialog("close");
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    alert("There was an error delivering email. Error message: (" + textStatus + ")");
                }
            });



        }
        else {
            alert("Please select email recipients.")
        }
    }


    // Init Dropzone object, need to do this within the js file and not from the template
    // in order to attach the "on complete" event handler below.
    var dropZone = new Dropzone("div#FormDropZone", {
        url: "/notes/!/note/dropzone"
    });


    // We append to the form data the values we need in sever-side for processing
    dropZone.on("sending", function (file, xhr, formData) {
        formData.append("AttachmentNoteTempPath", $("#AttachmentNoteTempPath").val());
        formData.append("AttachmentNoteId", $("#AttachmentNoteId").val());
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


    // Submit a Note
    function submitNote() {
        let noteText = $('#editNoteText').val();
        if (noteText != "") {
            let noteId = $("#editNoteId").val();
            let followUp = $("#editNoteFollowUp").val();
            let followUpType = $("#editNoteFollowUpType").val();
            let linkedEmployees = $("#editNoteAttendeeEmployee").val().join(",");
            let linkedContacts = $("#editNoteAttendeeContact").val().join(",");
            let followUpParty = $("#editNoteFollowUpEmployee").val().join(",");
            let url = `${parentURL}/contacts/!/contacts/${contactId}/notes/${noteId}`;
            let isNewNote = ($("#editNoteId").val() === "0");
            let payload = {
                note: noteText,
                followUp: followUp,
                followUpType: followUpType,
                linkedEmployees: linkedEmployees,
                linkedContacts: linkedContacts,
                followUpParty: followUpParty,
                action: 'update'
            };
            let noteSourceId = contactId
            let senderId = UserId;

            $.ajax({
                url: url,
                type: 'post',
                data: payload,
                username: credentials.user,
                password: credentials.password,
                success: function (response) {
                    tblNotes.ajax.reload();
                    noteId = response.data[0].NoteId;

                    // Check if there are attachments
                    if (noteAttachments.length > 0) {
                        // If this is a new note and attachments were added, we need to make sure that they get 
                        // transferred from the temporary folder to the new note attachment folder
                        if (isNewNote) {
                            let saveAttachmentsURL = `${parentURL}/notes/!/note/${noteId}/saveTempAttachments/` + $("#AttachmentNoteTempPath").val();
                            $.ajax({
                                type: 'POST',
                                url: saveAttachmentsURL,
                                username: credentials.user,
                                password: credentials.password
                            })
                        }

                        // Check for attachments tagged for deletion
                        let deleteURL;
                        let attachmentIndex = 0;
                        for (attachmentIndex = 0; attachmentIndex < noteAttachments.length; attachmentIndex++) {
                            // Check if the "discard" checkbox is checked
                            if ($("#chkDiscardNoteAttachment" + (attachmentIndex + 1).toString()).is(":checked")) {
                                // Attachment is marked for deletion, let's remove it
                                deleteURL = `${parentURL}/notes/!/note/${noteId}/attachments?filename=` + escape(noteAttachments[attachmentIndex]);
                                $.ajax({
                                    type: 'DELETE',
                                    url: deleteURL,
                                    username: credentials.user,
                                    password: credentials.password,
                                })
                            };
                        }
                    }


                    // Check if there are voiceNotes to be saved
                    if (voiceNotes.length > 0) {
                        // Get the note Id, we'll need it to tag the voice notes
                        if ($("#editNoteId").val() == "0") {
                            noteId = response.data[0].NoteId;
                        }
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
                                    type: "POST",
                                    username: credentials.user,
                                    password: credentials.password,
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
                                    url: parentURL + "/notes/!/voicenote/" + voiceNotes[voiceNoteIndex].voiceNoteId,
                                    type: "DELETE",
                                    username: credentials.user,
                                    password: credentials.password,
                                    success: function () {
                                        // Deleted it!
                                    }
                                });
                            }
                        }
                    }
                    // Clear the voice note container and array
                    clearVoiceNoteContainer("#voiceNoteList");



                },
                error: function (jqXHR, textStatus, errorThrown) {
                    displayError('We were unable to store this note. (' + textStatus + ')');
                }
            });
        }
        else {
            // an empty note was submitted
        };
    };

    function checkExistingContact() {
        let firstName = $("#FirstName").val().trim();
        let lastName = $("#LastName").val().trim();
        let newContact = $("#newContact").val();

        if (newContact == 'yes') {
            if (firstName.length > 0 && lastName.length > 0) {
                tblConfirmNew.ajax.url(`${parentURL}/contacts/!/contacts/checkName/${firstName}/${lastName}`).load(function () {
                    if (tblConfirmNew.rows().count() > 0) {
                        $("#newContactDialogConfirm").dialog("open");
                        tblConfirmNew.columns.adjust().draw();
                    }
                });
            }
            else {
                alert('Please provide first name and last name');
            }
        }
    }


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
            // Then add the recognized text to our editor
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



    $('#tblNotes tbody').on('click', 'tr', function () {
        clearVoiceNoteContainer("#voiceNoteList");
        if (tblNotes.row(this).data()) {
            $("#editNoteId").val(tblNotes.row(this).data().NoteId);
            $('#editNoteText').jqteVal(tblNotes.row(this).data().Note);
            $("#editNoteFollowUp").val(tblNotes.row(this).data().FollowUp);
        }
    });

    tblNotes.on('select deselect', function () {
        let selectedRows = tblNotes.rows({ selected: true }).count();
        tblNotes.button(1).enable(selectedRows === 1);
    });

    // Load a contact record into the web page
    loadRecord();

});