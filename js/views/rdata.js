/*

    RData 

*/

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
var moreDays = 0;
var moreDaysArchive = 0;


// The ever conspicuous document ready function...
$(document).ready(function () {
    const attachment = '<i class="fa fa-paperclip" aria-hidden="true"></i>';
    const leftPan = '<b><span title="{fromEmail}">{from}<span></b><br><b><font color="green">{subject}</font></b><br><small>{preview}</small>';
    const rightPan = `{flag}&nbsp;&nbsp;<a href="#" onclick="deleteEmail('{mailId}')"><i class="fa fa-trash-o" aria-hidden="true" title="Delete email"></i></a>&nbsp;&nbsp;<a href="#" onclick="archiveEmail('{mailId}')" title="Archive email"><i class="fa fa-archive" aria-hidden="true"></i></a>&nbsp;&nbsp;{attachment}<br><span title="{longTimestamp}">{shortTimestamp}</span>`;

    /*
        Init UI    
    */

    // "Edit" Links are hidded by default
    $("#lnkEditDeal").hide();
    $("#lnkEditContact").hide();
    $("#lnkEditCompany").hide();
    $("#lnkEditCalendarEvent").hide();
    $("#mailLoading").hide();

    // load selectors
    loadDropDown('#dealId', 'DealNumber', 'DealIntId', "0", `${parentURL}/deals/!/deals`, [{ text: "", value: "0", location: "pre" }, { text: "Create a new Deal...", value: "-1", location: "pre" }]);
    loadDropDown('#contactId', 'FullName', 'ContactId', "0", `${parentURL}/contacts/!/contacts/shortList`, [{ text: "", value: "0", location: "pre" }, { text: "Create a new Contact...", value: "-1", location: "pre" }]);
    loadDropDown('#companyId', 'Name', 'Id', "0", `${parentURL}/deals/!/external/companies`, [{ text: "", value: "0", location: "pre" }, { text: "Create a new Company...", value: "-1", location: "pre" }]);
    loadDropDown('#calendarEventId', 'Title', 'CalendarId', "0", `${parentURL}/calendar/!/events/future`, [{ text: "", value: "0", location: "pre" }, { text: "Create a new event calendar...", value: "-1", location: "pre" }]);


    /*
        Init plugins
    */

    // chosen dropdowns
    $("#dealId").chosen({ "allow_singe_deselect": false, "width": "95%" });
    $("#dealTarget").chosen({ "allow_singe_deselect": false, "width": "95%" });

    $("#contactId").chosen({ "allow_singe_deselect": false, "width": "95%" });
    $("#contactTarget").chosen({ "allow_singe_deselect": false, "width": "95%" });

    $("#companyId").chosen({ "allow_singe_deselect": false, "width": "95%" });
    $("#companyTarget").chosen({ "allow_singe_deselect": false, "width": "95%" });

    $("#calendarEventId").chosen({ "allow_singe_deselect": false, "width": "95%" });
    $("#calendarEventTarget").chosen({ "allow_singe_deselect": false, "width": "95%" });


    // Datatable containing inbox data
    var tblInbox = $('#tblInbox').DataTable({
        dom: "",
        ajax: `${parentURL}/rdata/!/inbox/inbox`,
        scrollY: 600,
        scrollCollapse: true,
        select: true,
        paging: false,
        ordering: false,
        processing: true,
        language: {
            processing: '<img src="/s/img/ajax-loader.gif">'
        },
        columns: [
            { data: "id" },
            {
                data: "bodyPreview", mRender: function (data, type, full) {
                    let subject = full.subject;
                    let from = full.from.emailAddress.name;
                    let fromEmail = full.from.emailAddress.address;
                    let preview = full.bodyPreview;
                    return leftPan.replace('{subject}', subject).replace('{from}', from).replace('{fromEmail}', fromEmail).replace('{preview}', preview);
                }
            },
            {
                data: "bodyPreview", mRender: function (data, type, full) {
                    let flagCompleted = `<a href="#" onclick="resetFlag('{mailId}', 'notFlagged')" title="Reset flag" ><font color="green"><i class="fa fa-flag" aria-hidden="true"></i></font></a>`;
                    let flagDefault = `<a href="#" onclick="resetFlag('{mailId}', 'complete')" title="Set flag completed"><i class="fa fa-flag-o" aria-hidden="true"></i></a>`;
                    let shortTimestamp = new Date(full.sentDateTime).toLocaleDateString();
                    let longTimestamp = new Date(full.sentDateTime).toLocaleString();
                    let flag = '';

                    if (full.flag.flagStatus == "complete")
                        flag = flagCompleted.replace("{mailId}", full.id);
                    else
                        flag = flagDefault.replace("{mailId}", full.id);

                    return rightPan.replace('{flag}', flag).replace('{shortTimestamp}', shortTimestamp).replace('{longTimestamp}', longTimestamp).replace('{mailId}', full.id).replace('{mailId}', full.id).replace('{attachment}', (full.hasAttachments) ? attachment : '');
                }
            }
        ],
        columnDefs: [
            { "targets": [0], "visible": false },
        ]
    });


    // Datatable containing archive data
    var tblArchive = $('#tblArchive').DataTable({
        dom: "",
        ajax: `${parentURL}/rdata/!/inbox/archive`,
        scrollY: 600,
        scrollCollapse: true,
        select: true,
        paging: false,
        ordering: false,
        processing: true,
        language: {
            processing: '<img src="/s/img/ajax-loader.gif">'
        },
        columns: [
            { data: "id" },
            {
                data: "bodyPreview", mRender: function (data, type, full) {
                    let subject = full.subject;
                    let from = full.from.emailAddress.name;
                    let fromEmail = full.from.emailAddress.address;
                    let preview = full.bodyPreview;
                    return leftPan.replace('{subject}', subject).replace('{from}', from).replace('{fromEmail}', fromEmail).replace('{preview}', preview);
                }
            },
            {
                data: "bodyPreview", mRender: function (data, type, full) {
                    let flagCompleted = `<a href="#" onclick="resetFlag('{mailId}', 'notFlagged')"><font color="green"><i class="fa fa-flag" aria-hidden="true"></i></font></a>`;
                    let flagDefault = `<a href="#" onclick="resetFlag('{mailId}', 'complete')"><i class="fa fa-flag-o" aria-hidden="true"></i></a>`;
                    let shortTimestamp = new Date(full.sentDateTime).toLocaleDateString();
                    let longTimestamp = new Date(full.sentDateTime).toLocaleString();
                    let flag = '';

                    if (full.flag.flagStatus == "complete")
                        flag = flagCompleted.replace("{mailId}", full.id);
                    else
                        flag = flagDefault.replace("{mailId}", full.id);

                    return (full.hasAttachments) ? attachment : '';
                }
            }
        ],
        columnDefs: [
            { "targets": [0], "visible": false },
        ]
    });



    // Reply mail dialog
    $("#replyMailDialog").dialog({
        autoOpen: false,
        width: 600,
        height: 600,
        buttons:
            [
                {
                    text: "Reply",
                    click: function () {
                        let mailId = $("#mailId").val();
                        let emailMessage = $("#emailMessage").val();
                        $.ajax({
                            async: true,
                            type: 'post',
                            url: `${parentURL}/rdata/!/inbox/email/${mailId}/reply`,
                            data: { "message": emailMessage },
                            success: function (data) {
                                $("#emailMessage").val('');
                            },
                            error: function () {
                                console.log('error: cannot reply message to sender, please try again');
                            }
                        });
                        $(this).dialog("close");
                    }
                },
                {
                    text: "Reply All",
                    click: function () {
                        let mailId = $("#mailId").val();
                        let emailMessage = $("#emailMessage").val();
                        $.ajax({
                            async: true,
                            type: 'post',
                            url: `${parentURL}/rdata/!/inbox/email/${mailId}/replyAll`,
                            data: { "message": emailMessage },
                            success: function (data) {
                                $("#emailMessage").val('');
                            },
                            error: function () {
                                console.log('error: cannot reply-all message to sender, please try again');
                            }
                        });
                        $(this).dialog("close");
                    }
                },
                {
                    text: "Cancel",
                    click: function () {
                        $("#emailMessage").val('');
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



    /*
        Event Handlers
    */

    // Datatable row click
    $("body").on("click", "#tblInbox tbody tr", function () {
        if ($(this).hasClass('selected')) $(this).removeClass('selected');
        else {
            $(this).siblings('.selected').removeClass('selected');
            $(this).addClass('selected');
            let selectedItem = tblInbox.rows('.selected').data();
            refreshMailPanel(tblInbox.rows('.selected').data()["0"].id);
        }
    });

    $("body").on("click", "#tblArchive tbody tr", function () {
        if ($(this).hasClass('selected')) $(this).removeClass('selected');
        else {
            $(this).siblings('.selected').removeClass('selected');
            $(this).addClass('selected');
            let selectedItem = tblArchive.rows('.selected').data();
            refreshMailPanel(tblArchive.rows('.selected').data()["0"].id);
        }
    });

    // Page Buttons: Reply
    $('#btnReply').on("click", function () {
        if ($("#mailId").val().length > 0) {
            $("#replyMailDialog").dialog("open")
        }
        else {
            alert("Please select an email first")
        }
    });

    // Page Buttons: Submit
    $("#btnSubmit").on("click", function () {
        nd = validate(true);
        if (nd.valid == true) {
            submitRequest(nd.entityName, nd.entityId, nd.target, nd.comment, nd.mailId);
        }
    });

    // "Assign To" Pills: need to keep which "tab" is selected
    $("#pillDeal").on("click", function () {
        $("#selectedAssignmentType").val("deal");
    });
    $("#pillContact").on("click", function () {
        $("#selectedAssignmentType").val("contact");
    });
    $("#pillCompany").on("click", function () {
        $("#selectedAssignmentType").val("company");
    });
    $("#pillCalendar").on("click", function () {
        $("#selectedAssignmentType").val("calendar");
    });

    // disable "submit" button when Archive inbox is selected, enable when inbox is selected
    $("#pillInbox").on("click", function () {
        $("#btnSubmit").show();
    });

    $("#pillArchive").on("click", function () {
        $("#btnSubmit").hide();
    });

    // Entity selectors: hide edit link when no entity selected, open new.
    $("#dealId").on("change", function () {
        switch ($('#dealId').chosen().val()) {
            case "0":
                $("#lnkEditDeal").hide();
                break
            case "-1":
                // create a new deal, attach the note
                $("#lnkEditDeal").hide();
                let nd = validate(false);
                if (nd.valid == true) {
                    attachNoteInCookie(nd.entityName, nd.entityId, nd.target, nd.comment, nd.mailId);
                    // window.open(`${parentURL}/deals/dealdetails/new`, '_blank');
                    location.href = `./dealdetails.html?dealNumber=new`;
                }
                break
            default:
                $("#lnkEditDeal").show();
                break
        }
    });
    $("#contactId").on("change", function () {
        switch ($('#contactId').chosen().val()) {
            case "0":
                $("#lnkEditContact").hide();
                break
            case "-1":
                // create new empty contact, attach the note.
                $("#lnkEditContact").hide();
                let nd = validate(false);
                if (nd.valid == true) {
                    attachNoteInCookie(nd.entityName, nd.entityId, nd.target, nd.comment, nd.mailId);
                    $.ajax({
                        url: `${parentURL}/contacts/!/contacts/new`,
                        type: 'post',
                        contentType: 'application/json',
                        success: function (resp) {
                            let contactId = resp.data.ContactId;
                            //window.open(`${parentURL}/contacts/${contactId}?new=yes`, '_blank');
                            location.href = `./contactdetails.html?contactId=${contactId}&new=yes`;
                        },
                        error: function (jqXHR, textStatus, errorThrown) {
                            console.log('Unable to create new contact. (' + textStatus + ')');
                        }
                    });
                }
                break
            default:
                $("#lnkEditContact").show();
                break
        }
    });
    $("#companyId").on("change", function () {
        switch ($('#companyId').chosen().val()) {
            case "0":
                $("#lnkEditCompany").hide();
                break
            case "-1":
                // create a new Company
                $("#lnkEditCompany").hide();
                let nd = validate(false);
                if (nd.valid == true) {
                    attachNoteInCookie(nd.entityName, nd.entityId, nd.target, nd.comment, nd.mailId);
                    // window.open(`${parentURL}/companies/new`, '_blank');
                    location.href = `./companydetails.html?companyId=new`;
                };
                break
            default:
                $("#lnkEditCompany").show();
                break
        }
    });
    $("#calendarEventId").on("change", function () {
        switch ($('#calendarEventId').chosen().val()) {
            case "0":
                $("#lnkEditCalendarEvent").hide();
                break
            case "-1":
                // create a new caledar event, and attach a note
                $("#lnkEditCalendarEvent").hide();
                let nd = validate(false);
                if (nd.valid == true) {
                    attachNoteInCookie(nd.entityName, nd.entityId, nd.target, nd.comment, nd.mailId);
                    // window.open(`${parentURL}/calendar/new`, '_blank');
                    location.href = './calendardetails.html?calendarId=new'
                };
                break
            default:
                $("#lnkEditCalendarEvent").show();
                break
        }
    });


    // Target selectors: hide notes when target is "attachments"
    $("#dealTarget").on("change", function () {
        if ($("#dealTarget").chosen().val() == "notes") {
            $("#panelDealNotes").show();
        }
        else {
            $("#panelDealNotes").hide()
        };
    });
    $("#contactTarget").on("change", function () {
        if ($("#contactTarget").chosen().val() == "notes") {
            $("#panelContactNotes").show();
        }
        else {
            $("#panelContactNotes").hide()
        };
    });
    $("#companyTarget").on("change", function () {
        if ($("#companyTarget").chosen().val() == "notes") {
            $("#panelCompanyNotes").show();
        }
        else {
            $("#panelCompanyNotes").hide()
        };
    });


    // edit links
    $("#lnkEditDeal").on("click", function () {
        let dealNumber = $("#dealId option:selected").text();
        //window.open(`${parentURL}/deals/dealdetails/${deal}`, '_self');
        location.href = `./dealdetails.html?dealNumber=${dealNumber}`;
    });
    $("#lnkEditContact").on("click", function () {
        let contactId = $("#contactId").chosen().val();
        //window.open(`${parentURL}/contacts/${contactId}`, '_self');
        location.href = `./contactdetails.html?contactId=${contactId}`;
    });
    $("#lnkEditCompany").on("click", function () {
        let companyId = $("#companyId").chosen().val().replace('COMPANY-', '');
        // window.open(`${parentURL}/companies/${companyId}`, '_self');
        location.href = `./companydetails.html?companyId=${companyId}`;
    });
    $("#lnkEditCalendarEvent").on("click", function () {
        let calendarEventId = $("#calendarEventId").chosen().val();
        // window.open(`${parentURL}/calendar/${calendarEventId}`, '_self');
        location.href = `./calendardetails.html?calendarId=${calendarEventId}`;
    });

    // fetch more (older) email into inbox
    $("#lnkLoadMore").on("click", function () {
        $("#mailLoading").show();
        moreDays = moreDays + 10;
        tblInbox.ajax.url(`${parentURL}/rdata/!/inbox/inbox?loadMore=${moreDays}`).load(function () { $("#mailLoading").hide(); });
    });

    // fetch more (older) email into inbox/archive
    $("#lnkLoadMoreArchive").on("click", function () {
        $("#mailLoading").show();
        moreDaysArchive = moreDaysArchive + 10;
        tblArchive.ajax.url(`${parentURL}/rdata/!/inbox/archive?loadMore=${moreDaysArchive}`).load(function () { $("#mailLoading").hide(); });
    });


    /* 
         Support functions
    */

    // Refresh data contained in Mail panel
    function refreshMailPanel(mailId) {
        $("#mailLoading").show();
        resetMailPanel();
        $.ajax({
            async: true,
            url: `${parentURL}/rdata/!/inbox/email/${mailId}`,
            success: function (data) {
                $("#mailLoading").hide();
                let longTimestamp = new Date(data.mail.sentDateTime).toLocaleString();
                let mailToRecipients = getMailPeopleList('To: ', data.mail.toRecipients);
                let mailCcRecipients = getMailPeopleList('Cc: ', data.mail.ccRecipients);
                let hasAttachments = (data.mail.hasAttachments == true) ? "<big><i class='fa fa-paperclip' aria-hidden='true'></i></big>" : "";

                $("#mailBodyPanel").html(data.mail.body.content);
                $("#mailId").val(data.mail.id);
                $("#emailSubject").html(data.mail.subject);
                $("#emailFrom").html(data.mail.sender.emailAddress.name);
                $("#emailSentDateTime").html(longTimestamp);
                $("#emailToRecipients").html(mailToRecipients);
                $("#emailCcRecipients").html(mailCcRecipients);
                $("#emailHasAttachments").html(hasAttachments);
                $("#emailHasAttachmentsFlag").val(data.mail.hasAttachments);

                if (data.mail.hasAttachments) {
                    $.ajax({
                        async: true,
                        url: `${parentURL}/rdata/!/inbox/email/${mailId}/attachments`,
                        success: function (data) {
                            let attachmentLinks = '';
                            for (let i = 0; i < data.attachmentList.value.length; i++) {
                                attachmentLinks = attachmentLinks + getAttachmentLinkCode(mailId, data.attachmentList.value[i].id, data.attachmentList.value[i].name, data.attachmentList.value[i].contentType);
                            }
                            $("#attachmentsPanel").html(attachmentLinks);
                        },
                        error: function () {
                            console.log('cannot read attachment list');
                        }
                    })
                }
            },
            error: function () {
                $("#mailLoading").hide();
                console.log('cannot read email');
            }
        })
    };


    // get a list of people, separated by comma
    function getMailPeopleList(prefix, data) {
        let peopleList = '';
        if (data) {
            for (let i = 0; i < data.length; i++) {
                peopleList = peopleList + data[i].emailAddress.name + ',';
            }

            if (peopleList.length > 0) {
                peopleList = peopleList.slice(0, -1);
                peopleList = '<b>' + prefix + '</b>' + peopleList
            }
        }
        return peopleList
    }

    // get the HTML code to add a link to attachment.
    function getAttachmentLinkCode(emailId, attachmentId, fileName, contentType) {
        let url = `${parentURL}/rdata/!/inbox/email/${emailId}/attachments/${attachmentId}`;
        let icon = getFileTypeIcon(contentType);
        return ` <span style="white-space: nowrap"><a href="${url}"><big><i class="fa ${icon}" aria-hidden="true"></i></big> ${fileName}</a></span><br>`;
    }

    // Get font-awesome (FA) icon specification according to the content's mime-type
    function getFileTypeIcon(contentType) {
        switch (contentType) {
            case 'text/plain':
            case 'text/csv':
                return 'fa-file-text-o'
                break
            case 'application/pdf':
                return 'fa-file-pdf-o'
                break
            case 'application/vnd.ms-excel':
            case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                return 'fa-file-excel-o'
                break
            case 'application/msword':
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                return 'fa-file-word-o'
                break
            case 'application/vnd.ms-powerpoint':
            case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
                return 'fa-file-powerpoint-o'
                break
            case 'audio/basic':
            case 'audio/x-midi':
            case 'audio/mpeg':
            case 'audio/wav':
            case 'audio/x-wav':
            case 'audio/x-m4a':
                return 'fa-file-audio-o'
                break
            case 'video/msvideo':
            case 'video/avi':
            case 'video/x-msvideo':
            case 'video/mpeg':
            case 'video/quicktime':
            case 'video/mp4':
                return 'fa-file-video-o'
                break
            case 'image/bmp':
            case 'image/gif':
            case 'image/jpeg':
            case 'image/png':
            case 'image/svg+xml':
            case 'image/tiff':
                return 'fa-file-image-o'
                break
            case 'application/x-gzip':
            case 'application/x-tar':
            case 'application/zip':
            case 'application/x-compressed-zip':
            case 'application/vnd.rar':
            case 'application/x-zip-compressed':
                return 'fa-file-zip-o'
                break
            default:
                return 'fa-file-o'
                break
        }
    }
});


// Validate Submit Form
function validate(editExistingFlag) {
    let errors = "";
    let mailId = $("#mailId").val();
    let selectedAssignmentType = $("#selectedAssignmentType").val();
    let entityId = 0;
    let entityName = "";
    let target = 0;
    let hasAttachmentsFlag = $("#emailHasAttachmentsFlag").val();
    let comment = "";
    let noteSpec = {};

    switch (selectedAssignmentType) {
        case "deal":
            entityName = "Deal"
            entityId = $("#dealId").chosen().val();
            target = $("#dealTarget").chosen().val();
            comment = $("#dealNotes").val();
            break;
        case "contact":
            entityName = "Contact"
            entityId = $("#contactId").chosen().val();
            target = $("#contactTarget").chosen().val();
            comment = $("#contactNotes").val();
            break;
        case "company":
            entityName = "Company"
            entityId = $("#companyId").chosen().val().replace('COMPANY-', '');
            target = $("#companyTarget").chosen().val();
            comment = $("#companyNotes").val();
            break;
        case "calendar":
            entityName = "calendar";
            entityId = $("#calendarEventId").chosen().val();
            target = $("#calendarEventTarget").chosen().val();
            comment = $("#calendarEventNotes").val();
    }

    if (mailId.trim().length == 0) {
        errors = " - Please select an email from the list. \r\n";
    }

    // only require a selected entity name if we are not creating a new entity record (add new)
    if (editExistingFlag && (entityId == "0" || entityId == "-1")) {
        errors = errors + ` - Please select a ${entityName} from the list \r\n`;
    }

    if (target == "attachments" && hasAttachmentsFlag == "false") {
        errors = errors + ` - You have selected "Target=Attachments" but this email has no attachments \r\n`;
    }

    if (errors.length == 0) {
        noteSpec = {
            entityName: entityName,
            entityId: entityId,
            target: target,
            comment: comment,
            mailId: mailId,
            valid: true
        };
        return noteSpec
    }
    else {
        alert("The following errors were detected: \r\n" + errors);
        noteSpec = {
            entityName: "",
            entityId: "",
            target: "",
            comment: "",
            mailId: "",
            valid: false
        };
        return noteSpec
    }
}


function submitRequest(entityName, entityId, target, comment, mailId) {
    $("#mailLoading").show();
    $.ajax({
        async: true,
        url: parentURL + `/rdata/!/inbox/email/${mailId}/assign-to/${entityName}`,
        type: 'post',
        data: { entityId: entityId, target: target, comment: comment },
        success: function (data) {
            displaySuccessMessage('Email was successfully assigned');
            $("#mailLoading").hide();
            resetAssignPanel();
            $('#tblInbox').DataTable().ajax.reload();
        },
        error: function () {
            displayError('There was a problem processing your request, please try again');
            $("#mailLoading").hide();
        }
    });
}



// Delete email
var deleteEmail = function (mailId) {
    let r = confirm("Do you really want to delete this email?");
    if (r) {
        $("#mailLoading").show();
        $.ajax({
            async: true,
            url: parentURL + `/rdata/!/inbox/email/${mailId}`,
            type: 'delete',
            success: function (data) {
                $('#tblInbox').DataTable().ajax.reload();
                $("#mailLoading").hide();
            },
            error: function () {
                console.log('cannot delete email');
                $("#mailLoading").hide();
            }
        })
    }
}

// Reset email flag
var resetFlag = function (mailId, flag) {
    $("#mailLoading").show();
    $.ajax({
        async: true,
        url: parentURL + `/rdata/!/inbox/email/${mailId}/flag/${flag}`,
        type: 'post',
        success: function (data) {
            $('#tblInbox').DataTable().ajax.reload();
            $("#mailLoading").hide();
        },
        error: function () {
            console.log('cannot reset email flag');
            $("#mailLoading").hide();
        }
    })
}

// archive email
var archiveEmail = function (mailId) {
    $("#mailLoading").show();
    $.ajax({
        async: true,
        url: parentURL + `/rdata/!/inbox/email/${mailId}/archive`,
        type: 'post',
        success: function (data) {
            resetMailPanel();
            $('#tblInbox').DataTable().ajax.reload();
            $('#tblArchive').DataTable().ajax.reload();
            $("#mailLoading").hide();
        },
        error: function () {
            console.log('cannot reset email flag');
        }
    })
}


// Reset the Mail body panel
function resetMailPanel() {
    $("#mailBodyPanel").html('');
    $("#attachmentsPanel").html('');
    $("#mailId").val('');
    $("#emailSubject").html('');
    $("#emailFrom").html('');
    $("#emailSentDateTime").html('');
    $("#emailToRecipients").html('');
    $("#emailCcRecipients").html('');
    $("#emailHasAttachments").html('');
    $("#emailHasAttachmentsFlag").val('');
}

// Reset the "Assign To" panel
function resetAssignPanel() {
    $("#dealId").val(0); $('#dealId').trigger('chosen:updated');
    $("#dealTarget").val(0); $('#dealTarget').trigger('chosen:updated');
    $("#dealNotes").val('');
    $("#lnkEditDeal").hide();

    $("#contactId").val(0); $('#contactId').trigger('chosen:updated');
    $("#contactTarget").val(0); $('#contactTarget').trigger('chosen:updated');
    $("#contactNotes").val('');
    $("#lnkEditContact").hide();

    $("#companyId").val(0); $('#companyId').trigger('chosen:updated');
    $("#companyTarget").val(0); $('#companyTarget').trigger('chosen:updated');
    $("#companyNotes").val('');
    $("#lnkEditCompany").hide();

    $("#calendarEventId").val(0); $('#calendarEventId').trigger('chosen:updated');
    $("#calendarEventTarget").val(0); $('#calendarEventTarget').trigger('chosen:updated');
    $("#calendarEventNotes").val('');
    $("#lnkEditCalendarEvent").hide();
}


/*
    generic function to populate dropdowns from a REST source
*/
function loadDropDown(dropDownName, itemText, itemValue, selectedValue, urlAjaxSource, arrExtraItems) {
    // Load a list of dearequest, status, errorls
    $.ajax({
        async: true,
        type: 'get',
        url: urlAjaxSource,
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

function attachNoteInCookie(entityName, entityId, target, comment, emailId) {
    let noteSpec = {
        entityName: entityName,
        entityId: entityId,
        target: target,
        comment: comment,
        emailId: emailId,
    };
    bakeCookie('attachNote', noteSpec);
    ipc.sendSync('setRdataAddNew', JSON.stringify(noteSpec));
}


// store data in cookie
function bakeCookie(name, value) {
    let cookie = [name, '=', JSON.stringify(value)].join('');
    document.cookie = cookie;
}



/* 
    Functions to refresh inbox
*/

function checkNewEmail() {
    // if there is new email
    refreshInbox();
}

function refreshInbox() {
    // refresh inbox.
    let tblInbox = $("tblInbox").DataTable();
    tblInbox.ajax.url(`${parentURL}/rdata/!/inbox/inbox?loadMore=${moreDays}`).load();
}

setInterval(checkNewEmail, 30000);


