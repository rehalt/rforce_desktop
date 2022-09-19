// Enable ipc functionality, will use it to send / recieve messages between server and renderer processes.
const ipc = require('electron').ipcRenderer;
// Get the add new "item" option from RData and clear the data
let noteData = ipc.sendSync('getRdataAddNew');
ipc.sendSync('clearRdataAddNew');

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
// let's now use jquery to retrieve it.
let UserIsAdmin = ($("#userIsAdmin").text() === 'true');
let UserId = $("#loggedEmployeeId").text();

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
    let formatedDateTime = getFormattedDate(inputDate) + 'T' + getFormatedTime(inputDate) + 'Z';
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
    let result = 0;
    // This will return either 0 (error) or 1 (success)
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
                $("#detailsParentCompany").append(new Option(response.data[i].Name, response.data[i].ExternalCompanyId));
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
            }
        },
        error: function (data) {
            console.log('Ajax error retrieving contacts.');
        }
    });

    // Load business type selector
    $.ajax({
        url: `${parentURL}/companies/!/businessTypes`,
        username: credentials.user,
        password: credentials.password,
        type: "GET",
        async: false,
        success: function (response) {
            // Traverse through result set
            for (let i = 0; i < response.data.length; i++) {
                $("#detailsBusinessType").append(new Option(response.data[i].Name, response.data[i].BusinessTypeId));
            }
        },
        error: function (data) {
            console.log('Ajax error retrieving business types.');
        }
    });

    // Retrieve URL parameters
    let URLParamList = window.location.search.substring(1).split("&");
    // First parameter contains the event id; if value is "new", then we're adding an event
    let URLParamSet = URLParamList[0].split("=");
    $("#detailsCompanyId").val(URLParamSet[1]);

    // init feedback messages
    $("#alertSuccess").hide();
    $("#alertError").hide();
    $("#loading").hide();

    // Hide edit & search panels
    $("#panelNotesEmail").toggle();
    $("#panelNotesEdit").toggle();
    $("#panelGoogleSearch").toggle();
    $("#panelCompanyMatchingNames").toggle();
    $("#attachmentsDialogDelete").toggle();

    // We can either show the edit panel when adding a new company, or show the details panel 
    // when viewing a preregistered one
    if ($("#detailsCompanyId").val() != "new") {
        // Hide the edit panel
        $("#panelCompanyEdit").toggle();
        // Also, update page title
        document.title = "Riverbend - RForce (Company details)";
        // Load company details
        refreshViewMode();
    }
    else {
        // Hide all panels except the one for editing
        $("#panelCompanyView").toggle();
        $("#panelContacts").toggle();
        $("#panelNotesView").toggle();
        $("#panelAttachments").toggle();
        // Also, update page title
        document.title = "Riverbend - RForce (Add external company)";
    }

    // set selected options
    $("#detailsParentCompany").val($("#detailsParentCompanyId").val());
    $("#detailsBusinessType").val($("#detailsBusinessTypeId").val());

    // Enable Chosen inputs
    $('#detailsParentCompany').chosen({ width: "100%", allow_single_deselect: true });
    let companyListing = $("#detailsParentCompanyId").val();
    if (companyListing != "") {
        let companyArray = companyListing.toString().replace(/ +/g, "").split(",");
        $("#detailsParentCompany").val(companyArray);
    }
    $('#detailsParentCompany').trigger("chosen:updated");


    $('#detailsDeals').chosen({ width: "100%", allow_single_deselect: true });
    let dealListing = $("#detailsDealListing").val();
    if (dealListing != "") {
        let dealArray = dealListing.toString().replace(/ +/g, "").split(",");
        $("#detailsDeals").val(dealArray);
    }
    $('#detailsDeals').trigger("chosen:updated");

    $('#emailNoteRecipients').chosen({ width: "100%", allow_single_deselect: true });
    $('#editNoteFollowUpEmployee').chosen({ width: "100%", allow_single_deselect: true });
    $('#editNoteAttendeeEmployee').chosen({ width: "100%", allow_single_deselect: true });
    $('#editNoteAttendeeContact').chosen({ width: "100%", allow_single_deselect: true });


    // test for null values
    function containInfo(testValue) {
        return (testValue === undefined || testValue == null || testValue.length <= 0 || testValue == 0) ? false : true;
    }

    // These functions refresh the company details viewer
    function refreshViewMode() {
        let companyId = $("#detailsCompanyId").val();
        let aUrl = `${parentURL}/companies/!/details/${companyId}`;
        $.ajax({
            url: aUrl,
            username: credentials.user,
            password: credentials.password,
            type: "GET",
            async: true,
            success: function (company) {
                $("#detailsCompanyLat").val(company.data[0].Lat);
                $("#detailsCompanyLong").val(company.data[0].Long);
                // Update view mode panel
                addFieldViewMode("Name: &nbsp;", company.data[0].Name, "col-sm-12", true); // First one clears the view panel
                /*
                if (company.data[0].ParentCompanyId != ''){
                    addFieldViewMode("Parent company: &nbsp;", company.data[0].ParentCompanyName, "col-sm-12", false);
                }*/
                addParentCompanyLinks(company.data[0].ParentCompanyId, company.data[0].ParentCompanyName, "col-sm-12");
                addFieldViewMode("Business type: &nbsp;", company.data[0].BusinessTypeDescription, "col-sm-12", false);
                addFieldViewMode("City: &nbsp;", company.data[0].City, "col-sm-12", false);
                addFieldViewMode("Phone number: &nbsp;", company.data[0].PhoneNumber, "col-sm-12", false);
                addFieldViewMode("Location: &nbsp;", unescape(company.data[0].LocationDetails), "col-sm-12", false);
                addHyperlink("Website: &nbsp;", company.data[0].Website, "col-sm-12", false);
                addFieldViewMode("Operated: &nbsp;", company.data[0].OperatedDescription, "col-sm-12", false);
                addDealLinks(company.data[0].Deals, "col-sm-12");
                addFieldViewMode("Created: &nbsp;", company.data[0].WhenCreated.substr(0, 10) + ' ' + company.data[0].WhenCreated.substr(11, 5) + ' <strong>by</strong> ' + company.data[0].WhoCreatedName, "col-sm-12", false);
                if (company.data[0].WhenChanged != null) {
                    addFieldViewMode("Changed: &nbsp;", company.data[0].WhenChanged.substr(0, 10) + ' ' + company.data[0].WhenChanged.substr(11, 5) + ' <strong>by</strong> ' + company.data[0].WhoChangedName, "col-sm-12", false);
                }
                addFieldViewMode("Competitor: &nbsp;", (company.data[0].Competitor == 'checked') ? 'Yes' : 'No', "col-sm-12", false);
                // Refresh the map
                googleMapsInitialize();
            },
            error: function (data) {
                console.log('Ajax error refreshing view mode data after update.');
            }
        })
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

    function addDealLinks(dealList, divClass) {
        const fieldTemplate = '<div class="' + divClass + '"> <div class="form-group"><strong>Deals: &nbsp;</strong><em>[fieldValue]</em></div></div>';
        let viewModeContainer = $("#viewModeContainer");
        if (containInfo(dealList)) {
            let dealArray = dealList.toString().replace(/ +/g, "").split(",");
            let dealLinks = ""
            dealArray.forEach(function (dealNumber) {
                dealLinks = dealLinks +
                    '<a href="' + parentURL + '/deals/dealdetails/' + dealNumber + '">' + dealNumber + '</a> ';
            });
            viewModeContainer.append(fieldTemplate.replace('[fieldValue]', dealLinks));
        }
    }



    function addParentCompanyLinks(companyIdList, companyNameList, divClass) {
        const fieldTemplate = '<div class="' + divClass + '"> <div class="form-group"><strong>Parent Company: &nbsp;</strong><em>[fieldValue]</em></div></div>';
        let viewModeContainer = $("#viewModeContainer");
        if (containInfo(companyIdList)) {
            let companyIdArray = companyIdList.toString().replace(/ +/g, "").split(",");
            let companyNamesArray = companyNameList.toString().replace(/ +/g, "").split(",");
            let companyLinks = ""

            for (let i = 0; i < companyIdArray.length; i++) {
                companyLinks = companyLinks + '<a href="' + parentURL + '/companies/' + companyIdArray[i] + '">' + companyNamesArray[i] + '</a> ';
            }

            viewModeContainer.append(fieldTemplate.replace('[fieldValue]', companyLinks));
        }
    }


    function addHyperlink(fieldDescription, fieldValue, divClass, initContainer) {
        const fieldTemplate = '<div class="' + divClass + '"> <div class="form-group"><strong>[fieldDescription] </strong><em>[fieldValue]</em></div></div>';
        let viewModeContainer = $("#viewModeContainer");
        if (initContainer) {
            viewModeContainer.empty();
        }
        if (containInfo(fieldValue)) {
            let hyperlink = '<a href="' +
                fieldValue +
                '">' +
                fieldValue +
                '</a>';

            viewModeContainer.append(fieldTemplate.replace('[fieldDescription]', fieldDescription).replace('[fieldValue]', hyperlink));
        }
    }

    // click event button "edit" switch from View to edit modes.
    $("#editMode").on("click", function () {
        // Load event details
        let companyId = $("#detailsCompanyId").val();
        let detailsURL = `${parentURL}/companies/!/details/${companyId}`;
        $.ajax({
            url: detailsURL,
            username: credentials.user,
            password: credentials.password,
            type: "GET",
            async: true,
            success: async function (company) {
                // Fill the edit fields
                $("#detailsParentCompanyId").val(company.data[0].ParentCompanyId);
                $("#detailsBusinessTypeId").val(company.data[0].BusinessTypeId);
                $("#detailsCompanyLat").val(company.data[0].Lat);
                $("#detailsCompanyLong").val(company.data[0].Long);
                $("#detailsGooglePlaceId").val(company.data[0].GooglePlaceId);
                $("#detailsPlaceTypes").val(company.data[0].PlaceTypes);
                $("#detailsDealListing").val(company.data[0].Deals);
                $("#detailsCompanyName").val(unescape(company.data[0].Name));
                $("#detailsParentCompany").val(company.data[0].ParentCompanyId);
                $("#detailsBusinessType").val(company.data[0].BusinessTypeId);
                $("#detailsCity").val(unescape(company.data[0].City));
                $("#detailsPhoneNumber").val(company.data[0].PhoneNumber);
                $("#detailsLocationDetails").val(unescape(company.data[0].LocationDetails));
                $("#detailsWebsite").val(company.data[0].Website);
                $("#detailsOperated").val(company.data[0].Operated);
                $("#detailsDeals").trigger('chosen:updated');
                // Refresh the map
                googleMapsInitialize();
            },
            error: function (data) {
                console.log('Error retrieving company details.');
            }
        })
        // Pass to "edit" mode
        $("#panelCompanyEdit").toggle("fast");
        $("#panelCompanyView").toggle("fast");
    });

    // This will take a name and check it against the registered companies

    function isEmpty(obj) {
        for (let key in obj) {
            if (obj.hasOwnProperty(key))
                return false;
        }
        return true;
    }

    async function matchingNameCompanies(name) {
        let checkNameURL = `${parentURL}/companies/!/companies/checkName/${name}`;
        let result;
        await $.ajax({
            url: checkNameURL,
            username: credentials.user,
            password: credentials.password,
            type: "GET",
            async: true,
            success: async function (company) {
                // Check if we actually found something
                result = company.data;
            },
            error: function (data) {
                result = "error";
            }
        })
        return result;
    }

    // Click event for "Submit" button on Company edit panel
    $("#detailsSubmit").on("click", async function () {
        // Validate required fields
        let missingFields = validateExternalCompanyDetails();
        console.log('missingFields: ', missingFields);

        if (missingFields === "") {
            // Retrieve and "escape" the data
            let companyId;
            if ($("#detailsCompanyId").val() === "new") {
                companyId = 0;
            }
            else {
                companyId = $("#detailsCompanyId").val();
            }
            let name = escape($("#detailsCompanyName").val().toString().trim());
            let result = await matchingNameCompanies(name);
            if (result === "error") {
                alert("Error while validating company name; please try again!");
            }
            else {
                // Check if we've got matching names
                let foundMatches = !isEmpty(result);
                if (foundMatches) {
                    // Check that the id is not the same
                    foundMatches = (companyId !== result.ExternalCompanyId.toString());
                }
                if (!foundMatches) {
                    // No matching name, resume the validation/save process
                    let parentCompanyId = $("#detailsParentCompany").val();
                    if (!containInfo(parentCompanyId)) {
                        parentCompanyId = 0;
                    }
                    let businessTypeId = $("#detailsBusinessType").val();
                    if (!containInfo(businessTypeId)) {
                        businessTypeId = 0;
                    }
                    let city = $("#detailsCity").val();
                    let phoneNumber = escape($("#detailsPhoneNumber").val().toString().trim());
                    let locationDetails = escape($("#detailsLocationDetails").val().toString().trim());
                    let lat = $("#detailsCompanyLat").val();
                    let long = $("#detailsCompanyLong").val();
                    let googlePlaceId = $("#detailsGooglePlaceId").val();
                    let website = $("#detailsWebsite").val();
                    let competitor = $('#competitor').is(":checked") ? 1 : 0;
                    let googlePlaceTypes = $("#detailsPlaceTypes").val();
                    let dealList = $("#detailsDeals").val();
                    let entityName = $("#entityName").val();
                    let entityId = $("#entityId").val();
                    let target = $("#target").val();
                    let comment = $("#comment").val();
                    let mailId = $("#mailId").val();
                    let operated = $("#detailsOperated").val();
                    if (!containInfo(operated)) {
                        operated = 0;
                    }
                    // Build the "save" URL
                    let saveURL = parentURL +
                        "/companies/!/details?" +
                        "companyId=" + companyId + "&" +
                        "parentCompanyId=" + parentCompanyId + "&" +
                        "name=" + name + "&" +
                        "businessTypeId=" + businessTypeId + "&" +
                        "city=" + city + "&" +
                        "phoneNumber=" + phoneNumber + "&" +
                        "locationDetails=" + locationDetails + "&" +
                        "lat=" + lat + "&" +
                        "long=" + long + "&" +
                        "googlePlaceId=" + googlePlaceId + "&" +
                        "website=" + website + "&" +
                        "competitor=" + competitor + "&" +
                        "googlePlaceTypes=" + googlePlaceTypes + "&" +
                        "dealList=" + dealList + "&" +
                        "senderId=" + UserId + "&" +
                        "entityName=" + entityName + "&" +
                        "entityId=" + entityId + "&" +
                        "target=" + target + "&" +
                        "comment=" + comment + "&" +
                        "mailId=" + mailId + "&" +
                        "operated=" + operated;

                    // The call it...
                    let ajaxResult = await executeAjaxPost(saveURL, {});
                    if (ajaxResult) {
                        // Done, reload the page
                        window.location.href = `./companydetails.html?companyId=${ajaxResult[0].Id}`;
                    }
                    else {
                        alert("Error saving company data.");
                    }
                }
                else {
                    // Found another company with matching name, display it
                    let matchingCompanyContainer = $("#matchingCompanyContainer");
                    let contents = '<div class="col-sm-12"><div class="form-group"><strong>Name:</strong>&nbsp;<em>' + result.Name + '</em></div></div>' +
                        '<div class="col-sm-12"><div class="form-group"><strong>Business type:</strong>&nbsp;<em>' + result.BusinessTypeDescription + '</em></div></div>' +
                        '<div class="col-sm-12"><div class="form-group"><strong>City:</strong>&nbsp;<em>' + result.City + '</em></div></div>' +
                        '<div class="col-sm-12"><div class="form-group"><strong>Deals:</strong>&nbsp;<em>' + result.Deals + '</em></div></div>' +
                        '<div class="col-sm-12">&nbsp;</div>';
                    if (result.IsActive === 0) {
                        contents = contents +
                            '<div class="col-sm-12"><strong>Company is currently deleted, do you want to restore it?</strong></div>';
                    }
                    else {
                        contents = contents +
                            '<div class="col-sm-12"><strong>Do you want to edit the original company?</strong></div>';
                    }
                    // Add our response
                    matchingCompanyContainer.empty();
                    matchingCompanyContainer.append(contents);
                    // We'll need this values to know what to do if the user clicks "yes"
                    $("#matchingCompanyId").val(result.ExternalCompanyId);
                    $("#matchingCompanyIsActive").val(result.IsActive);
                    // Toggle panels
                    $("#panelCompanyEdit").toggle();
                    $("#panelCompanyMatchingNames").toggle();
                }
            }
        }
        else {
            // Some of the required fields are missing
            alert("The following fields are required: \n\n" + missingFields);
        }
    });

    let useGoogleMaps = true;
    $("#detailsSearchMaps").on("change", function () {
        useGoogleMaps = $(this).is(":checked");
    });

    // Dialog validations
    function validateExternalCompanyDetails() {
        // This function will return a string with the names of fields missing data
        let missingFields = "";
        if ($("#detailsCompanyName").val().toString().trim() === "") {
            missingFields = "Company name\n";
        }
        if ($("#detailsBusinessType").val().toString().trim() === "") {
            missingFields = missingFields + "Business type\n";
        }
        // Return missing field names
        return missingFields;
    }

    // click event button for Edit event panel cancel button
    $("#btnMatchingNameNo").on("click", function () {
        // Toggle back the panels
        $("#panelCompanyEdit").toggle();
        $("#panelCompanyMatchingNames").toggle();
    });

    // click event button for Edit event panel cancel button
    $("#btnMatchingNameYes").on("click", function () {
        // Check if the matching company is active
        if ($("#matchingCompanyIsActive").val() === "1") {
            // Company is active, redirect to it's page
            window.location.href = `./companydetails.html?companyId=${$("#matchingCompanyId").val()}`;
        }
        else {
            // Company is inactive, let's "undelete" it first
            let undeleteURL = `${parentURL}/companies/!/companies/${$("#matchingCompanyId").val()}/undelete`;
            $.ajax({
                url: undeleteURL,
                username: credentials.user,
                password: credentials.password,
                type: "POST",
                async: true,
                success: async function (result) {
                    // Done undeleting, redirect to the page
                    window.location.href = `./companydetails.html?companyId=${$("#matchingCompanyId").val()}`;
                },
                error: function (data) {
                    console.log('error')
                    result = "error";
                }
            })
        }
    });

    // click event button for Edit event panel cancel button
    $("#detailsCancel").on("click", function () {
        // Check if we're adding a new company
        if ($("#detailsCompanyId").val() != "") {
            // Reload view panel
            refreshViewMode();
            // Viewing a previously registered company, just toggle the panels
            $("#panelCompanyEdit").toggle("fast");
            $("#panelCompanyView").toggle("fast");
        }
        else {
            // Adding a new company, redirect to company listing
            window.location.href = "./companies.html";
        }
    });

    // Company delete (well it doesn't get deleted, just hidden...)
    $("#detailsDelete").on("click", async function () {
        // We'll need this var to delete the company
        let externalCompanyId = $("#detailsCompanyId").val();
        // Delete the company 
        let deleteURL = `${parentURL}/companies/!/companies/${externalCompanyId}`;
        result = await executeAjaxDelete(deleteURL);
        // Go back to the companies main page
        window.location.href = "/companies";
    });

    // Click event for Google Places search button
    function toggleSearchPanels() {
        $("#panelCompanyEdit").toggle();
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
        $("#panelCompanyEdit").toggle();
        $("#panelGoogleSearch").toggle();
        $("#searchSpinnerDiv").hide();
        $("#searchResultDiv").hide();
    }

    $("#btnGooglePlaceSearch").on("click", function () {
        // Search google for places matching the company name
        let companyName = $('#detailsCompanyName').val().trim();
        // Continue if the user provided a name
        if (companyName.length > 5) {
            // Hide the edit panel and display the search panel
            $.when(toggleSearchPanels()).then(function () {
                // Execute the search
                getGooglePlaceSearch(companyName);
                // Check if we actually received back something (placesArray should not be empty)
                if (placesArray.length > 0) {
                    // We'll use this var to hold the accordion code
                    let accordion = "";
                    let cardCount = 0;
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
            $("#detailsCompanyName").val(data.name.replace("/", " "));
            $("#detailsGooglePlaceId").val(data.placeId);
            $("#detailsCompanyLat").val(data.lat);
            $("#detailsCompanyLong").val(data.long);
            $("#detailsPlaceTypes").val(data.placeTypes);
            $("#detailsLocationDetails").val(data.address);
            $("#detailsPhoneNumber").val(data.phoneNumber);
            $("#detailsCity").val(data.locality);
            $("#detailsWebsite").val(data.website);
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
        columns: [
            {
                data: "placeId",
                className: "never text-nowrap",
            },
            {
                data: "name",
                className: "text-wrap search-result-data"
            },
            {
                data: "lat",
                className: "never text-nowrap"
            },
            {
                data: "long",
                className: "never text-nowrap",
            },
            {
                data: "address",
                className: "text-wrap search-result-data",
            },
            {
                data: "phoneNumber",
                className: "text-wrap search-result-data",
            },
            {
                data: "website",
                className: "never text-nowrap",
            },
            {
                data: "placeTypes",
                className: "never text-nowrap",
            },
            {
                data: "locality",
                className: "text-nowrap search-result-data",
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
                searchable: false
            },
            {
                targets: [4],
                visible: true,
                searchable: false
            },
            {
                targets: [5],
                visible: false,
                searchable: false
            },
            {
                targets: [6],
                visible: false,
                searchable: false
            },
            {
                targets: [7],
                visible: false,
                searchable: false
            }
        ]
    });

    let tblSearchResults = $('#tblSearchResults').DataTable();

    // Contacts datatable
    let contactsAjaxURL = parentURL +
        "/companies/!/companies/";
    if ($("#detailsCompanyId").val() != "") {
        contactsAjaxURL = contactsAjaxURL +
            $("#detailsCompanyId").val() +
            "/contacts";
    }
    else {
        contactsAjaxURL = contactsAjaxURL + "0/contacts";
    }

    $('#tblContacts').DataTable({
        dom: "frtip",
        ajax: contactsAjaxURL,
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
        "columns": [
            {
                "data": "ContactId",
                "className": "never text-nowrap",
            },
            {
                "data": "FirstName",
                "className": "text-nowrap company-data"
            },
            {
                "data": "Position",
                "className": "text-nowrap company-data",
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
                "searchable": true,
                "render": function (data, type, row) {
                    result = '<a href="./contactdetails.html?contactId=' + row.ContactId + '">' + row.LastName + ', ' + row.FirstName + '</a>';
                    return result;
                }
            },
            {
                "targets": [],
                "visible": true,
                "searchable": true
            }
        ]
    });


    // Click event for "New contact" button
    $("#btnAddContact").on("click", function () {
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
                console.log('Unable to create new contact. (' + textStatus + ')');
            }
        });
    });

    // Attachment list
    let companyId = $("#detailsCompanyId").val();
    if (companyId > 0) {
        tblAttachments = $('#tblAttachments').DataTable({
            dom: "Bfrtip",
            ajax: `${parentURL}/companies/!/companies/${companyId}/attachments/`,
            username: credentials.user,
            password: credentials.password,
            language: { "emptyTable": "There are no attachments for this company" },
            scrollX: true,
            paging: false,
            ordering: false,
            info: false,
            select: true,
            columns: [
                {
                    data: "fullFileName",
                    mRender: function (data, type, row) {
                        return '<a href="' + parentURL + '/companies/!/companies/' + row.companyId + '/attachments/' + data + '"><i class="fa fa-download"></i></a>';
                    }
                },
                { data: "fileName" },
                { data: "fileDate" },
                { data: "companyId" },
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


        // Init companies attachments drop zone
        $("#attachmentDropZone").dropzone({
            url: `${parentURL}/companies/!/companies/${companyId}/attachments/`,
            dictDefaultMessage: '<big><big><big><i class="fa fa-paperclip"></i></big></big></big> <b>Drop files here to upload</b>',
            createImageThumbnails: false,
            success: function (file, response) {
                $('#attachmentDropZone')[0].dropzone.files.forEach(function (file) {
                    file.previewElement.remove();
                });
                $('#attachmentDropZone').removeClass('dz-started');

                if (companyId > 0) {
                    tblAttachments.ajax.reload();
                }
            },
            error: function (errorMessage, xhr) {
                console.log('errorMessage : ', errorMessage);
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
                                type: "delete",
                                url: `${parentURL}/companies/!/companies/${companyId}/attachments/${fileNames}`,
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

    }


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


    // Enable rich text editor
    $('#editNoteText').jqte();

    // This will hold the name of file attached to the note
    let noteAttachments = [];

    let notesAjaxURL = `${parentURL}/companies/!/companies/`;
    if ($("#detailsCompanyId").val() != "") {
        notesAjaxURL = notesAjaxURL + $("#detailsCompanyId").val() + "/notes";
    }
    else {
        notesAjaxURL = notesAjaxURL + "0/notes";
    }

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
                    let result;
                    switch (data) {
                        case 101:
                            return "General";
                        case 102:
                            return "Meeting";
                        case 200:
                        case 201:
                        case 202:
                            result = '<a href="./contactdetails.html?contactId=/' + row.SourceId + '">Contact<br><small>' + row.ContactName + '</small></a>';
                            return result;
                        case 301:
                            result = '<a href="./calendardetails/calendarId=' + row.SourceId + '">Calendar</a>';
                            return result;
                        case 402:
                            result = '<a href="./tripdetails.html?tripId=' + row.TripId + '">Trip</a>';
                            return result;
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
            {
                data: "ContactName"
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
            $("#AttachmentNoteTempPath").val("");
            $('#editNoteType').val(data.Source);
            $('#editNoteText').jqteVal(data.Note);
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
            $("#companyView").toggle("fast");
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
        if ($("#panelNotesEdit").is(":hidden")) {
            $("#companyView").toggle("fast");
            $("#panelNotesEdit").toggle("fast");
        }
    });

    // Click event for "Submit" button on note edit panel
    $("#btnNoteSubmit").on("click", async function () {
        // Check if all fields are valid
        let notes = $('#editNoteText').val();
        if (notes != "") {
            // Get remaining params
            let noteId = $("#editNoteId").val();
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
            console.log(payload)
            // Prepare the save URL
            let saveURL = parentURL +
                "/notes/!/note";
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
                let saveURL = parentURL +
                    "/notes/!/note/" + noteId + "/attendees" +
                    "?employeeList=" + linkedEmployees +
                    "&contactList=" + linkedContacts +
                    "&followUpList=" + followUpParty;
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
                                url: parentURL +
                                    "/notes/!/voicenote",
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
                                url: parentURL +
                                    "/notes/!/voicenote/" +
                                    voiceNotes[voiceNoteIndex].voiceNoteId,
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
                $("#companyView").toggle("fast", function () { $('#tblNotes').DataTable().ajax.reload(); });
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
        $("#companyView").toggle("fast", function () { $('#tblNotes').DataTable().ajax.reload(); });
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
        $("#companyView").toggle("fast", function () {
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


    /* Google maps related functions */
    let googleMapsURL = 'https://maps.googleapis.com/maps/api/js?key=' +
        googleMapsAPIKey +
        '&libraries=places';
    // Map related vars
    let geocoder;
    let map;
    let marker;

    function googleMapsInitialize() {
        let initialLat = $('#detailsCompanyLat').val();
        let initialLong = $('#detailsCompanyLong').val();
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
    // Link to Location field
    let PostCodeid = '#detailsLocationDetails';
    $(function () {
        $(PostCodeid).autocomplete({
            source: function (request, response) {
                if (useGoogleMaps) {
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
                }
            },
            select: function (event, ui) {
                $('#companyLocation').val(ui.item.value);
                $('#detailsCompanyLat').val(ui.item.lat);
                $('#detailsCompanyLong').val(ui.item.lon);
                let latlng = new google.maps.LatLng(ui.item.lat, ui.item.lon);
                marker.setPosition(latlng);
                googleMapsInitialize();
            }
        });
    });

    // Point location on google map 
    $('#get_map').click(function (e) {
        var address = $(PostCodeid).val();
        geocoder.geocode({ 'address': address }, function (results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
                map.setCenter(results[0].geometry.location);
                marker.setPosition(results[0].geometry.location);
                $('#detailsLocationDetails').val(results[0].formatted_address);
                $('#detailsCompanyLat').val(marker.getPosition().lat());
                $('#detailsCompanyLong').val(marker.getPosition().lng());
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

    // Finally let's apply admin restrictions
    if (!UserIsAdmin) {
        $("#editMode").hide();
        $("#btnAddNote").hide();
    }

});
