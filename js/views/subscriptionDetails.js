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

var contactTable;
var subscriptionId;

// The ever conspicuous document ready function...
$(document).ready(function() {

    const iconCheck = '<i class="fa fa-check" aria-hidden="true"></i>';
    const iconBan = '<i class="fa fa-ban" aria-hidden="true"></i>';

    // Retrieve URL parameters
    let URLParamList = window.location.search.substring(1).split("&");
    let URLParamSet = URLParamList[0].split("=");
    subscriptionId = URLParamSet[1];
    $("#subscriptionId").val(subscriptionId);    

    // load form
    $.ajax({
        url      : parentURL + `/subscriptions/!/subscriptions/${subscriptionId}`,
        username: credentials.user,
        password: credentials.password,
        type     : 'get',
        dataType : 'json',
        success  : function(response) {
                        $("#description").val(response.data[0].Description);
                        $('#status').prop('checked', (response.data[0].Status == 1));
                        $("#description").focus();
                        fileName = 'subscription - ' + response.data[0].Description;
                    },
        error    : function(jqXHR, exception) {
                        displayError('Unable to load this record.');
                    }
    });


    // define Contact Table
    contactTable = $('#tblContacts').DataTable({
        dom        : "Bfrtip",
        ajax       : parentURL + `/subscriptions/!/subscriptions/${subscriptionId}/contacts`,
        scrollX    : true,
        stateSave  : true,
        pageLength : 50, 
        deferRender: true,
        select     : {style: 'os'},
        columns    : [
                     {data:       "ContactId"},
                     {data:      "Subscribed",
                      render   : function(data, type, full){
                                    if(type == 'display') {
                                        let icon = '';
                                        if (data == 1)
                                            icon = iconCheck
                                        else
                                            icon = iconBan;
                                        return icon
                                    } else
                                        return data

                                }},

                    {data:      "LastName",
                    className : "contact-data"},

                    {data:      "FirstName",
                    className:  "contact-data"},

                    {data:      "Position",
                    className:  "contact-data"},

                    {data:      "Company",
                    className : "contact-company"},

                    {data:      "City",
                    className : "contact-data"},

                    {data:      "PrimaryEmail",
                    className : "contact-data"},

                    {data:      "PrimaryPhone",
                    className : "contact-data"},

                    {data:      "Deals",
                    className : "datatable-centered-text contact-deal-link"}

                ],
        columnDefs: [
                        {"targets": [0],
                        "visible": false,
                        "searchable": false
                        },
                        {"targets"   : [1], 
                         "className" : 'dt-body-center'
                        }
                    ],
        order:  [[2, "asc"],[3, "asc"]],
        buttons: [
                    {
                        extend: "excelHtml5",
                        text: "<span class='glyphicon glyphicon-download' aria-hidden='true'></span> Excel",
                        exportOptions: {
                            orthogonal: "export",
                            columns: [2, 3, 4, 5, 6, 7, 8, 9]
                        },
                        filename: 'Subscription', 
                    }, 
                    { text: "<span class='glyphicon glyphicon-plus'       aria-hidden='true'></span> Subscribe selected",  action: 
                    function ( e, dt, node, config ) {
                        let contacts = '';

                        for (let i = 0; i < dt.rows({ selected: true }).data().length; i++) {
                            contacts = contacts + dt.rows({ selected: true }).data()[i].ContactId + ','
                        }
                        $.ajax({
                            url: parentURL + `/subscriptions/!/subscriptions/${subscriptionId}/contacts/${contacts}`,
                            username: credentials.user,
                            password: credentials.password,
                            type: 'post',
                            dataType: 'json',
                            success: function(response) {
                                contactTable.ajax.reload(null, false);
                            }
                        });

                        
                    }},
                    { text: "<span class='glyphicon glyphicon-minus' aria-hidden='true'></span> Unsubscribe selected",  action: 
                    function ( e, dt, node, config ) {
                        let contacts = '';

                        for (let i = 0; i < dt.rows({ selected: true }).data().length; i++) {
                            contacts = contacts + dt.rows({ selected: true }).data()[i].ContactId + ','
                        }
                        $.ajax({
                            url: parentURL + `/subscriptions/!/subscriptions/${subscriptionId}/contacts/${contacts}`,
                            username: credentials.user,
                            password: credentials.password,
                            type: 'delete',
                            dataType: 'json',
                            success: function(response) {
                                contactTable.ajax.reload(null, false);
                            }
                        });                                            
                    }},
                    { text: "<span class='glyphicon glyphicon-ok-circle'  aria-hidden='true'></span> Select all",   action: function ( e, dt, node, config ) {contactTable.rows({ search: 'applied'}).select();}},
                    { text: "<span class='glyphicon glyphicon-ok-circle'  aria-hidden='true'></span> Select all on this page",  action: function ( e, dt, node, config ) {contactTable.rows({ page: 'current' }).select();}},
                    { text: "<span class='glyphicon glyphicon-ban-circle' aria-hidden='true'></span> Select none",  action: function ( e, dt, node, config ) {contactTable.rows().deselect({ search: 'applied'});}},
                    { text: "<span class='glyphicon glyphicon-ban-circle' aria-hidden='true'></span> Select none from this page",  action: function ( e, dt, node, config ) {contactTable.rows({ page: 'current' }).deselect();}},
                ]
    });


    /* 
    
    Attach events 
    
    */

    // submit
    $("#btnSubmit").click(function() {
        let description = $("#description").val();
        let status = ($("#status").is(":checked"))?1:2;
        let data = {description:description, status:status};
        $.ajax({
            url      : parentURL + `/subscriptions/!/subscriptions/${subscriptionId}`,
            username: credentials.user,
            password: credentials.password,
            type     : 'put',
            dataType : 'json',
            data     : data,
            success  : function() {
                            displaySuccessMessage('Subscription was updated successfully');
                        }
        });
    });

    // cancel
    $("#btnCancel").click(function() {
        window.location.href = './subscriptions.html';
    });

    // we are adding a search logic that works with dropdown "DisplayOption"
    $.fn.dataTable.ext.search.push(
        function(settings, data, dataIndex) {  
            return (($('#displayOption').val()==2)? true : (data[1] == $('#displayOption').val()));
    });

    // change display dropdown
    $('#displayOption').on('change',function(){
        contactTable.draw()            
    });

    // format Search and Display Dropdown boxes
    $('input[type="search"]').addClass("text ui-widget-content ui-corner-all");
    $('#displayOption').width($('input[type="search"]').width());

    // Display temporary panel with error message
    function displayError(errorMessage){
        $("#errorMessage").text(errorMessage);        
        $("#errorPanel").show('fade');
        setTimeout(function() {
            $( "#errorPanel" ).hide('fade');
          }, 5000 );

    };

    // Display temporary panel with success message
    function displaySuccessMessage(successMessage) {
        $("#successMessage").text(successMessage);        
        $("#successPanel").show('fade');
        setTimeout(function() {
            $( "#successPanel" ).hide('fade')
          }, 1000 );
    };
});
