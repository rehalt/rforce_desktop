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

console.log(parentURL);

var contactTable;
var editorContact;

// get a cookie value
function getCookieValue(a) {
    var b = document.cookie.match('(^|[^;]+)\\s*' + a + '\\s*=\\s*([^;]+)');
    return b ? b.pop() : '';
}

// Reset all datatable filters using data previously stored  
function setDropDownFilterDefaults() {
    const multiselect = true;
    let x = { lastName: '', firstName: '', position: '', company: '', companyType: '', city: '', email: '', phone: '', deal: '' };
    let c = getCookieValue("contacttablestate");
    if (c != '') { x = JSON.parse(c).filter };
    $('#ddfilter_2').val(x.lastName);
    $('#ddfilter_3').val(x.firstName);
    $('#ddfilter_4').val(x.position);
    setDropDownValue('ddfilter_5', x.company, multiselect);
    setDropDownValue('ddfilter_6', x.companyType, multiselect);
    setDropDownValue('ddfilter_7', x.city, multiselect);
    $('#ddfilter_8').val(x.email);
    $('#ddfilter_9').val(x.phone);
    $('#ddfilter_10').val(x.deal);
}

// set a default value for a given dropdown control
function setDropDownValue(dropDownName, selectedValue, multiselect) {
    if (multiselect) {
        if (selectedValue != "''" && selectedValue.trim() != "") {
            multiValues = selectedValue.replace(/\'/g, '').split(",");
            for (let i = 0; i < multiValues.length; i++) {
                $(`#${dropDownName} option[value='${multiValues[i].trim()}']`).prop('selected', 'selected');
            }
        }
    }
    else {
        $(`#${dropDownName} option[value='${selectedValue}']`).prop('selected', 'selected');
    };
}




// The ever conspicuous document ready function...
$(document).ready(function () {
    let exportFileName = "Contacts Report - " + new Date().toDateString().slice(4);

    // generic function to populate dropdowns from a REST source
    function loadDropDown(dropDownName, itemText, itemValue, selectedValue, urlAjaxSource, arrExtraItems) {
        // Load a list of deals
        $.ajax({
            async: true,
            type: 'get',
            url: urlAjaxSource,
            username: credentials.user,
            password: credentials.password,
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




    editorContact = new $.fn.DataTable.Editor({
        ajax: `${parentURL}/contacts/!/contacts/`,
        table: "#tblContacts",
        idSrc: 'ContactId',
        fields: []
    });

    contactTable = $('#tblContacts').DataTable({
        dom: "Bfrtip",
        scrollX: true,
        stateSave: true,
        ajax: `${parentURL}/contacts/!/contacts/`,
        deferRender: true,
        bSortCellsTop: true,
        select: { style: 'os' },
        columns: [
            {
                data: "ContactId",
                className: "contact-data"
            },

            {
                data: "LastName",
                className: "contact-data",
                mRender: function (data, type, full) {
                    let href = `./contactdetails.html?contactId=${full.ContactId}`;
                    return getAnchorHtml(href, ``, data);
                }
            },

            {
                data: "FirstName",
                className: "contact-data",
                mRender: function (data, type, full) {
                    let href = `./contactdetails.html?contactId=${full.ContactId}`;
                    return getAnchorHtml(href, ``, data);
                }
            },

            {
                data: "Position",
                className: "contact-data"
            },

            {
                data: "Company",
                className: "contact-company",
                mRender: function (data, type, full) {
                    let href = `./companies/companydetails.html?companyId=${full.ExternalCompanyId}`;
                    return getAnchorHtml(href, ``, data);
                }
            },
            {
                data: "CompanyType",
                className: "contact-data"
            },
            {
                data: "City",
                className: "contact-data"
            },

            {
                data: "PrimaryEmail",
                className: "contact-data"
            },

            {
                data: "PrimaryPhone",
                className: "contact-data"
            },

            {
                data: "Deals",
                className: "datatable-centered-text contact-deal-link",
                mRender: function (data, type, full) {
                    if (data != "") {
                        let dealArray = data.toString().replace(/ +/g, "").split(",");
                        let dealLinks = ""
                        dealArray.forEach(function (dealNumber) {
                            let href = `./dealdetails.html?dealNumber=${dealNumber}`;
                            dealLinks = dealLinks + getAnchorHtml(href, '', dealNumber) + ' ';
                        });
                        data = dealLinks;
                    }
                    return data;
                }
            },
            {
                data: "ExternalCompanyId"
            }
        ],
        columnDefs: [
            {
                "targets": [0, 10],
                "visible": false,
                "searchable": false
            },
            {
                "targets": [1],
                "className": "contact-data",
                "searchable": true,
                "fnCreatedCell": function (nTd, sData, oData, iRow, iCol) {
                    $(nTd).addClass("contact-data");
                }
            },
            {
                "targets": [2],
                "className": "contact-data",
                "searchable": true
            },
            {
                "targets": [3],
                "className": "contact-data",
                "searchable": true
            },
            {
                "targets": [4],
                "className": "contact-company",
                "searchable": true
            },
            {
                "targets": [5],
                "className": "contact-data",
                "searchable": true
            },
            {
                "targets": [6],
                "className": "contact-data",
                "searchable": true
            },
            {
                "targets": [7],
                "className": "contact-data",
                "searchable": true
            },
            {
                "targets": [8],
                "className": "contact-data",
                "searchable": true
            },
            {
                "targets": [9],
                "className": "contact-deal-link",
                "searchable": true
            }
        ],
        order: [[1, "asc"], [2, "asc"]],
        pageLength: 50,
        buttons: [
            {
                text: "<span class='glyphicon glyphicon-plus' aria-hidden='true'></span> Add contact",
                action: function (e, dt, node, config) {
                    // create new empty contact
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
                }
            },

            { extend: "remove", editor: editorContact, text: "<span class='glyphicon glyphicon-minus' aria-hidden='true'></span> Remove contact" },


            {
                extend: "excelHtml5",
                text: "<span class='glyphicon glyphicon-download' aria-hidden='true'></span> Excel",
                exportOptions: {
                    orthogonal: "export",
                    columns: [1, 2, 3, 4, 5, 6, 7, 8, 9]
                },
                filename: exportFileName, // exportFileName
            },

            {
                text: "<span class='glyphicon glyphicon-sort' aria-hidden='true'></span> Clear sort",
                action: function (e, dt, node, config) {

                    // remove all column searchs 
                    $('select').find('option:first').attr('selected', 'selected');
                    contactTable.search('');
                    contactTable.columns().every(function () {
                        var column = this;
                        column.search("");
                    });

                    // Clear column search-filters and refresh controls
                    $(":text").val(''); //text box
                    $('.filterSelect2').each(function (i, obj) {
                        for (let i = 0; i < this.options.length; i++) {
                            if (this.options[i].selected) { console.log(this.options[i].text); }
                            this.options[i].selected = false;
                        }
                    });
                    // refresh controls
                    $(".filterSelect2").trigger("change");

                    // init the order in datatable
                    contactTable.order([[1, 'asc'], [2, 'asc']]);
                    contactTable.draw();
                    storeTableState();

                    // send focus to search box.
                    $("#dataTables_scrollHeadInner :input[type='search']:first").focus();
                },
                className: 'dealsPageButtons'
            },
            {
                text: "<span class='glyphicon glyphicon-plane' aria-hidden='true'></span> Add to trip",
                action: function (e, dt, node, config) {
                    var data = contactTable.rows('.selected').data();
                    var selectedContacts = '';
                    // Check at least one contact is selected
                    if (data.length > 0) {
                        for (let i = 0; i < data.length; i++) {
                            selectedContacts = selectedContacts + data[i].ContactId + ',';
                        }
                        selectedContacts = selectedContacts.slice(0, -1);
                        $("#popTripId").val(data[0].TripId);
                        $("#popSelectedContacts").val(selectedContacts);

                        // open Trip assignment window
                        $quickEditDialog.dialog('open');
                    }
                    else {
                        alert("Please select at least one Contact from the list.")
                    }
                },
                className: 'dealsPageButtons'
            },
            {
                text: "<span class='glyphicon glyphicon-tags' aria-hidden='true'></span> Manage Subscriptions",
                action: function (e, dt, node, config) {
                    window.location.href = './subscriptions.html'
                },
                className: 'dealsPageButtons'
            }
        ],

        // Add filters by column
        initComplete: function () {
            var i = 0;
            this.api().columns().every(function () {
                i = i + 1;
                let hname = '#c' + i;
                let oname = 'ddfilter_' + i;
                let column = this;
                let select;
                switch (i) {
                    // Multi select : Company and Status
                    case 5:
                    case 6:
                    case 7:
                        select = $('<select multiple class="filterSelect2" id="' + oname + '" style="width:100%"></select>').appendTo($(hname).empty()).on('change', function () {
                            let val = $(this).val();
                            if (val) {
                                val = val.toString().replace(/,/g, '|');
                                column.search(val ? val : '', true, false).draw();
                            }
                            else
                                column.search('', false, true).draw();
                        });
                        select.append('<option value=""></option>')
                        column.data().unique().sort().each(function (d, j) {
                            select.append('<option value="' + d + '">' + d + '</option>')
                        });
                        break;
                    // Description
                    case 2:
                    case 3:
                    case 4:
                    case 8:
                    case 9:
                    case 10:
                        select = $('<input type="text" placeholder="" id="' + oname + '" style="width:100%">').appendTo($(hname).empty()).on('keyup', function () {
                            let val = $(this).val();
                            column.search(val, false, true).draw();
                        });
                        break;
                    // All other columns
                    default:
                        break;
                }
            });
            // restore previously-stored filters (table state)
            setDropDownFilterDefaults();
            $('.filterSelect2').select2();
        }




    });

    function getAnchorHtml(href, onclick, text) {
        let anchorHtml
        if (text)
            anchorHtml = `<a href="${href}" onclick="${onclick}">${text}</a>`;
        else
            anchorHtml = ``;

        return anchorHtml
    }

    // Quick edit dialog
    let $quickEditDialog = $('#quickEdit').dialog({
        autoOpen: false,
        width: 350,
        height: 350,
        modal: true,
        buttons: {
            "Assign Contacts": function () {
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


    $("#popTrips").chosen({ "allow_singe_deselect": true, "width": "95%" });

    // load active trips DropDown
    loadDropDown("#popTrips", "Title", "TripId", 0, `${parentURL}/trips/!/trips/category/1`, [{ text: 'Select trip ', value: '0' }]);


    // Links contacts and trips (via quick edit dialog)
    function quickUpdate() {
        // Get the input fields data
        let selectedContacts = $("#popSelectedContacts").val();
        let tripId = $("#popTrips").val();
        let data = { attendeeType: 2, attendeeIds: selectedContacts, allActivities: 0 };
        let url = `${parentURL}/contacts/!/trips/${tripId}/`

        $.ajax({
            url: url,
            username: credentials.user,
            password: credentials.password,
            type: 'post',
            dataType: 'json',
            data: data,
            success: function () {
                $quickEditDialog.dialog("close");
                displaySuccessMessage('Contacts were added to the selected Trip');
            },
            error: function (err) {
                $quickEditDialog.dialog("close");
                displayError('Error: Contacts were NOT added to the selected Trip, error code(' + err + ')');
            }
        });
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

    // extract sql friendly sort order definition
    function getSortOrder(val) {
        let r = '';
        for (let i = 0; i < val.length; i++) {
            r = r + (val[i][0] + 1) + ' ' + val[i][1] + ',';
        }
        r = r.slice(0, -1);
        return r;
    }

    // Replace all ocurrences in a string
    function replaceAll(thisString, search, replacement) {
        return thisString.split(search).join(replacement);
    };

    // trim, remove datatable regular expressions, prepare for SQL consumption
    function clearValues(val) {
        val = val.replace(/^\s+|\s+$/g, '');
        val = replaceAll(val, '^', '');
        val = replaceAll(val, '$', '');
        return val
    }

    function clearValues2(val) {
        //val = replaceAll(val, ' ', '');
        // val = " " + replaceAll(val, '|', '\',\'') + " ";
        val = " " + replaceAll(val, '|', ' , ') + " ";
        return val
    }

    // store datatable state in a cookie
    function bakeCookie(name, value) {
        let cookie = [name, '=', JSON.stringify(value)].join('');
        document.cookie = cookie;
    }

    // This function stores datatable state,
    function storeTableState() {
        let mtable = contactTable.state();
        let tableState = {};
        tableState.orderBy = getSortOrder(mtable.order);
        tableState.filter = {};
        tableState.filter.lastName = clearValues(mtable.columns[1].search.search);
        tableState.filter.firstName = clearValues(mtable.columns[2].search.search);
        tableState.filter.position = clearValues(mtable.columns[3].search.search);
        tableState.filter.company = clearValues2(mtable.columns[4].search.search);
        tableState.filter.companyType = clearValues2(mtable.columns[5].search.search);
        tableState.filter.city = clearValues2(mtable.columns[6].search.search);
        tableState.filter.email = clearValues(mtable.columns[7].search.search);
        tableState.filter.phone = clearValues(mtable.columns[8].search.search);
        tableState.filter.deal = clearValues(mtable.columns[9].search.search);
        bakeCookie('contacttablestate', tableState);
    }

    // when user leaves the page we should store table state (filters)
    window.onbeforeunload = pageExit;
    function pageExit() {
        storeTableState();
    }
});
