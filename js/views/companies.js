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
// let's now use jquery to retrieve it.
let UserIsAdmin = ($("#userIsAdmin").text() === 'true');
let UserId = $("#loggedEmployeeId").text();

/* Date formatting functions */
let timezoneOffset = new Date().getTimezoneOffset() * 60000;

function getFormattedDate(inputDate) {
    // FullCalendar expects to receive the default date in YYYY-MM-DD format, let's get to it
    let dd = inputDate.getDate();
    let mm = inputDate.getMonth() + 1; // Remember, getMonth returns 0 to 11
    return [inputDate.getFullYear(),
    (mm > 9 ? "" : "0") + mm,
    (dd > 9 ? "" : "0") + dd].join("-");
}

function getFormattedDateMMMDDYY(inputDate) {
    let monthNames = ['Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Sep',
        'Oct',
        'Nov',
        'Dec'];
    let dd = inputDate.getDate();
    let mm = inputDate.getMonth(); // Remember, getMonth returns 0 to 11
    return monthNames[mm] +
        "  " +
        (dd > 9 ? "" : "0") + dd +
        ", " +
        inputDate.getFullYear();
}


// get a cookie value
function getCookieValue(a) {
    var b = document.cookie.match('(^|[^;]+)\\s*' + a + '\\s*=\\s*([^;]+)');
    return b ? b.pop() : '';
}

// Reset all datatable filters using data previously stored  
function setDropDownFilterDefaults() {
    const multiselect = true;
    let x = { name: '', businessTypeDescription: '', city: '', webSite: '', operated: '', competitorList: '' };
    let c = getCookieValue("companytablestate");
    if (c != '') { x = JSON.parse(c).filter };
    setDropDownValue('filter_2', x.name, multiselect);
    setDropDownValue('filter_6', x.businessTypeDescription, multiselect);
    setDropDownValue('filter_7', x.city, multiselect);
    setDropDownValue('filter_13', x.webSite, multiselect);
    setDropDownValue('filter_14', x.operated, multiselect);
    setDropDownValue('filter_21', x.competitorList, multiselect);
}




// set a default value for a given dropdown control
function setDropDownValue(dropDownName, selectedValue, multiselect) {
    if (multiselect) {
        if (selectedValue != "''" && selectedValue.trim() != "") {
            multiValues = selectedValue.replace(/\'/g, '').split(",");
            for (let i = 0; i < multiValues.length; i++) {
                let searchedValue = multiValues[i].trim();
                $(`#${dropDownName} option[value='${searchedValue}']`).prop('selected', 'selected');
            }
        }
    }
    else {
        $(`#${dropDownName} option[value='${selectedValue}']`).prop('selected', 'selected');
    };
}



// The ever conspicuous document ready function...
$(document).ready(function () {

    // Data tables: Companies

    $('#tblExternalCompanies').DataTable({
        dom: "Bfrtip",
        ajax: `${parentURL}/companies/!/details/0`,
        username: credentials.user,
        password: credentials.password,
        scrollX: false,
        pageLength: 50,
        order: [[1, "asc"]],
        bSortCellsTop: true,
        stateSave: false,
        deferRender: true,
        cache: true,
        columns: [

            /* 
            
                IF YOU CHANGE DATATABLE COLUMN LAYOUT MAKE SURE YOU DISABLE stateSave SO YOUR LAYOUT CHANGES ARE REFRESHED 
            
            */
            {
                data: "ExternalCompanyId",
                className: "never text-nowrap",
                visible: false,
                searchable: false
            },
            {
                data: "Name",
                className: "text-nowrap company-data",
                visible: true,
                searchable: true,
                render: function (data, type, row, meta) {
                    data = '<a href="./companydetails.html?companyId=' + row.ExternalCompanyId + '">' + data + '</a>';
                    return data;
                }
            },
            {
                data: "ParentCompanyId",
                className: "never text-nowrap",
                visible: false,
                searchable: false
            },
            {
                data: "ParentCompanyName",
                className: "text-nowrap",
                visible: false,
                searchable: false
            },
            {
                data: "BusinessTypeId",
                className: "text-nowrap",
                visible: false,
                searchable: false
            },
            {
                data: "BusinessTypeDescription",
                className: "text-nowrap company-data",
                visible: true,
                searchable: true
            },
            {
                data: "City",
                className: "text-nowrap company-data",
                visible: true,
                searchable: true
            },
            {
                data: "PhoneNumber",
                className: "text-nowrap",
                visible: false,
                searchable: false
            },
            {
                data: "LocationDetails",
                className: "text-nowrap",
                visible: false,
                searchable: false
            },
            {
                data: "Lat",
                className: "text-nowrap",
                visible: false,
                searchable: false
            },
            {
                data: "Long",
                className: "text-nowrap",
                visible: false,
                searchable: false
            },
            {
                data: "GooglePlaceId",
                className: "text-nowrap",
                visible: false,
                searchable: false
            },
            {
                data: "Website",
                className: "text-nowrap",
                visible: true,
                searchable: true,
                render: function (data, type, row, meta) {
                    let url = '';
                    if (data && data.length > 0) {
                        if (data.toLowerCase().indexOf("http") > -1)
                            url = '<a href="' + data + '" target="_blank">' + data.replace('http://', '').replace('https://', '') + '</a>';
                        else
                            url = '<a href="http://' + data + '" target="_blank">' + data + '</a>';
                    }
                    return url;
                }
            },
            {
                data: "OperatedDescription",
                className: "text-nowrap",
                visible: true,
                searchable: true
            },
            {
                data: "PlaceTypes",
                className: "text-nowrap",
                visible: false,
                searchable: false
            },
            {
                data: "Deals",
                className: "company-data",
                visible: true,
                searchable: true,
                render: function (data, type, row, meta) {
                    if (data != "") {
                        let dealArray = data.toString().replace(/ +/g, "").split(",");
                        let dealLinks = ""
                        dealArray.forEach(function (dealNumber) {
                            dealLinks = dealLinks +
                                '<a href="./dealdetails.html?dealNumber=' + dealNumber + '">' + dealNumber + '</a> ';
                        });
                        data = dealLinks;
                    }
                    return data;
                }
            },
            {
                data: "WhenCreated",
                className: "text-nowrap",
                visible: false,
                searchable: false
            },
            {
                data: "WhenCreated",
                className: "text-nowrap",
                visible: false,
                searchable: false
            },
            {
                data: "WhenChanged",
                className: "text-nowrap",
                visible: false,
                searchable: false
            },
            {
                data: "WhoChanged",
                className: "text-nowrap",
                visible: false,
                searchable: false
            },
            {
                data: "CompetitorList",
                className: "text-nowrap company-data",
                visible: true,
                searchable: true
            },

        ],
        buttons: [
            {
                "text": "New company",
                "action": function (e, dt, node, config) {
                    // Check if user is admin
                    if (UserIsAdmin) {
                        // Redirect to the company details page (to add a new company)
                        window.location.href = "./companydetails.html?companyId=new";
                    }
                    else {
                        alert("You don't have enough privileges to perform this action.")
                    }
                }
            },
            {
                "extend": "excelHtml5",
                "text": "Excel",
                "exportOptions": {
                    "orthogonal": "export",
                    "columns": [0, 1, 3, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
                },
                "filename": "ExternalCompanies.xls"
            },
            {
                "text": "Clear sort",
                "action": function (e, dt, node, config) {
                    let table = $('#tblExternalCompanies').DataTable();
                    // remove all column searchs 
                    $('select').find('option:first').attr('selected', 'selected');
                    table.search('');
                    table.columns().every(function () {
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

                    // init the filter
                    let oTable = $("#tblDeals").dataTable();
                    oTable.fnFilter("ACTIVE", 14, false, false);
                    table.order([1, 'asc'])
                    table.draw();
                    storeTableState();
                },
                "className": 'dealsPageButtons'
            }
        ],
        initComplete: function () {
            // Prepare the filters
            let i = 0;
            this.api().columns().every(function () {
                // Next column index
                i = i + 1;
                let hname = '#c' + i;
                let column = this;
                let select;
                // Identify which column gets to be filtered
                switch (i) {
                    case 2:
                    case 6:
                    case 7:
                    case 13:
                    case 14:
                    case 21:
                        select = $('<select multiple id="filter_' + i + '"  class="filterSelect2" style="width:100%"></select>').appendTo($(hname).empty()).on('change', function () {
                            // let val =  $(this).val();
                            let val = getDropDownSelectedValues(this.id);
                            if (val) {
                                //val = val.toString().replace(/,/g, '|'); <-- this doesn't work with companies containing commas.
                                column.search(val, true, false).draw();
                            }
                            else
                                column.search('', false, true).draw();
                        });
                        column.data().unique().sort().each(function (d, j) {
                            select.append('<option value="' + d + '">' + d + '</option>')
                        });
                        break;
                }
            });
            setDropDownFilterDefaults();
            $('.filterSelect2').select2();
        }
    });

    let companyTable = $('#tblExternalCompanies').DataTable();

    // User privilege handling
    function applyUserPrivileges(isAdmin) {

    }

    // return all selected item's texts separated by a pipe
    function getDropDownSelectedValues(controlName) {
        let str = '';
        $("#" + controlName + " option:selected").each(function () {
            str += $(this).text() + "|";
        });
        return (str.length > 0) ? str.slice(0, -1) : str;
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
        let mtable = $('#tblExternalCompanies').DataTable().state();
        let tableState = {};
        tableState.orderBy = getSortOrder(mtable.order);
        tableState.filter = {};
        tableState.filter.name = clearValues2(mtable.columns[1].search.search);
        tableState.filter.businessTypeDescription = clearValues2(mtable.columns[5].search.search);
        tableState.filter.city = clearValues2(mtable.columns[6].search.search);
        tableState.filter.webSite = clearValues2(mtable.columns[12].search.search);
        tableState.filter.operated = clearValues2(mtable.columns[13].search.search);
        tableState.filter.competitorList = clearValues2(mtable.columns[20].search.search);
        bakeCookie('companytablestate', tableState);
    }

    // when user leaves the page we should store table state (filters)
    window.onbeforeunload = pageExit;
    function pageExit() {
        storeTableState();
    }


});