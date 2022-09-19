//let ElectronCookies = require('@exponent/electron-cookies');
//ElectronCookies.enable({ });

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

// Globals
let linkClicked = false;

// Admin user flag was passed through the hidden P tag "userIsAdmin" to handlebars
let UserIsAdmin = ($("#userIsAdmin").text() === 'true');
let UserId = $("#loggedEmployeeId").text();

/* User privilege handling */
function applyUserPrivileges(isAdmin) {

}

// get a cookie value
function getCookieValue(a) {
    var b = document.cookie.match('(^|[^;]+)\\s*' + a + '\\s*=\\s*([^;]+)');
    return b ? b.pop() : '';
}

async function executeAjaxPost(URL, payload) {
    // This will return either 0 (error) or 1 (success)
    let result = 0;
    let ajaxPostResult = await $.ajax({
        username: credentials.user,
        password: credentials.password,
        async: true,
        type: 'POST',
        url: URL,
        data: payload,
        success: function (data) {
            result = data.data;
        }
    });
    return result;
}

// Reset all datatable filters using data previously stored  
function setDropDownFilterDefaults() {
    const multiselect = true;
    let x = { dealNumber: '', dealName: '', basin: '', companyID: '', bidAmount: '', bidDueDate: '', status: '', sellingParty: '', source: '', isMapped: '' };
    let c = getCookieValue("dealtablestate");
    if (c != '') { x = JSON.parse(c).filter };
    let isMapped = null;
    switch (x.isMapped) {
        case 1:
            isMapped = '✔';
            break;
        case 0:
            isMapped = '❌';
            break;
        case null:
            isMapped = '';
            break;
    };
    setDropDownValue('ddfilter_1', x.dealNumber);
    setDropDownValue('ddfilter_2', x.dealName);
    setDropDownValue('ddfilter_3', x.basin);
    setDropDownValue('ddfilter_4', x.companyID, multiselect);
    setDropDownValue('ddfilter_5', x.bidAmount);
    setDropDownValue('ddfilter_6', x.bidDueDate);
    setDropDownValue('ddfilter_7', x.status, multiselect);
    setDropDownValue('ddfilter_8', x.sellingParty);
    setDropDownValue('ddfilter_9', x.source);
    setDropDownValue('ddfilter_17', x.netAcres);
    setDropDownValue('ddfilter_24', x.netRoyaltyAcres);
    setDropDownValue('ddfilter_25', isMapped);

}

// set a default value for a given dropdown control
function setDropDownValue(dropDownName, selectedValue, multiselect) {
    if (multiselect) {
        if (selectedValue != "''" && selectedValue.trim() != "") {
            let selectedValues = [];
            if (dropDownName.trim() == 'ddfilter_3') {
                selectedValues = selectedValue.replace(/\'/g, '').split("|");
            } else {
                selectedValues = selectedValue.replace(/\'/g, '').split(",");
            }
            $("#" + dropDownName).val(selectedValues).trigger("chosen:updated");
        }
    }
    else {
        $("#" + dropDownName).val(selectedValue).trigger("chosen:updated");
    };
}

// The ever conspicuous document ready function...
$(document).ready(function () {
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
                $("#settingsBasin").append(new Option(response.data[i].Name, response.data[i].Name));
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
                $("#settingsCompany").append(new Option(response.data[i].Company, response.data[i].CompanyNumber));
            }
        },
        error: function (data) {
            console.log('Ajax error retrieving companies.');
        }
    });
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
                $("#settingsStatus").append(new Option(response.data[i].Status, response.data[i].Status));
                $("#popStatus").append(new Option(response.data[i].Status, response.data[i].Status));
            }
        },
        error: function (data) {
            console.log('Ajax error retrieving deal statuses.');
        }
    });

    // Load external company selector (Selling party)
    $.ajax({
        url: `${parentURL}/deals/!/external/companies`,
        username: credentials.user,
        password: credentials.password,
        type: "GET",
        async: false,
        success: function (response) {
            // Traverse through result set
            for (let i = 0; i < response.data.length; i++) {
                $("#settingsSellingParty").append(new Option(response.data[i].Name, response.data[i].Name));
            }
        },
        error: function (data) {
            console.log('Ajax error retrieving external companies.');
        }
    });

    // Define export file name
    let exportFileName = "Deal Form Report - " + new Date().toDateString().slice(4);

    // Filter settings view button
    $("#btnMasterSettings").on("click", function () {
        // Toggle settings panel
        $("#panelDisplaySettings").toggle("fast");
    });

    // Enable Chosen selectors
    $(".filterSelect").chosen({ width: "100%" });

    // Hide settings panel
    $("#panelDisplaySettings").hide();
    $("#settingsPresetNameSection").hide();

    // This function loads table filters
    function loadFilterSettingsSelector(selectedId) {
        // Clear the selector
        $("#settingsSavedPresets").empty();
        $("#settingsSavedPresets").append(new Option('None', '0'));
        // Retrieve employee's filter settings for this module
        let activeFilterId = 0;
        $.ajax({
            url: `${parentURL}/deals/!/tablefilter?tableFilterId=0&employeeId=${UserId}&targetModule=1`,
            type: "GET",
            async: false,
            success: function (response) {
                if (response != null) {
                    // Fill the selector)
                    if (response.data) {
                        for (let i = 0; i < response.data.length; i++) {
                            $("#settingsSavedPresets").append(new Option(response.data[i].Description, response.data[i].TableFilterId));
                            if (response.data[i].IsSelected == 1) {
                                activeFilterId = response.data[i].TableFilterId;
                            }
                        }
                    }
                }
            }
        });
        if (selectedId == 0) {
            selectedId = activeFilterId;
        }
        $("#settingsSavedPresets").val(selectedId);
        applyFilterSettings(selectedId);
    }

    function clearFilterSettings() {
        // Reset filter fields
        $("#settingsFilterId").val("0");
        $("#settingsBasin").val([]).trigger("chosen:updated");
        $("#settingsCompany").val([]).trigger("chosen:updated");
        $("#settingsStatus").val([]).trigger("chosen:updated");
        $("#settingsSellingParty").val("");
        $("#settingsIsMapped").val("");
        $("#settingsDeadDeals").val("0");
        $("#settingsSavePreset").prop("checked", false);
        $("#settingsPresetName").val("");
        $("#settingsPresetNameSection").hide();
        $("#settingsSavedPresets").val("0");
    }

    function setChosenSelectorValues(selectorName, value) {
        let chosenValues = [];
        if (value != "") {
            chosenValues = value.split("|");
        }
        $(`#${selectorName}`).val(chosenValues).trigger("chosen:updated");
    }

    function applyFilterSettings(selectedFilterId) {
        // Check if "none" is selected
        if (selectedFilterId == "0") {
            clearFilterSettings();
        }
        else {
            // Let's load the filter settings
            $.ajax({
                url: `${parentURL}/deals/!/tablefilter?tableFilterId=${selectedFilterId}&employeeId=0&targetModule=0`,
                type: "GET",
                success: function (response) {
                    // Check answer
                    if (response.data != null) {
                        // Retrieve response
                        let filterSettings = JSON.parse(response.data[0].Settings);
                        // Apply settings
                        $("#settingsFilterId").val(selectedFilterId);
                        setChosenSelectorValues('settingsBasin', (filterSettings.basin || "").trim());
                        setChosenSelectorValues('settingsCompany', (filterSettings.company || "").trim());
                        setChosenSelectorValues('settingsStatus', (filterSettings.status || "").trim());
                        $('#settingsSellingParty').val((filterSettings.sellingParty || "").trim());
                        $("#settingsPresetName").val(response.data[0].Description.trim())
                        $("#settingsIsMapped").val((filterSettings.isMapped || ""));
                        $("#settingsDeadDeals").val((filterSettings.deadDeals || "0"))
                        $("#settingsSavePreset").prop("checked", true);
                        $("#settingsPresetNameSection").show();
                    }
                }
            });
        }
    }

    // Do a first load of filters
    loadFilterSettingsSelector(0);

    // Check if a filter got selected
    $("#settingsSavedPresets").on("change", function () {
        // Get selected Id
        let selectedFilterId = $(this).children("option:selected").val();
        // Delete filter button only visible if a filter is selected
        if (selectedFilterId == 0) {
            $("#btnDeleteSettings").hide();
        }
        else {
            $("#btnDeleteSettings").show();
        }
        // Apply them
        applyFilterSettings(selectedFilterId);
    });

    // New filter button event
    $("#btnNewSettings").click(function () {
        // Reset filter fields
        clearFilterSettings();
    });

    // Delete filter button event
    $("#btnDeleteSettings").click(async function () {
        let deleteFilterSettings = confirm("Delete this filter setting?")
        if (deleteFilterSettings) {
            let selectedFilterId = $("#settingsFilterId").val();
            await $.ajax({
                async: true,
                type: 'DELETE',
                url: `${parentURL}/deals/!/tablefilter?tableFilterId=${selectedFilterId}`,
                success: function (data) {
                    // Deleted, clear filter selector and reset fields
                    clearFilterSettings();
                    loadFilterSettingsSelector(0);
                    // Refresh datatable
                    $('#tblDeals').DataTable().draw();
                }
            });
        }
    });

    // When clicking "Save current settings" checkbox, hide/show settings name
    $("#settingsSavePreset").on("change", function () {
        if ($(this).is(":checked")) {
            // Hide the "end date" section
            $("#settingsPresetNameSection").show();
        }
        else {
            $("#settingsPresetNameSection").hide();
        }
    });

    // Cancel filter settings
    $("#btnCancelSettings").click(function () {
        $("#panelDisplaySettings").toggle("fast");
    });

    // Apply filter settings
    $("#btnApplySettings").click(async function () {
        // Check if we're saving this setting
        let saveSetting = $("#settingsSavePreset").is(":checked");
        // If we're saving then we need a filter description
        let continueApplying = (!saveSetting || (saveSetting && ($("#settingsPresetName").val().trim().length > 0)));
        if (continueApplying) {
            // Save these settings, if required.
            if (saveSetting) {
                // We're saving filter settings as a JSON objext
                let filterSettings = {
                    basin: $("#settingsBasin").val().join("|"),
                    company: $("#settingsCompany").val().join("|"),
                    status: $("#settingsStatus").val().join("|"),
                    sellingParty: $("#settingsSellingParty").val(),
                    isMapped: $("#settingsIsMapped").val(),
                    deadDeals: $("#settingsDeadDeals").val()
                };
                // Let's now save this settings
                let payload = {
                    tableFilterId: $("#settingsFilterId").val(),
                    description: $("#settingsPresetName").val().trim(),
                    employeeId: UserId,
                    targetModule: 1,
                    settings: JSON.stringify(filterSettings)
                };
                // Save it
                let result = await executeAjaxPost(`${parentURL}/deals/!/tablefilter`, payload);
                // Now that we have the filter Id, let's set it as default
                let payload2 = {
                    tableFilterId: result.Id,
                    targetModule: 1
                };
                await executeAjaxPost(`${parentURL}/deals/!/tablefilter/setActive`, payload2);
                // Reload datatable filter selector
                loadFilterSettingsSelector(result.Id);
            }
            // Apply filter settings
            $('#tblDeals').DataTable().draw();
            // Done, hide the settings panel
            $("#panelDisplaySettings").toggle("fast");
        }
        else {
            // User didn't provide a preset name
            alert("Please provide a description to identify and save these filter settings.");
        }
    });

    // Deals datatable

    $('#tblDeals').DataTable({
        dom: "Bfrtip",
        ajax: `${parentURL}/deals/!/deals`,
        scrollX: false,
        deferRender: true,
        btStateSave: false,
        stateSave: false,
        pageLength: 50,
        order: [[8, "desc"]],
        bSortCellsTop: true,
        select: { style: 'os' },
        search: {
            regex: true
        },
        columns: [{
            data: "DealNumber", type: "String",
            mRender: function (data, type, full) {
                const a = String.fromCharCode(39);
                const c = String.fromCharCode(34);
                return "<a href='./dealdetails.html?dealNumber=" + data + "' onclick='openDealDetails(" + c + data + c + ");'>" + data + "</a>"
            }
        },
        { data: "DealName" },
        { data: "Basin", className: "text-nowrap" },
        { data: "CompanyID" },
        {
            data: "WinBidAmount", className: "text-right",
            mRender: function (data, type, full) {
                return (data != '') ? (' * $' + data) : (full.BidAmount != '') ? '$' + full.BidAmount : full.BidAmount;
            }
        },
        { data: "BidDueDate", className: "text-nowrap" },
        {
            data: "Status",
            orderData: [25]
        },
        { data: "SellingParty" },
        { data: "DateEntered", className: "text-nowrap" },
        {
            data: "Description", className: "never text-nowrap", visible: false,
            mRender: function (data, type, full) {
                let pre = '<span data-toggle="tooltip" title="' + data + '">';
                let pos = '</span>'
                return (type === "export") ? data : (data.len < 21) ? pre + data + pos : (pre + data.substr(0, 17) + "..." + pos);
            }
        },
        { data: "BidDate", className: "text-nowrap", visible: false },
        { data: "ADFirm", visible: false },
        { data: "DealSource", visible: false },
        { data: "Company", visible: false },
        { data: "IsActive", visible: false },
        { data: "CompanyGUID", visible: false },
        { data: "NetAcres" },
        { data: "DepthsBenches", visible: false },
        { data: "counties", visible: false },
        {
            data: "WinBidDate", visible: false,
            mRender: function (data, type, full) {
                return (data != '') ? data : full.BidDate
            }
        },
        {
            data: "WinBidAmount", visible: false,
            mRender: function (data, type, full) {
                return (data != '') ? (' * ' + data) : full.BidAmount
            }
        },
        {
            data: "WinBidPerAcre", visible: false,
            mRender: function (data, type, full) {
                return (data != null) ? data : full.PerAcre
            }
        },
        { data: "PerAcre", visible: false },
        { data: "NetRoyaltyAcres" },
        {
            data: "IsMapped", className: "never text-nowrap dt-body-center", visible: true,
            mRender: function (data, type, full) {
                return (type === "export") ? (data == 1 ? 'Yes' : 'No') : (data == 1 ? '✔' : '❌');
            }
        }, {
            data: "StatusSortOrder",
            visible: false
        }
        ],
        ordering: true,
        buttons: [{
            text: "<span class='glyphicon glyphicon-plus' aria-hidden='true'></span> Add deal",
            action: function (e, dt, node, config) {
                // Check if user is admin, otherwise ignore this
                if (UserIsAdmin) {
                    // Open the new deal page (need to call this function so the datatable state cookie gets propperly baked)
                    openDealDetails("new");
                }
                else {
                    alert("You don't have enough privileges to perform this action.")
                }
            },
            className: 'dealsPageButtons'
        },
        {
            extend: "excelHtml5",
            text: "<span class='glyphicon glyphicon-download' aria-hidden='true'></span> Excel",
            exportOptions: {
                orthogonal: "export",
                columns: [0, 1, 2, 3, 16, 6, 5, 19, 20, 21, 8, 16, 23, 24]
            },
            filename: exportFileName, // exportFileName
            className: 'dealsPageButtons'
        },
        {
            text: "<span class='fa fa-filter' aria-hidden='true'></span> Filter",
            action: function (e, dt, node, config) {
                $("#panelDisplaySettings").toggle("fast");
            },
            className: 'dealsPageButtons'
        },
        {
            text: "<span class='fa fa-undo' aria-hidden='true'></span> Reset filter",
            action: function (e, dt, node, config) {
                // Reset filter fields
                clearFilterSettings();
                applyFilterSettings(0)
                // Resort by sourced date
                let table = $('#tblDeals').DataTable();
                table.order([8, 'desc']);
                table.draw();
            },
            className: 'dealsPageButtons'
        },
        {
            text: "<span class='glyphicon glyphicon-edit' aria-hidden='true'></span> Quick edit",
            action: function (e, dt, node, config) {
                // This should only work if the user has admin rights
                if (UserIsAdmin) {
                    let table = $('#tblDeals').DataTable();
                    var data = table.rows('.selected').data();
                    var selectedDealNumbers = '';
                    // Check at least one deal is selected
                    if (data.length > 0) {
                        for (let i = 0; i < data.length; i++) {
                            selectedDealNumbers = selectedDealNumbers + data[i].DealNumber + ',';
                        }
                        selectedDealNumbers = selectedDealNumbers.slice(0, -1);
                        if (data.length == 1) {
                            // user selected a single record
                            $("#multipleSelectionWarning").hide();
                            $("#popStatus").val(data[0].Status.trim());
                            $("#popDollarsPerAcre").val(data[0].PerAcre);
                            $("#popNetAcres").val(data[0].NetAcres);
                            $("#popBidAmount").val(data[0].BidAmount);
                            $("#popBidDate").val(data[0].BidDate);
                            $("#popSelectedDealNumbers").val(selectedDealNumbers);
                        }
                        else {
                            // user selected multiple records
                            $("#multipleSelectionWarning").show();
                            $("#popStatus").val("");
                            $("#popDollarsPerAcre").val('');
                            $("#popNetAcres").val('');
                            $("#popBidAmount").val('');
                            $("#popBidDate").val('');
                            $("#popSelectedDealNumbers").val(selectedDealNumbers);
                        }
                        // open Bid Caculator
                        $quickEditDialog.dialog('open');
                    }
                    else {
                        alert("Please select a deal.")
                    }
                }
                else {
                    alert("You don't have enough privileges to perform this action.")
                }
            },
            className: 'dealsPageButtons'
        }],
        columnDefs: [{
            targets: [17],
            visible: true,
            searchable: true
        }]
    });

    let basinFilter = $("#settingsBasin");
    let companyFilter = $("#settingsCompany");
    let statusFilter = $("#settingsStatus");
    let sellingPartyFilter = $("#settingsSellingParty");
    let isMappedFilter = $("#settingsIsMapped");
    let deadDealsFilter = $("#settingsDeadDeals");

    // This will actually do the filtering
    $.fn.dataTable.ext.search.push(function (settings, data, dataIndex) {
        let visible = true;
        // Basin
        if (basinFilter.val().length > 0) {
            visible = (basinFilter.val().includes(data[2].trim()));
        }
        // Company
        if (visible && (companyFilter.val().length > 0)) {
            visible = (companyFilter.val().includes(data[3].trim()));
        }
        // Status
        if (visible && (statusFilter.val().length > 0)) {
            visible = (statusFilter.val().includes(data[6].trim()));
        }
        // Selling party
        if (visible && (sellingPartyFilter.val() != "")) {
            visible = (sellingPartyFilter.val() == data[7].trim());
        }
        // Is Mapped
        if (visible && (isMappedFilter.val() != "")) {
            if (isMappedFilter.val() == 1) {
                visible = (data[24] == "✔");
            }
            else {
                visible = (data[24] == "❌");
            }
        }
        // Dead deals
        if (visible && (deadDealsFilter.val() == "0")) {
            visible = (data[14].trim() == "ACTIVE");
        }
        // Done...
        return visible;
    });

    // This function stores datatable state,

    function removeRegEx(value) {
        while (value.includes('\\b')) {
            value = value.replace('\\b', '');
        }
        return value;
    }

    // Store state and redirect to the deal details page
    openDealDetails = function (dealNumber) {
        window.location.href = `./dealdetails.html?dealNumber=${dealNumber}`;
        return false;
    };

    // when user leaves the page we should store table state (filters)
    window.onbeforeunload = pageExit;

    function pageExit() {
        storeTableState();
    }

    // Quick edit dialog
    let $quickEditDialog = $('#quickEdit').dialog({
        autoOpen: false,
        width: 350,
        height: 650,
        modal: true,
        buttons: {
            "Update Deal": function () {
                quickUpdate();
            },
            "Cancel": function () {
                $quickEditDialog.dialog("close");
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

    // init data picker for bidDate					 
    $(function () {
        jQuery("#popBidDate").datepicker({
            constrainInput: true
        });
    });

    // Bid calculator (when dollars per acre changes)
    $("#popDollarsPerAcre").on("keypress keyup blur", function (event) {

        $(this).val($(this).val().replace(/[^0-9\.]/g, ''));
        if ((event.which != 46 || $(this).val().indexOf('.') != -1) && (event.which < 48 || event.which > 57)) {
            event.preventDefault();
        }

        if (event.which != 9) {
            if ($.isNumeric(jQuery("#popDollarsPerAcre").val()) && $.isNumeric(jQuery("#popNetAcres").val())) {
                $("#popBidAmount").val(Math.round((($("#popDollarsPerAcre").val() * $("#popNetAcres").val()) * 100) / 100))
            }
            else {
                $("#popBidAmount").val(0);
            }
        }
    });

    // Bid calculator (when net acres changes)
    $("#popNetAcres").on("keypress keyup blur", function (event) {

        $(this).val($(this).val().replace(/[^0-9\.]/g, ''));
        if ((event.which != 46 || $(this).val().indexOf('.') != -1) && (event.which < 48 || event.which > 57)) {
            event.preventDefault();
        }

        if (event.which != 9) {
            if ($.isNumeric(jQuery("#popDollarsPerAcre").val()) && $.isNumeric($("#popNetAcres").val())) {
                $("#popBidAmount").val(Math.round((($("#popDollarsPerAcre").val() * $("#popNetAcres").val()) * 100) / 100))
            }
            else {
                if ($.isNumeric($("#popBidAmount").val()) && $.isNumeric($("#popNetAcres").val()) && $("#popNetAcres").val() != 0) {
                    $("#popDollarsPerAcre").val((Math.round(($("#popBidAmount").val() / $("#popNetAcres").val()) * 100) / 100));
                }
            }
        }
    });

    // Bid calculator (when bid amount changes)
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

    // This saves deal data (via quick edit dialog)
    function quickUpdate() {
        // Get the input fields data
        let dealNumbers = $("#popSelectedDealNumbers").val();
        let status = $("#popStatus").val();
        let dollarsPerAcre = $("#popDollarsPerAcre").val();
        let netAcres = $("#popNetAcres").val();
        let bidAmount = $("#popBidAmount").val();
        let bidDate = $("#popBidDate").val();
        let data = {
            dealNumbers: dealNumbers,
            status: status,
            dollarsPerAcre: dollarsPerAcre,
            netAcres: netAcres,
            bidAmount: bidAmount,
            bidDate: bidDate
        };
        $.ajax({
            url: `${parentURL}/deals/!/quickUpdate`,
            username: credentials.user,
            password: credentials.password,
            type: 'post',
            dataType: 'json',
            data: data,
            success: function () {
                $quickEditDialog.dialog("close");
                $("#tblDeals").DataTable().ajax.reload();
            }
        });
    }

    // Datatable filter cookie
    function storeTableState() {
        // Assemble the list of visible deals
        filteredRows = $('#tblDeals').DataTable().rows({ filter: 'applied' });
        let visibleDeals = [];
        for (let i = 0; i < filteredRows.data().length; i++) {
            visibleDeals.push(filteredRows.data()[i].DealNumber);
        }
        // Do our IPC call to send the filtered deal list to the server as a pipe separated string
        let response = ipc.sendSync('setDealList', visibleDeals.join("|"));
    }
});