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

// Retrieve deal's main page filter
let dealsTableState = ipc.sendSync('dealtablestate', '');
dealsTableState = JSON.parse(dealsTableState);
let dealFilters = {
    sqlOrderBy: "9 desc",
    dealName: "",
    basin: "",
    companyId: "''",
    bidAmount: 0,
    bidDueDate: '',
    status: "''",
    sellingParty: '',
    source: '',
    isMapped: null,
    displayDeadDeals: 0
};

if (!$.isEmptyObject(dealsTableState)) {
    dealfilters = {
        sqlOrderBy: dealsTableState.filter.sqlOrderBy,
        dealName: dealsTableState.filter.dealName,
        basin: dealsTableState.filter.basin,
        companyId: dealsTableState.filter.companyId,
        bidAmount: dealsTableState.filter.bidAmount,
        bidDueDate: dealsTableState.filter.bidDueDate,
        status: dealsTableState.filter.status,
        sellingParty: dealsTableState.filter.sellingParty,
        source: dealsTableState.filter.source,
        isMapped: null,
        displayDeadDeals: dealsTableState.filter.displayDeadDeals
    }
}

// Admin user flag was passed through the hidden P tag "userIsAdmin" to handlebars
let UserIsAdmin = ($("#userIsAdmin").text() === 'true');
let UserId = $("#loggedEmployeeId").text();

let DN;

var tDealSourceId;
var tSellingPartyId;
var tADFirmId;
var tBidExternalCompanyId;


// remove cookie by name
function removeCookie(name) {
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/;';
}

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

function isDate(s) {
    date = new Date(s.split('/')[2], s.split('/')[0], s.split('/')[1]);
    return (new Date(date) !== "Invalid Date") && !isNaN(new Date(date));
}

// Get timezone offset
let today = new Date();
let formatedToday = getFormattedDate(today);
let timezoneOffset = today.getTimezoneOffset() * 60000;

// generic function to populate dropdowns from a REST source
function loadDropDown(dropDownName, itemText, itemValue, selectedValue, urlAjaxSource, arrExtraItems) {
    // Load a list of deals
    $.ajax({
        async: true,
        username: credentials.user,
        password: credentials.password,
        type: 'get',
        url: urlAjaxSource,
        success: dropDownAjaxLoad(dropDownName, itemText, itemValue, selectedValue, arrExtraItems)
    });
};

var dropDownAjaxLoad = function (dropDownName, itemText, itemValue, selectedValue, arrExtraItems) {
    return function (resp, textStatus, jqXHR) {

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

function loadPageContent(pageId, pageTitle) {
    let dealNumber = DN;
    let url = `${parentURL}/deals/!/notebook/${dealNumber}/PagePreview/${pageId}`;
    $('#pageViewer').attr('src', url);
    $("#pageName").text(pageTitle);
    return false;
};

function appendHTMLtoContainer(containerName, contents) {
    $(`#${containerName}`).append(contents);
}

// General AJAX functions

async function executeAjaxPost(URL, payload) {
    // This will return either 0 (error) or 1 (success)
    let result = 0;
    let ajaxPostResult = await $.ajax({
        async: true,
        type: 'POST',
        url: URL,
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
        success: function (data) {
            result = data;
        }
    });
    return result;
}

// Turn off Dropzone autodiscovery
Dropzone.autoDiscover = false;

$(document).ready(function () {
    // Retrieve URL parameters
    let URLParamList = window.location.search.substring(1).split("&");
    // First parameter contains the deal number; if value is "new", then we're adding a deak
    let URLParamSet = URLParamList[0].split("=");
    DN = URLParamSet[1];
    // Load deal status selector
    $.ajax({
        url: `${parentURL}/deals/!/dealStatus`,
        username: credentials.user,
        password: credentials.password,
        type: "GET",
        async: false,
        success: function (response) {
            // Traverse through result set
            for (let i = 0; i < response.data.length; i++) {
                $("#status").append(new Option(response.data[i].Status, response.data[i].Status));
            }
        },
        error: function (data) {
            console.log('Ajax error retrieving deal statuses.');
        }
    });
    // Load basin selector
    $.ajax({
        url: `${parentURL}/!/basins`,
        username: credentials.user,
        password: credentials.password,
        type: "GET",
        async: false,
        success: function (response) {
            // Traverse through result set
            for (let i = 0; i < response.data.length; i++) {
                $("#basinId").append(new Option(response.data[i].Name, response.data[i].BasinID));
            }
        },
        error: function (data) {
            console.log('Ajax error retrieving basins.');
        }
    });

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
                $("#companyId").append(new Option(response.data[i].Company, response.data[i].CompanyID));
            }
        },
        error: function (data) {
            console.log('Ajax error retrieving companies.');
        }
    });

    // Load states
    $.ajax({
        url: `${parentURL}/deals/!/dealdetails/${DN}/getStates`,
        username: credentials.user,
        password: credentials.password,
        type: "GET",
        async: false,
        success: function (response) {
            // Traverse through result set
            for (let i = 0; i < response.data.length; i++) {
                $("#state").append(new Option(response.data[i].state, response.data[i].state, (response.data[i].selected != '')));
            }
        },
        error: function (data) {
            console.log('Ajax error retrieving states.');
        }
    });

    // Load journal email recipient list
    $.ajax({
        url: `${parentURL}/!/emails?includeDistributionLists=1`,
        username: credentials.user,
        password: credentials.password,
        type: "GET",
        async: false,
        success: function (response) {
            // Traverse through result set
            for (let i = 0; i < response.data.length; i++) {
                $("#emailJournalRecipients").append(new Option(response.data[i].LastName + " " + response.data[i].FirstName, response.data[i].EmployeeId));
            }
        },
        error: function (data) {
            console.log('Ajax error retrieving employees.');
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
                // $("#emailNoteRecipients").append(new Option(response.data[i].LastName + " " + response.data[i].FirstName, response.data[i].EmployeeId));
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
                $("#editAttendeeContact").append(new Option(response.data[i].LastName + " " + response.data[i].FirstName, response.data[i].ContactId));
            }
        },
        error: function (data) {
            console.log('Ajax error retrieving employees.');
        }
    });

    $('#state').chosen({ width: "100%", allow_single_deselect: true });

    // Check if this isn't a new deal
    if (DN != 'new') {
        // Retrieve previous and next deal numbers
        let previousNextDealsStr = ipc.sendSync('getPNDeals', DN);
        let previousNextDeals = JSON.parse(previousNextDealsStr);
        // Load deal details
        $.ajax({
            url: `${parentURL}/deals/!/getDealByNumberNoNav/${DN}`,
            username: credentials.user,
            password: credentials.password,
            type: "GET",
            async: false,
            success: function (response) {
                // Check if we actually got something back
                if (response.data != null) {
                    // Found deal details, which are contained within response.data[0]
                    $("#DN").val(response.data[0].DealNumber);
                    $("#DNA").val(response.data[0].DealName);
                    $("#PDN").val(previousNextDeals.previousDeal);
                    $("#NDN").val(previousNextDeals.nextDeal);
                    $("#DF").val(response.data[0].DropFolder);
                    $("#DIID").val(response.data[0].DealIntId);
                    $("#dealNumber").val(response.data[0].DealNumber);
                    $("#dealName").val(response.data[0].DealName);
                    $("#state").val([response.data[0].StateIds]).trigger("chosen:updated");
                    loadCounties();
                    $("#basinId").val(response.data[0].BasinID);
                    $("#companyId").val(response.data[0].CompanyID);
                    $("#status").val(response.data[0].Status.trim());
                    $("#titleDefectDueDate").val(response.data[0].TitleDefectDueDate.trim());
                    $("#closingDate").val(response.data[0].ClosingDate.trim());
                    $("#dealRate").val(response.data[0].DealRate);
                    $("#dealSource").val(response.data[0].DealSource);
                    $("#hidDealSourceId").val(response.data[0].DealSourceId);
                    $("#sellingParty").val(response.data[0].SellingParty);
                    $("#hidSellingPartyId").val(response.data[0].SellingPartyId);
                    $("#netAcres").val(response.data[0].NetAcres);
                    $("#netRoyaltyAcres").val(response.data[0].NetRoyaltyAcres);
                    $("#depthsBenches").val(response.data[0].DepthsBenches);
                    $("#ADfirm").val(response.data[0].ADfirm);
                    $("#hidADFirmId").val(response.data[0].ADFirmId);
                    $("#hidBidExternalCompanyId").val(response.data[0].WinBidExternalCompanyId);
                    $("#bidDueDate").val(response.data[0].BidDueDate);
                    if (response.data[0].IsMapped) {
                        $("#isMapped").prop("checked", true);
                    }
                    $("#description").val(response.data[0].Description);
                    $("#opportunityGuid").val(response.data[0].OpportunityGuid);
                    $("#validDealName").val(response.data[0].DealName);
                    $("#popDollarsPerAcre").val(response.data[0].PerAcre);
                    $("#popNetAcres").val(response.data[0].NetAcres);
                    $("#popBidAmount").val(response.data[0].BidAmount);
                    $("#popBidDate").val(response.data[0].BidDate);
                    $("#popWinBidDollarsPerAcre").val(response.data[0].WinBidPerAcre);
                    $("#popWinBidNetAcres").val(response.data[0].WinBidNetAcres);
                    $("#popWinBidAmount").val(response.data[0].WinBidAmount);
                    $("#popWinBidDate").val(response.data[0].WinBidDate);

                    $("#editDateSourced").text(response.data[0].DateSourced);
                    $("#editWhoEntered").text(response.data[0].WhoEntered);
                    $("#editDateChanged").text(response.data[0].DateChanged);
                    $("#editWhoChanged").text(response.data[0].WhoChanged);

                    // Check if there is a drop folder
                    if (response.data[0].IsDropFolder) {
                        // Load drop folder values
                        $("#DealNumber").val(response.data[0].DealNumber);
                        $("#DealName").val(response.data[0].DealName);
                        $("#DropFolder").val(response.data[0].DropFolder);
                        $("#dropFolder").val(response.data[0].DropFolder);
                    }
                    else {
                        // No drop folder, need to let the user know
                        $("#myDropFolder").empty();
                        appendHTMLtoContainer('myDropFolder', '<div class="panel panel-default">' +
                            "<h4 class='text-center'>You cant drop files for this deal.</h4>" +
                            '</div>');
                    }

                    // Setup RMaps container
                    appendHTMLtoContainer('divRMaps', '<div class="panel panel-default">' +
                        `<div class="panel-heading"><strong><a href='${response.data[0].RMapUrlH}' target="_blank">RMaps</a></strong></div>` +
                        '<div class="panel-body">' +
                        `<iframe frameBorder="0" src="${response.data[0].RMapUrl}" height="800" width="100%" id="ifRMaps"></iframe>` +
                        '</div>' +
                        '</div>');
                    $("#backToDeals").focus();
                    // Setup OneNote container
                    let oneNoteUrl;
                    if (response.data[0].NotebookID != '') {
                        oneNoteUrl = `https://rboil.sharepoint.com/sites/${response.data[0].SharePointPageName}/Shared%20Documents/Notebooks/${DN}`;
                    }
                    else {
                        let oneNoteUrl = 'about:blank'
                    }
                    appendHTMLtoContainer('divOneNote', '<div class="panel panel-default" id="oneNoteSection">' +
                        '<div class="panel-heading"><strong>OneNote</strong></div>' +
                        '<div class="panel-body">' +
                        `<a href='${oneNoteUrl}' target="_blank">Open in Sharepoint</a>` +
                        '<div style="height: 1000; width:100%">' +
                        '<div class="col-sm-3">' +
                        '<h4 id="oneNoteDisplayName">&nbsp;</h4>' +
                        '<div class="panel-group" id="accordion" role="tablist" aria-multiselectable="false">' +
                        '<div id="oneNoteContentPreview">' +
                        '<div style="display:block;text-align:center"><img title="Loading..." src="../s/img/ajax-loading.gif"></div>' +
                        '</div>' +
                        '</div>' +
                        '</div>' +
                        '<div class="col-sm-9">' +
                        '<h4>&nbsp;</h4>' +
                        '<div class="panel panel-default">' +
                        '<div class="panel-heading">' +
                        '<h3 class="panel-title"><span  id="pageName">Page name</span></h3>' +
                        '</div>' +
                        '<div class="panel-body">' +
                        '<iframe src="" frameBorder="0" id="pageViewer" width="100%" height="800px" scrolling="yes"></iframe>' +
                        '</div>' +
                        '</div>' +
                        '</div>' +
                        '</div>' +
                        '</div>' +
                        '</div>');
                }
                else {
                    // No deal data obtained, some panels need to be removed
                    $("#divLeftSideContainer").empty();
                    $("#divDealJournalBidHistory").empty();
                }

            },
            error: function (data) {
                console.log('Ajax error retrieving deal details.');
            }
        });
    }
    else {
        // New deal, hide all panels except the details one
        $("#divLeftSideContainer").hide();
        $("#divDealJournalBidHistory").hide();
        $("#dibBidHistory").hide();
        $("#status").val("NEW");
    }

    // Hide email panel
    $("#panelDealJournalEmail").hide();
    $("#panelNotesEmail").hide();
    $("#panelNotesEdit").hide();
    $("#panelNotesTask").hide();


    tDealSourceId = $("#hidDealSourceId").val();
    tSellingPartyId = $("#hidSellingPartyId").val();
    tADFirmId = $("#hidADFirmId").val();
    tBidExternalCompanyId = 'COMPANY-' + $("#hidBidExternalCompanyId").val();
    loadDropDown("#dealSourceId", "Name", "Id", tDealSourceId, `${parentURL}/deals/!/external/`, [{ text: ' ', value: '0' }, { text: '* New company', value: '*newCompany' }, { text: '* New contact', value: '*newContact', location: 'post' }]);
    loadDropDown("#sellingPartyId", "Name", "Id", tSellingPartyId, `${parentURL}/deals/!/external/companies`, [{ text: ' ', value: '0' }, { text: '* New company', value: '*newCompany', location: 'post' }]);
    loadDropDown("#ADFirmId", "Name", "Id", tADFirmId, `${parentURL}/deals/!/external/companies`, [{ text: ' ', value: '0' }, { text: '* New company', value: '*newCompany', location: 'post' }]);
    loadDropDown("#popWinBidExternalCompanyId", "Name", "Id", tBidExternalCompanyId, `${parentURL}/deals/!/external/companies`, [{ text: ' ', value: '0' }]);

    // check if a note is being attached 
    //let noteData = getCookieValue("attachNote");
    if (DN == "new" && noteData && noteData.entityId != 0) {
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
    });

    // toggle "bid accepted" fields if STATUS is bid accepted (BA)1
    $("#status").on("change", function () {
        if (this.value == "BA")
            $("#bidAccepted").show("slow")
        else
            $("#bidAccepted").hide("slow")
    })

    // hide edit mode panel, load view mode
    if (DN != 'new') {
        $("#panelDealEdit").toggle();
        refreshViewMode();
        // Also, update page title with deal number and name
        document.title = DN + " - " + $("#DNA").val();
    }
    else {
        // We're adding a new deal
        $("#panelDealView").toggle();
        // Also, update page title with deal number and name
        document.title = "Riverbend - RForce (Add deal)";
    }

    let dealNumber = DN;

    // Hide email panel
    $("#panelDealJournalEmail").hide();

    // init feedback messages
    $("#alertSuccess").hide();
    $("#alertError").hide();
    $("#loading").hide();
    $("#alertSendNoteByEmail").hide();
    $("#alertSendJournalByEmail").hide();

    // init event focus: remove money comma format
    $("#netRate").focus(function (event) { focusFunction(this, true) });
    $("#bidAmount").focus(function (event) { focusFunction(this, true) });
    $("#perAcre").focus(function (event) { focusFunction(this, true) });
    $("#netAcres").focus(function (event) { focusFunction(this, false) });
    $("#netRoyaltyAcres").focus(function (event) { focusFunction(this, false) });

    // init event onblur: add money format
    $("#netRate").on('blur', function (event) { blurFunction(this, true) });
    $("#bidAmount").on('blur', function (event) { blurFunction(this, true) });
    $("#perAcre").on('blur', function (event) { blurFunction(this, true) });
    $("#netAcres").on('blur', function (event) { blurFunction(this, false) });
    $("#netRoyaltyAcres").on('blur', function (event) { blurFunction(this, false) });

    // Setup previous and next Deal buttons text
    $("#nextDeal").html(' Next: ' + $("#NDN").val());
    $("#previousDeal").html('Previous: ' + $("#PDN").val());

    // hide/display bid Accepted fields
    if ($("#status").val() == "BA") {
        $("#bidAccepted").show()
    } else {
        $("#bidAccepted").hide()
    }

    // init data picker for bidDate					 
    $(function () {
        $("#popBidDate").datepicker({
            constrainInput: true,
            showButtonPanel: true,
            closeText: 'Clear',
            onClose: function (dateText, inst) {
                if ($(window.event.srcElement).hasClass('ui-datepicker-close')) {
                    document.getElementById(this.id).value = '';
                }
            }
        });

        $("#popWinBidDate").datepicker({
            constrainInput: true,
            showButtonPanel: true,
            closeText: 'Clear',
            onClose: function (dateText, inst) {
                if ($(window.event.srcElement).hasClass('ui-datepicker-close')) {
                    document.getElementById(this.id).value = '';
                }
            }
        });


    });

    // init data picker for dateSourced							 
    $(function () {
        $("#dateSourced").datepicker({
            constrainInput: true,
            showButtonPanel: true,
            closeText: 'Clear',
            onClose: function (dateText, inst) {
                if ($(window.event.srcElement).hasClass('ui-datepicker-close')) {
                    document.getElementById(this.id).value = '';
                }
            }
        });
    });

    // init data picker for bidDueDate								
    $(function () {
        $("#bidDueDate").datepicker({
            constrainInput: true,
            showButtonPanel: true,
            closeText: 'Clear',
            onClose: function (dateText, inst) {
                if ($(window.event.srcElement).hasClass('ui-datepicker-close')) {
                    document.getElementById(this.id).value = '';
                }
            }
        });
    });

    // init data picker for titleDefectDueDate								
    $(function () {
        $("#titleDefectDueDate").datepicker({
            constrainInput: true,
            showButtonPanel: true,
            closeText: 'Clear',
            onClose: function (dateText, inst) {
                if ($(window.event.srcElement).hasClass('ui-datepicker-close')) {
                    document.getElementById(this.id).value = '';
                }
            }
        });
    });

    // init data picker for closingDate								
    $(function () {
        $("#closingDate").datepicker({
            constrainInput: true,
            showButtonPanel: true,
            closeText: 'Clear',
            onClose: function (dateText, inst) {
                if ($(window.event.srcElement).hasClass('ui-datepicker-close')) {
                    document.getElementById(this.id).value = '';
                }
            }
        });
    });

    //activate auto-completion
    $('#emailJournalRecipients').chosen({ width: "100%", allow_single_deselect: true });
    $('#countyId').chosen({ width: "100%", allow_single_deselect: true });
    $('#dealSourceId').chosen({ width: "100%", allow_single_deselect: true });
    $('#sellingPartyId').chosen({ width: "100%", allow_single_deselect: true });
    $('#ADFirmId').chosen({ width: "100%", allow_single_deselect: true });
    $('#popWinBidExternalCompanyId').chosen({ width: "100%", allow_single_deselect: true });
    $('#emailJournalRecipients').chosen({ width: "100%", allow_single_deselect: true });
    $('#emailNoteRecipients').chosen({ width: "100%", allow_single_deselect: true });
    $('#editNoteFollowUpEmployee').chosen({ width: "100%", allow_single_deselect: true });
    $('#editNoteAttendeeEmployee').chosen({ width: "100%", allow_single_deselect: true });
    $('#editNoteAttendeeContact').chosen({ width: "100%", allow_single_deselect: true });


    let mwidth = $("bidAmount").width();

    // fix inherited css format 
    $(".chosen-container").css({ "width": mwidth })
    $(".chosen-results").css({ "width": mwidth })
    $("li.search-choice").find("span").css({ "font-size": "14px", "font-weight": "600", "color": "#666666", "font-family": "'Lato',HelveticaNeue,'Helvetica Neue','Helvetica Neue',Helvetica,Arial,'Lucida Grande',sans-serif" });
    $('#netRate').css({ 'width': '60px' });
    $('#netRateUnit').css({ 'width': '100px' });

    // init oneNotes content preview if not a new deal
    if (DN != '') {
        getExplorerItems('\\');
        refreshOneNoteContentPreview();
    }

    // onchange event for State : populate county
    function loadCounties() {
        let dealNumber = (DN == "") ? "-" : DN;
        let state = $('#state').val();
        let aUrl = `${parentURL}/deals/!/dealdetails/${dealNumber}/getCounties/${state}`;

        $.ajax({
            url: aUrl,
            username: credentials.user,
            password: credentials.password,
            type: 'get',
            dataType: 'json',
            success: function (response) {
                console.log(aUrl)
                console.log(response)
                let len = response.data.length;
                $("#countyId").empty();
                $("#countyId").trigger("chosen:updated");
                $("#countyId").append("<option value='0' selected></option>");
                for (let i = 0; i < len; i++) {
                    $("#countyId").append("<option value='" + response.data[i].countyId + "' " + response.data[i].selected + ">" + response.data[i].county + "</option>");
                }
                $("#countyId").trigger("chosen:updated");
                // fix inherited css format 
                $("li.search-choice").find("span").css({ "font-size": "14px", "font-weight": "600", "color": "#666666", "font-family": "'Lato',HelveticaNeue,'Helvetica Neue','Helvetica Neue',Helvetica,Arial,'Lucida Grande',sans-serif" });
            }
        });
    }

    $("#state").change(function () {
        loadCounties();
    });

    // onchange event for county : apply inherited css styles 
    $("#countyId").change(function () {
        // fix format 
        $("li.search-choice").find("span").css({ "font-size": "14px", "font-weight": "600", "color": "#666666", "font-family": "'Lato',HelveticaNeue,'Helvetica Neue','Helvetica Neue',Helvetica,Arial,'Lucida Grande',sans-serif" });
    });


    // onChange event for Selling party field
    $("#sellingPartyId").on('change', function () {
        $("#sellingPartyId").val($("#sellingPartyId").val());
        tSellingPartyId = $("#sellingPartyId").val();
        if ($(this).val() === "*newCompany") {
            // Redirect to add new company
            openInNewTab("./companydetails.html?companyId=new");
        }
        else {
            // Store selected text
            $("#sellingParty").val($('#sellingPartyId option:selected').html());
        }
    });

    // onChange event for ADFirm party field
    $("#ADFirmId").on('change', function () {
        $("#ADFirmId").val($("#ADFirmId").val());
        tADFirmId = $("#ADFirmId").val();
        if ($(this).val() === "*newCompany") {
            // Redirect to add new company
            openInNewTab("./companydetails.html?companyId=new");
        }
        else {
            // Store selected text
            $("#ADfirm").val($('#ADFirmId option:selected').html());
        }
    });

    // onChange event for Deal source field
    $("#dealSourceId").on('change', function () {
        $("#hidDealSourceId").val($("#dealSourceId").val());
        tDealSourceId = $("#hidDealSourceId").val();
        if ($(this).val() === "*newCompany") {
            // Redirect to add new company
            openInNewTab("./companydetails.html?companyId=new");
        }
        else if ($(this).val() === "*newContact") {
            // Create a new empty contact and redirect (open in new tab)
            $.ajax({
                url: `${parentURL}/contacts/!/contacts/new`,
                username: credentials.user,
                password: credentials.password,
                type: 'post',
                contentType: 'application/json',
                success: function (resp) {
                    let contactId = resp.data.ContactId;
                    openInNewTab(`./contactdetails?contactId=${contactId}&new=yes`);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    console.log('Unable to create new empty contact. (' + textStatus + ')');
                }
            });
        }
        else {
            $("#dealSource").val($('#dealSourceId option:selected').html());
        }
    });

    // click events for previous and next deal buttons
    if ($("#PDN").val() != '') {
        $("#previousDeal").on("click", function () {
            window.location.href = `./dealdetails.html?dealNumber=${$("#PDN").val()}`;
        })
    }
    else {
        $("#previousDeal").hide();
    }

    if ($("#NDN").val() != '') {
        $("#nextDeal").on("click", function () {
            window.location.href = `./dealdetails.html?dealNumber=${$("#NDN").val()}`;
        })
    }
    else {
        $("#nextDeal").hide();
    }

    $("#copyLink").on("click", function () {
        // Assemble the deal link
        let dealLink = parentURL + '/X' + DN;
        // Next code is required to copy the link as an HTML tag
        function listener(e) {
            // Set the URL in fancy formatted HTML...
            e.clipboardData.setData("text/html", `<a href="${dealLink}">#${DN}</a>`);
            // ... but also copy the URL without any formatting if plain text is required
            e.clipboardData.setData("text/plain", dealLink);
            // And by all means do nothing else!!!
            e.preventDefault();
        }
        // Attach our copy even listener
        document.addEventListener("copy", listener);
        // Fire...
        document.execCommand("copy");
        // Then remove it
        document.removeEventListener("copy", listener);
        // Done
        alert("Deal link has been copied to clipboard:\n\n" + dealLink + "\n\nPlease note that on RichText and HTML environments the link will paste as #" + DN + ".");
    });

    // Click event for submit button, validate and perform ajax post
    $("#submit").on("click", function () {
        let errorMessage = "";
        let valid = true;

        if ($("#dealName").val() == "") {
            errorMessage = errorMessage + "- Deal Name\n"
        }
        if ($("#validDealName").val() == "") {
            errorMessage = errorMessage + "- Deal Name already exists\n"
        }
        if ($("#basinId").val() == "") {
            errorMessage = errorMessage + "- Basin\n"
        }
        if ($("#companyId").val() == "") {
            errorMessage = errorMessage + "- Company\n"
        }
        if ($("#status").val() == "") {
            errorMessage = errorMessage + "- Status\n"
        }
        if ($("#bidDueDate").val().trim().length > 0 && !isDate($("#bidDueDate").val())) {
            errorMessage = errorMessage + "- Bid Due Date\n"
        }
        if ($("#status").val() == "BA") {
            if ($("#titleDefectDueDate").val().trim().length == 0) {
                errorMessage = errorMessage + "- Title Defect Due Date \n"
            }
            if ($("#closingDate").val().trim().length == 0) {
                errorMessage = errorMessage + "- Closing Date \n"
            }
        }
        else {
            $("#titleDefectDueDate").val('');
            $("#closingDate").val('');
        }

        if (errorMessage != "") {
            errorMessage = "Please enter the missing values: \n" + errorMessage;
            valid = false;
            alert(errorMessage);
        }
        else
            postMyForm();

        return valid;
    });

    // Ajax validation for DealName (unique name)
    $("#dealName").blur(function () {
        if ($("#dealName").is('[readonly]')) {
            return
        }
        let dealName = $("#dealName").val().trim();

        if (dealName == $("#validDealName").val()) {
            return
        }
        if (dealName.length > 0) {
            $.ajax({
                url: `${parentURL}/deals/!/checkName/${dealName}`,
                username: credentials.user,
                password: credentials.password,
                async: true,
                success: function (result) {
                    if (dealName.length > 0 && result.data.Exists == 0) {
                        $("#dealNameResult").html("<span class='glyphicon glyphicon-ok' aria-hidden='true'></span>");
                        $('#dealNameResult').css('color', 'green');
                        $('#validDealName').val(dealName);
                    }
                    else {
                        $("#dealNameResult").html("<span class='glyphicon glyphicon-remove' aria-hidden='true'></span>");
                        $('#dealNameResult').css('color', 'red');
                        $('#validDealName').val("");
                    }
                }
            })
        }
        else {

            $("#dealNameResult").html("<span class='glyphicon glyphicon-remove' aria-hidden='true'></span>");
            $('#dealNameResult').css('color', 'red');
            $('#validDealName').val("");
        }
    });

    // If this isn't a new deal, display it's journal
    let ajaxJournalUrl = `${parentURL}/deals/!/journal/${dealNumber}`;
    if (dealNumber != '') {
        $("#journalPanel").show();
        let table = $("#journal").DataTable({
            ajax: ajaxJournalUrl,
            username: credentials.user,
            password: credentials.password,
            paging: false,
            info: false,
            searching: true,
            scrollX: false,
            scrollY: "200px",
            scrollCollapse: true,
            ordering: false,
            order: [
                [0, "asc"]
            ],
            processing: true,
            language: {
                processing: '<div style="display:block;text-align:center"><img title="loading" src="../s/img/ajax-loading.gif"></div>',
                emptyTable: "There are no entries"
            },
            columns: [
                {
                    data: null,
                    render: function (data, type, row) {
                        let journalEntry = '<b>{whenAdded}</b>&nbsp;{comment}';
                        journalEntry = journalEntry.replace('{whenAdded}', data.WhenAdded).replace('{comment}', data.Comment)
                        return journalEntry;
                    }
                },
            ],
            select: false
        });
    }
    else {
        $("#journal").hide();
    }

    // click event for submitJournal button
    $("#submitJournal").on("click", function () {
        let journalEntry = $("#journalEntry").val().trim();
        let ajaxUrl = `${parentURL}/deals/!/journal/${DN}`;
        let table = $("#journal").DataTable();

        if (journalEntry.length > 0) {
            $.ajax({
                url: ajaxUrl,
                username: credentials.user,
                password: credentials.password,
                type: "POST",
                data: { comments: journalEntry },
                async: true,
                success: function (result) {
                    $("#journalEntry").val('');
                    table.ajax.reload();
                }
            })
        }
    })

    $("#btnJournalEmail").on("click", function () {
        $("#panelNotesView").hide("fast");
        $("#panelDealJournalEmail").show("fast");
    });

    $("#selectAllEmployees").on("click", function () {
        $('#emailJournalRecipients option').prop('selected', true);
        $('#emailJournalRecipients').trigger("chosen:updated");
    });

    // Journal by email - send button
    $("#btnJournalEmailSend").on("click", async function () {
        // Check if we have a list of attendees
        let recipientList = $("#emailJournalRecipients").val().join(",");
        if ((recipientList != "") || ($("#chkSendToCompanyEmail").is(":checked"))) {
            // Let the user know we're sending an email
            $("#alertSendJournalByEmail").show();
            // What are we sending?
            let sendToCompanyEmail = ($("#chkSendToCompanyEmail").is(":checked") ? "Y" : "N");
            let URL = `${parentURL}/deals/!/${$("#DN").val()}/sendJournalEmail?recipients=${recipientList}&sendCompanyEmail=${sendToCompanyEmail}`;
            // Bombs away...
            let ajaxPostResult = await $.ajax({
                async: true,
                type: 'POST',
                url: URL,
                success: function (response) {
                    console.log("email sent");
                }
            });
            // Clear chosen selector
            $('#emailIJournalRecipients').val([]);
            $('#emailIJournalRecipients').trigger("chosen:updated");
            // Done
            $("#alertSendJournalByEmail").fadeTo(500, 1).slideUp(500, function () {
                $("#alertSendNoteByEmail").hide();
                // Done, hide the send by email panel
                $("#panelDealJournalEmail").hide("fast");
                $("#panelNotesView").show("fast", function () { $('#tblNotes').DataTable().ajax.reload(); });
            });
        }
        else {
            alert("Please select at least one recipient.")
        }
    });

    // Journal by email - cancel button
    $("#btnJournalEmailCancel").on("click", async function () {
        // Clear chosen selector
        $('#emailIJournalRecipients').val([]);
        $('#emailIJournalRecipients').trigger("chosen:updated");
        // Hide the send by email panel
        $("#panelDealJournalEmail").hide("fast");
        $("#panelNotesView").show("fast", function () { $('#tblNotes').DataTable().ajax.reload(); });
    });

    // Init  history datatable 
    let ajaxHistoryUrl = `${parentURL}/deals/!/history/${DN}`;
    if (dealNumber != '') {
        $("#history").show();
        let table = $("#history").DataTable({
            ajax: ajaxHistoryUrl,
            username: credentials.user,
            password: credentials.password,
            paging: false,
            info: false,
            searching: true,
            scrollX: false,
            scrollY: "200px",
            scrollCollapse: true,
            ordering: false,
            order: [
                [0, "asc"]
            ],
            processing: true,
            language: {
                // processing: '<div style="display:block;text-align:center"><img title="loading" src="../s/img/ajax-loading.gif"></div>',
                emptyTable: "There are no entries"
            },
            select: false,
            columns: [
                {
                    defaultContent: "<button><i class='fa fa-trash'></i></button>"
                },
                {
                    data: null,
                    render: function (data, type, row) {
                        return (data.BidAmount) ? '$' + data.BidAmount : '';
                    },
                    className: "dt-right"
                },
                {
                    data: "NetAcres",
                    className: "dt-right"
                },
                {
                    data: null,
                    render: function (data, type, row) {
                        return (data.PerAcre) ? '$' + data.PerAcre : '';
                    },
                    className: "dt-right"
                },
                {
                    data: "BidDate"
                },
                {
                    data: "User"
                },
                {
                    data: "bidHistoryId",
                    visible: false
                }
            ]
        });
    }
    else {
        $("#history").hide();
    }

    // click event button "edit" switch from View to edit modes.
    $("#editMode").on("click", function () {
        $("#panelDealView").toggle("fast");
        $("#panelDealEdit").toggle("fast");
    });

    // click event button "cancel" switch from Edit to View modes.
    $("#cancel").on("click", function () {
        $("#panelDealView").toggle("fast");
        $("#panelDealEdit").toggle("fast");
    });

    $('#history tbody').on('click', 'button', function () {
        let t = $('#history').DataTable()
        let d = t.row($(this).parents('tr')).data();
        let bidHistoryId = d.bidHistoryId
        $.ajax({
            url: `${parentURL}/deals/!/history/${dealNumber}/${bidHistoryId}`,
            type: "DELETE",
            success: function (result) {
                $("#history").DataTable().ajax.reload();
            },
            error: function (data) {
                console.error('cannot delete bid history');
            }
        });
    });

    // Submit form via AJAX
    function postMyForm() {
        $("#loading").show();
        $("#submit").hide();
        $("#cancel").hide();
        $.ajax({
            url: `${parentURL}/deals/!/dealdetails`,
            username: credentials.user,
            password: credentials.password,
            type: "POST",
            data: $("#FormData").serialize(),
            async: true,
            success: function (result) {
                $("#loading").hide();
                $("#submit").show();
                $("#cancel").show();

                if (DN == 'new') {
                    window.location.href = `./dealdetails.html?dealNumber=${result.dealNumber}&new=true`;
                }
                // Update data in view mode to reflect database updates
                refreshViewMode();
                // refresh Deal History
                $("#history").DataTable().ajax.reload();
                // Restore view mode?
                $("#panelDealView").toggle("fast");
                $("#panelDealEdit").toggle("fast");
                // Display success message
                $("#alertSuccess").show();
                window.setTimeout(function () {
                    $("#alertSuccess").fadeTo(500, 1).slideUp(500, function () {
                        $("#alertSuccess").hide();
                    });
                }, 5000);
            },
            error: function (data) {
                $("#loading").hide();
                $("#alertError").show();
                $("#submit").show();
                $("#cancel").show();
                window.setTimeout(function () {
                    $("#alertError").fadeTo(500, 1).slideUp(500, function () {
                        $("#alertError").hide();
                    });
                }, 5000);
            }
        })
    }

    function refreshViewMode() {
        let dealNumber = DN;
        let aUrl = `${parentURL}/deals/!/getDealByNumberNoNav/${dealNumber}`;

        $.ajax({
            url: aUrl,
            username: credentials.user,
            password: credentials.password,
            type: "GET",
            async: true,
            success: function (deal) {
                // Update view mode panel
                addFieldViewMode("Deal Number:", deal.data[0].DealNumber, "col-sm-6", true);
                addFieldViewMode("Deal Name:", deal.data[0].DealName, "col-sm-6", false);
                addFieldViewMode("Basin:", deal.data[0].Basin, "col-sm-6", false);
                addFieldViewMode("Company:", deal.data[0].Company, "col-sm-6", false);
                addFieldViewMode("State:", deal.data[0].StateIds, "col-sm-6", false);
                addFieldViewMode("County:", deal.data[0].CountyNames, "col-sm-6", false);
                addFieldViewMode("Status:", deal.data[0].Status, "col-sm-6", false);
                addFieldViewMode("Title Defect Due Date:", deal.data[0].TitleDefectDueDate, "col-sm-6", false);
                addFieldViewMode("Closing Date:", deal.data[0].ClosingDate, "col-sm-6", false);
                addFieldViewMode("Net Rate:", deal.data[0].NetRate, "col-sm-6", false);
                addFieldViewMode("Net Rate Unit:", deal.data[0].NetRateUnit, "col-sm-6", false);
                addFieldViewModeDollar("Bid Amount:", deal.data[0].BidAmount, "col-sm-6", false);
                addFieldViewMode("Bid Date:", deal.data[0].BidDate, "col-sm-6", false);
                addFieldViewMode("Deal Source:", deal.data[0].DealSource, "col-sm-6", false);
                addFieldViewMode("Selling Party:", deal.data[0].SellingParty, "col-sm-6", false);
                addFieldViewMode("Net Acres:", deal.data[0].NetAcres, "col-sm-6", false);
                addFieldViewMode("Net Royalty Acres:", deal.data[0].NetRoyaltyAcres, "col-sm-6", false);
                addFieldViewModeDollar("Dollars Per Acre:", deal.data[0].PerAcre, "col-sm-6", false);
                addFieldViewMode("Depths & Benches:", deal.data[0].DepthsBenches, "col-sm-6", false);
                addFieldViewMode("Is Mapped:", deal.data[0].IsMapped, "col-sm-6", false);
                addFieldViewMode("A&D Firm:", deal.data[0].ADFirm, "col-sm-6", false);
                addFieldViewMode("Bid Due Date:", deal.data[0].BidDueDate, "col-sm-6", false);
                addFieldViewMode("Date Sourced:", deal.data[0].DateSourced, "col-sm-6", false);
                addFieldViewMode("Who Entered:", deal.data[0].WhoCreated, "col-sm-6", false);
                addFieldViewMode("Date Changed:", deal.data[0].WhenChanged, "col-sm-6", false);
                addFieldViewMode("Who Changed:", deal.data[0].WhoChanged, "col-sm-6", false);
                addFieldViewMode("Win Bid Dollars per Acre:", deal.data[0].WinBidPerAcre, "col-sm-6", false);
                addFieldViewMode("Win Bid Net Acres:", deal.data[0].WinBidNetAcres, "col-sm-6", false);
                addFieldViewMode("Win Bid Amount:", deal.data[0].WinBidAmount, "col-sm-6", false);
                addFieldViewMode("Win Bid Date:", deal.data[0].WinBidDate, "col-sm-6", false);
                addFieldViewMode("Win Company:", deal.data[0].WinBidCompanyName, "col-sm-6", false);
                addFieldViewMode("Description:", deal.data[0].Description, "col-sm-12", false);

                $("#popDollarsPerAcre").val(deal.data[0].PerAcre);
                $("#popNetAcres").val(deal.data[0].NetAcres);
                $("#popBidAmount").val(deal.data[0].BidAmount);
                $("#popBidDate").val(deal.data[0].BidDate);

            },
            error: function (data) {
                console.log('Ajax error refreshing view mode data after update.');
            }
        })
    }

    function addFieldViewMode(fieldDescription, fieldValue, divClass, initContainer) {
        const fieldTemplate = '<div class="' + divClass + '"> <div class="form-group"><strong>[fieldDescription] </strong>&nbsp;&nbsp;<em>[fieldValue]</em></div></div>';
        let viewModeContainer = $("#viewModeContainer");
        if (initContainer) {
            viewModeContainer.empty();
        }
        if (containInfo(fieldValue)) {
            viewModeContainer.append(fieldTemplate.replace('[fieldDescription]', fieldDescription).replace('[fieldValue]', fieldValue));
        }
    }

    function addFieldViewModeDollar(fieldDescription, fieldValue, divClass, initContainer) {
        const fieldTemplate = '<div class="' + divClass + '"> <div class="form-group"><strong>[fieldDescription] </strong>&nbsp;<em>$[fieldValue]</em></div></div>';
        let viewModeContainer = $("#viewModeContainer");
        if (initContainer) {
            viewModeContainer.empty();
        }
        if (containInfo(fieldValue)) {
            viewModeContainer.append(fieldTemplate.replace('[fieldDescription]', fieldDescription).replace('[fieldValue]', fieldValue));
        }
    }

    // test for null values
    function containInfo(testValue) {
        return (testValue === undefined || testValue == null || testValue.length <= 0 || testValue == 0) ? false : true;
    }

    // Edit mode for numeric text boxes, remove format money (commas)
    function focusFunction(item) {
        item.value = item.value.replace(',', '');
        item.style.background = "";
    }

    // View mode for numeric text boxes, add format money (commas)
    function blurFunction(item, d) {
        if ($.isNumeric(item.value)) {
            let v = parseFloat(item.value).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
            if (!d)
                v = v.slice(0, -3);
            item.value = v;
        }
        else {
            item.style.background = "lightyellow";
        }
    }

    // get explore files
    function getExplorerItems(requestedPath) {

        let dealNumber = DN;
        let dealName = $("#dealName").val().trim();
        let dropFolder = $("#DF").val();
        let url = `${parentURL}/deals/!/getDirectoryData/${dealNumber}`;
        let body = { "dropFolder": dropFolder, "path": requestedPath, "dealName": dealName };

        $.ajax({
            url: url,
            username: credentials.user,
            password: credentials.password,
            type: "POST",
            data: body,
            async: true,
            success: function (result) {
                $("#folderExplorer").empty();
                $("#DealFolderFound").val(result.dealFolderFound)
                $("#linkFileExplorer").attr("href", `rdeals://${dropFolder}/${result.dealFolderFound}/files`);
                for (let i = 0; i < result.directoryItems.length; i++) {
                    if (result.directoryItems[i].isDirectory) {
                        if (result.directoryItems[i].fileName == "Up") {
                            $("#folderExplorer").append("<div><a id='explorerItem" + i + "'  href='#' data-usage=\"" + result.directoryItems[i].path + "\"  onclick='return false;'><i class='glyphicon glyphicon-level-up'></i>&nbsp;&nbsp;..parent folder</a></div>")
                            $("#folderExplorer").append("<hr>");
                        }
                        else {
                            $("#folderExplorer").append("<div><small><a id='explorerItem" + i + "' href='#' data-usage=\"" + result.directoryItems[i].path + '\\' + result.directoryItems[i].fileName + "\"  onclick='return false;'><i class='glyphicon glyphicon-folder-open'></i>&nbsp;&nbsp;" + result.directoryItems[i].fileName + "</a></small></div>")
                        }

                        $('#explorerItem' + i).bind('click', function () {
                            let folder = this.getAttribute("data-usage");
                            getExplorerItems(folder);
                        });
                    }
                    else {
                        $("#folderExplorer").append("<div><small><a id='explorerItem" + i + "' href='#' data-usage=\"" + result.directoryItems[i].path + '\\' + result.directoryItems[i].fileName + "\"  onclick = 'return false;'><i class='glyphicon glyphicon-file'></i>&nbsp;&nbsp;" + result.directoryItems[i].fileName + "</a></small></div>")
                        $('#explorerItem' + i).bind('click', function () {
                            let fileName = this.getAttribute("data-usage");
                            getFile(fileName);
                        });
                    }
                }
                if (result.directoryItems.length == 1) {
                    $("#folderExplorer").append('<div><small>This folder is empty </small></div>');
                }
            },
            error: function (data) {
                $("#myDropFolder").hide();
                $("#folderExplorer").append("<div><small>This folder hasn't been created </small></div>");
            }
        });
    }


    // Initiates the Download File functionality
    function getFile(requestedFile) {
        let dealNumber = DN;
        let dropFolder = $("#DF").val();
        let fileName = requestedFile.replace(/^.*[\\\/]/, '');
        $('#postFrame').contents().find('#dealNumber').val(dealNumber);
        $('#postFrame').contents().find('#dropFolder').val(dropFolder);
        $('#postFrame').contents().find('#requestedFile').val(requestedFile);
        $('#postFrame').contents().find('#fileName').val(fileName);
        $("#postFrame").contents().find('#requestFile').submit();
    }

    function refreshOneNoteContentPreview() {
        let dealNumber = DN;
        let url = `${parentURL}/deals/!/notebook/${dealNumber}`;
        let sectionTemplate = '<div class="panel panel-default"><div class="panel-heading" role="tab" id="[panNumber]"><h4 class="panel-title"><a role="button" data-toggle="collapse" data-parent="#accordion" href="#[collapseNum]" aria-expanded="false" aria-controls="[collapseNum]">[sectionDisplayName]</a></h4></div><div id="[collapseNum]" class="panel-collapse collapse in" role="tabpanel" aria-labelledby="[panNumber]"><div class="panel-body" id="[sectionId]"></div></div></div>';
        let pageTemplate = '<div><a [firstPage] href="javascript:void(0);" onclick="loadPageContent([pageId], \'[pageTitle]\')"><small>[pageTitle]</small></a></div>';
        let firstPage = 'id="firstPage"';
        $.ajax({
            url: url,
            username: credentials.user,
            password: credentials.password,
            type: "GET",
            async: true,
            success: function (result) {
                $("#oneNoteContentPreview").empty();
                $("#oneNoteDisplayName").val(result.data.displayName)
                for (let i = 0; i < result.data.sections.length; i++) {
                    let sectionId = "sec" + replaceAll(result.data.sections[i].id, '-', '');
                    let newSection = replaceAll(replaceAll(replaceAll(replaceAll(sectionTemplate, '[panNumber]', 'pan' + i), '[sectionDisplayName]', result.data.sections[i].displayName), '[collapseNum]', 'collapse' + i), '[sectionId]', sectionId);
                    $("#oneNoteContentPreview").append(newSection);
                    for (let j = 0; j < result.data.sections[i].pages.length; j++) {
                        let pageId = result.data.sections[i].pages[j].id;
                        let pageTitle = replaceAll(result.data.sections[i].pages[j].title, "'", '&rsquo;');
                        let newPage = pageTemplate.replace('[pageId]', '\'' + pageId + '\'').replace('[pageTitle]', pageTitle).replace('[pageTitle]', pageTitle).replace('[firstPage]', firstPage);
                        $("#" + sectionId).append(newPage);
                        firstPage = '';
                    }
                }
                $("#firstPage").click();
            },
            error: function (data) {
                $("#oneNoteContentPreview").empty();
            }
        });
    }

    function replaceAll(thisString, search, replacement) {
        return thisString.split(search).join(replacement);
    };

    // init bid calculator dialog
    dialogBidCalculator = $("#bidCalculator").dialog({
        autoOpen: false,
        height: 450,
        width: 350,
        modal: true,
        buttons: {
            "Update deal": updateBidData,
            Cancel: function () {
                dialogBidCalculator.dialog("close");
            }
        },
        close: function () {
        },
        show: {
            effect: "blind",
            duration: 250
        },
        hide: {
            effect: "blind",
            duration: 250
        }
    });

    // init Winning bid dialog
    dialogWinningBid = $("#winningBid").dialog({
        autoOpen: false,
        height: 700,
        width: 350,
        modal: true,
        buttons: {
            "Update deal": updateWinBidData,
            "Cancel": function () {
                dialogWinningBid.dialog("close");
            }
        },
        close: function () {
        },
        show: {
            effect: "blind",
            duration: 250
        },
        hide: {
            effect: "blind",
            duration: 250
        }
    });


    dialogNewDeal = $("#NewDealNotification").dialog({
        autoOpen: false,
        height: 800,
        width: 800,
        modal: true,
        buttons: {
            "Ok": function () {
                dialogNewDeal.dialog("close");
            }
        },
        close: function () {
        },
        show: {
            effect: "blind",
            duration: 250
        },
        hide: {
            effect: "blind",
            duration: 250
        }
    });


    dialogFileExplorerHelp = $("#fileExplorerHelpDialog").dialog({
        autoOpen: false,
        height: 350,
        width: 350,
        modal: true,
        buttons: {
            "Ok": function () {
                dialogFileExplorerHelp.dialog("close");
            }
        },
        show: {
            effect: "blind",
            duration: 250
        },
        hide: {
            effect: "blind",
            duration: 250
        }
    });

    // Init Bid Calculator and Winning Bid buttons, but only if user is admin
    if (UserIsAdmin) {
        $("#history_filter").prepend("<button type='button' id='btnWinningBid' class='dealsPageButtons' >Winning Bid</button>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;");
        $("#btnWinningBid").button().on("click", function () {
            dialogWinningBid.dialog("open");
        });

        $("#history_filter").prepend("<button type='button' id='btnBidCalculator' class='dealsPageButtons' >Update Bid</button>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;");
        $("#btnBidCalculator").button().on("click", function () {
            let shortTimestamp = new Date().toLocaleDateString();
            $("#popBidDate").val(shortTimestamp);
            dialogBidCalculator.dialog("open");
        });

    }

    // event handlers for Bid Calculator 
    $("#popDollarsPerAcre").on("keypress keyup blur", function (event) {
        $(this).val($(this).val().replace(/[^0-9\.]/g, ''));
        if ((event.which != 46 || $(this).val().indexOf('.') != -1) && (event.which < 48 || event.which > 57)) {
            event.preventDefault();
        }
        if (event.which != 9) {
            if ($.isNumeric($("#popDollarsPerAcre").val()) && $.isNumeric($("#popNetAcres").val())) {
                $("#popBidAmount").val(Math.round((($("#popDollarsPerAcre").val() * $("#popNetAcres").val()) * 100) / 100))
            }
            else {
                $("#popBidAmount").val(0);
            }
        }
    });

    $("#popNetAcres").on("keypress keyup blur", function (event) {
        $(this).val($(this).val().replace(/[^0-9\.]/g, ''));
        if ((event.which != 46 || $(this).val().indexOf('.') != -1) && (event.which < 48 || event.which > 57)) {
            event.preventDefault();
        }
        if (event.which != 9) {
            if ($.isNumeric($("#popDollarsPerAcre").val()) && $.isNumeric($("#popNetAcres").val())) {
                $("#popBidAmount").val(Math.round((($("#popDollarsPerAcre").val() * $("#popNetAcres").val()) * 100) / 100))
            }
            else {
                if ($.isNumeric($("#popBidAmount").val()) && $.isNumeric($("#popNetAcres").val()) && $("#popNetAcres").val() != 0) {
                    $("#popDollarsPerAcre").val((Math.round(($("#popBidAmount").val() / $("#popNetAcres").val()) * 100) / 100));
                }
            }
        }
    });

    $("#popBidAmount").on("keypress keyup blur", function (event) {
        $(this).val($(this).val().replace(/[^0-9\.]/g, ''));
        if ((event.which != 46 || $(this).val().indexOf('.') != -1) && (event.which < 48 || event.which > 57)) {
            event.preventDefault();
        }
        if (event.which != 9) {
            if ($.isNumeric($("#popBidAmount").val()) && $.isNumeric($("#popNetAcres").val()) && $("#popNetAcres").val() != 0) {
                $("#popDollarsPerAcre").val((Math.round(($("#popBidAmount").val() / $("#popNetAcres").val()) * 100) / 100));
            }
            else {
                $("#popDollarsPerAcre").val(0);
            }
        }
    });

    $("#popWinBidNetAcres").on("keypress keyup blur", function (event) {
        $(this).val($(this).val().replace(/[^0-9\.]/g, ''));
        if ((event.which != 46 || $(this).val().indexOf('.') != -1) && (event.which < 48 || event.which > 57)) {
            event.preventDefault();
        }
        if (event.which != 9) {
            if ($.isNumeric($("#popWinBidDollarsPerAcre").val()) && $.isNumeric($("#popWinBidNetAcres").val())) {
                $("#popWinBidAmount").val(Math.round((($("#popWinBidDollarsPerAcre").val() * $("#popWinBidNetAcres").val()) * 100) / 100))
            }
            else {
                if ($.isNumeric($("#popWinBidAmount").val()) && $.isNumeric($("#popWinBidNetAcres").val()) && $("#popWinBidNetAcres").val() != 0) {
                    $("#popWinBidDollarsPerAcre").val((Math.round(($("#popWinBidAmount").val() / $("#popWinBidNetAcres").val()) * 100) / 100));
                }
            }
        }
    });

    $("#popWinBidAmount").on("keypress keyup blur", function (event) {
        $(this).val($(this).val().replace(/[^0-9\.]/g, ''));
        if ((event.which != 46 || $(this).val().indexOf('.') != -1) && (event.which < 48 || event.which > 57)) {
            event.preventDefault();
        }
        if (event.which != 9) {
            if ($.isNumeric($("#popWinBidAmount").val()) && $.isNumeric($("#popWinBidNetAcres").val()) && $("#popWinBidNetAcres").val() != 0) {
                $("#popWinBidDollarsPerAcre").val((Math.round(($("#popWinBidAmount").val() / $("#popWinBidNetAcres").val()) * 100) / 100));
            }
            else {
                $("#popWinBidDollarsPerAcre").val(0);
            }
        }
    });

    // Update bid data 
    function updateBidData() {
        let url = `${parentURL}/deals//!/quickUpdate`;
        let dealNumber = DN;
        let status = $("#status").val();
        let dollarsPerAcre = $("#popDollarsPerAcre").val();
        let netAcres = $("#popNetAcres").val();
        let bidAmount = $("#popBidAmount").val();
        let bidDate = $("#popBidDate").val();
        let data = {
            dealNumbers: dealNumber,
            status: status,
            dollarsPerAcre: dollarsPerAcre,
            netAcres: netAcres,
            bidAmount: bidAmount,
            bidDate: bidDate
        };
        $.ajax({
            url: url,
            username: credentials.user,
            password: credentials.password,
            type: "POST",
            data: data,
            async: true,
            success: function (result) {
                $("#history").DataTable().ajax.reload();
                refreshViewMode();
                dialogBidCalculator.dialog("close");
            },
            error: function (data) {
            }
        });
    }

    // Update bid data 
    function updateWinBidData() {
        let dealNumber = DN;
        let winBidDollarsPerAcre = $("#popWinBidDollarsPerAcre").val();
        let winBidNetAcres = $("#popWinBidNetAcres").val();
        let winBidAmount = $("#popWinBidAmount").val();
        let winBidDate = $("#popWinBidDate").val();
        let winBidCompany = $("#popWinBidExternalCompanyId").val();
        let data = {
            dealNumber: dealNumber,
            winBidPerAcre: winBidDollarsPerAcre,
            winBidNetAcres: winBidNetAcres,
            winBidAmount: winBidAmount,
            winBidDate: winBidDate,
            winBidCompany: winBidCompany
        };
        $.ajax({
            url: `${parentURL}/deals/!/dealdetails/${dealNumber}/WinBid`,
            username: credentials.user,
            password: credentials.password,
            type: "POST",
            data: data,
            async: true,
            success: function (result) {
                $("#history").DataTable().ajax.reload();
                refreshViewMode();
                dialogWinningBid.dialog("close");
            },
            error: function (data) {
            }
        });
    }



    // Finally let's apply admin restrictions
    if (!UserIsAdmin) {
        $("#editMode").hide();
        $("#submitJournal").hide();
        $("#journalEntry").hide();
        $("#submitJournal").hide();
    }

    // open a page in a new tab, depends ond browser permissions. It may be blocked by popup blockers
    function openInNewTab(url) {
        let win = window.open(url, '_blank');
        try {
            win.focus();
        }
        catch {
            alert('Looks like your browser is blocking us to open a new Tab, please configure your browser to always allow pop-ups from this site.')
        }

    };

    /*
    // This event is triggered after the current tab regain focus 
    // We want to refresh data in some dropDown boxes
    $(window).focus(function() {
        if (tDealSourceId == '*newCompany' || tDealSourceId == "*newContact") {tDealSourceId = ''}
        if (tSellingPartyId == '*newCompany') {tSellingPartyId =''}
        if (tADFirmId == '*newCompany') {tADFirmId =''}

        loadDropDown("#dealSourceId",   "Name", "Id", tDealSourceId,   `${parentURL}/deals/!/external`,          [{text:'', value:'', location:'pre'}, {text:'* New company', value:'*newCompany', location:'post'}, {text:'* New contact',value:'*newContact', location:'post'}]);
        loadDropDown("#sellingPartyId", "Name", "Id", tSellingPartyId, `${parentURL}/deals/!/external/companies`, [{text:'', value:'', location:'pre'}, {text:'* New company', value:'*newCompany', location:'post'} ]);
        loadDropDown("#ADFirmId",       "Name", "Id", tADFirmId,       `${parentURL}/deals/!/external/companies`, [{text:'', value:'', location:'pre'}, {text:'* New company', value:'*newCompany', location:'post'} ]);
    });

    */
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

    let notesAjaxURL = `${parentURL}/notes/!/note?noteId=0&source=501&modeWeb=1&sourceId=`;
    if (DN != "") {
        notesAjaxURL = notesAjaxURL + $("#DIID").val();
    }
    else {
        notesAjaxURL = notesAjaxURL + "0";
    }

    // Enable rich text editor
    $('#editNoteText').jqte();

    // Notes (Deal Journal) datatable

    $('#tblNotes').DataTable({
        dom: "frtip",
        ajax: notesAjaxURL,
        paging: false,
        // pageLength: 5,
        info: false,
        searching: true,
        scrollX: false,
        scrollY: "400px",
        scrollCollapse: true,
        ordering: false,
        processing: true,
        language: {
            processing: '<div style="display:block;text-align:center"><img title="loading" src="/img/ajax-loading.gif"></div>',
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
                    mDate = new Date(mDate.getTime() + timezoneOffset);
                    return getFormattedDate(mDate) + '<br>' + getFormattedTimeAMPM(mDate);
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
                        case 501:
                            return "Journal";
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
                            data + //.split(String.fromCharCode(10)).join("<br/>") +
                            '</div>';
                        return response;
                    }
                }
            },
            {
                data: "FollowUp",
                className: "text-nowrap note-data dt-align-top",
                mRender: function (data, type, row) {
                    if (data) {
                        let followDate = new Date(data);
                        followDate = new Date(followDate.getTime() + timezoneOffset);
                        let followUpType = "";
                        switch (row.FollowUpType) {
                            case 1:
                                followUpType = "Phone call"
                                break;
                            case 2:
                                followUpType = "Email"
                                break;
                            case 3:
                                followUpType = "Deliverable"
                                break;
                            case 3:
                                followUpType = "In person visit"
                                break;
                        }
                        return getFormattedDate(followDate) + "<br>" + followUpType + "<br>" + row.FollowUpParty;
                    }
                    else {
                        return "";
                    }
                }
            },
            {
                data: "FollowUpComplete",
                className: "never text-nowrap dt-center dt-align-top note-task-status",
                mRender: function (data, type, row) {
                    if (row.FollowUpType == 0) {
                        return ""
                    }
                    else {
                        if (row.FollowUpCompleted == 0) {
                            return '<span style="color: red" class="fa fa-exclamation-circle"></span>';
                        }
                        else {
                            return '<span style="color: green" class="fa fa-check-circle"></span>';
                        }
                    }

                }
            },
            {
                data: "NoteId",
                className: "never text-nowrap dt-center dt-align-top note-email",
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
                visible: false,
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
            },
            {
                targets: [7],
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
            // Prep up the edit panel
            $('#editNoteId').val(data.NoteId);
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
                url: `${parentURL}/notes/!/noteDetails?modeWeb=1&noteId=${data.NoteId}`,
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
                url: `${parentURL}notes/!/note/${data.NoteId}/attendees`,
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
                type: "GET",
                async: false,
                success: function (voiceNoteList) {
                    if (!(voiceNoteList.data === {})) {
                        // There is a list of voice notes, traverse through it
                        for (let item = 0; item < voiceNoteList.data.length; item++) {
                            // Retrieve the voice note content
                            $.ajax({
                                url: `${parentURL}/notes/!/voicenote/${voiceNoteList.data[item].VoiceNoteId}`,
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
            $("#panelNotesEdit").toggle("fast");
            $("#panelDealDetails").toggle("fast");
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
            // Let the user know we're sending an email
            $("#alertSendNoteByEmail").show();
            // Got the recipient list, let's send the email
            let sendEmailURL = `${parentURL}/notes/!/note/${$("#emailNoteId").val()}/sendEmail?recipients=${recipientList}`;
            let result = executeAjaxPost(sendEmailURL, {});
            // Clear chosen selector
            $('#emailNoteRecipients').val([]);
            $('#emailNoteRecipients').trigger("chosen:updated");
            // Done
            $("#alertSendNoteByEmail").fadeTo(500, 1).slideUp(500, function () {
                $("#alertSendNoteByEmail").hide();
                // Toggle panels
                $("#panelNotesEmail").hide("fast");
                $("#panelNotesView").show("fast", function () { $('#tblNotes').DataTable().ajax.reload(); });
            });
        }
        else {
            alert("Please select the email recipients.")
        }
    });

    $("#btnNoteEmailCancel").on("click", function () {
        // Cancel, toggle the panels without doing anything
        $("#panelNotesEmail").hide("fast");
        $("#panelNotesView").show("fast", function () { $('#tblNotes').DataTable().ajax.reload(); });
    });

    $("#selectAllEmployeesNR").on("click", function () {
        $('#emailNoteRecipients option').prop('selected', true);
        $('#emailNoteRecipients').trigger("chosen:updated");
    });

    // Note task status

    $('#tblNotes tbody').on('click', '.note-task-status', function () {
        // Get the row's data
        let data = $("#tblNotes").DataTable().row(this).data();
        // Check if there is an assigned task
        if (data.FollowUpType > 0) {
            $("#taskNoteId").val(data.NoteId);
            $("#taskStatus").val(data.FollowUpCompleted)
            // Toggle the email send panel
            $("#panelNotesView").toggle("fast");
            $("#panelNotesTask").toggle("fast");
        }
    });

    $("#btnNoteTaskSend").on("click", function () {
        // Check if there are recipients selected
        let recipientList = $("#emailNoteRecipients").val().join(",");
        // Got the recipient list, let's send the email
        let setStatusURL = `${parentURL}/notes/!/note/${$("#taskNoteId").val()}/followUpStatus?newStatus=${$("#taskStatus").val()}`;
        let result = executeAjaxPost(setStatusURL, {});
        // Toggle panels
        $("#panelNotesTask").hide("fast");
        $("#panelNotesView").show("fast", function () { $('#tblNotes').DataTable().ajax.reload(); });
    });

    $("#btnNoteTaskCancel").on("click", function () {
        // Cancel, toggle the panels without doing anything
        $("#panelNotesTask").hide("fast");
        $("#panelNotesView").show("fast", function () { $('#tblNotes').DataTable().ajax.reload(); });
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
        $("#panelDealDetails").toggle("fast");
        $("#panelNotesEdit").toggle("fast");
    });

    // Click event for "Submit" button on note edit panel
    $("#btnNoteSubmit").on("click", async function () {
        // Check if all fields are valid
        let notes = $('#editNoteText').val();
        if (notes != "") {
            // Get remaining params
            let noteId = $("#editNoteId").val();
            let noteSourceId = $("#DIID").val();
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
                $("#panelDealDetails").toggle("fast", function () { $('#tblNotes').DataTable().ajax.reload(); });
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
        $("#panelDealDetails").toggle("fast", function () { $('#tblNotes').DataTable().ajax.reload(); });
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
        $("#panelDealDetails").toggle("fast", function () {
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
        $("#noteAttachments").append('<div class="row"><div class="col"><a href="/s/notes/attachments/' + noteId + '/' + filename + '" target="_blank">' + filename + '</a></div><div class="col"><input class="form-check-input" type="checkbox" value="" id="chkDiscardNoteAttachment' + arrayIndex + '"><label class="form-check-label" for=id="chkDiscardNoteAttachment' + arrayIndex + '">&nbsp;&nbsp;&nbsp;&nbsp;   Discard</label></div></div>');
    }

    function loadNoteAttachments(notePath) {
        noteAttachments.length = 0;
        let noteAttachmentPath = `${parentURL}/notes/!/note/attachments/${notePath}`;
        $("#noteAttachments").empty();
        $.ajax({
            url: noteAttachmentPath,
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
        url: `${parentURL}/deals/dropzone`
    });

    var dropZone2 = new Dropzone("form#FormDropZone2", {
        url: `${parentURL}/notes/!/note/dropzone`
    });

    // Once the file gets uploaded, we'll remove the icon from the dropzone container and
    // refresh the attachment list
    dropZone.on("complete", function (file) {
        // Remove the file icon
        dropZone.removeFile(file);
    });

    dropZone2.on("complete", function (file) {
        // Remove the file icon
        dropZone2.removeFile(file);
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

    setTimeout(function () { window.scrollTo(0, 0) }, 6000);

    // Open "new deal" confirmation dialog.
    if ($('#newRecord').val() == "true")
        dialogNewDeal.dialog("open");
});