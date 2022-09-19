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

var subscriptionsTable;

// The ever conspicuous document ready function...
$(document).ready(function() {

    subscriptionsTable = $('#tblSubscriptions').DataTable({
        dom        : "Bfrtip",
        ajax       : parentURL + '/subscriptions/!/subscriptions/',
        select     : {style: 'single'},
        columns    : [
                        {data: "SubscriptionId"},
                        {data: "Description",
                         render: 
                                function(data, type, full){
                                let subId = full.SubscriptionId
                                return `<a href='./subscriptionDetails.html?subId=${subId}'>${data}</a>`;
                        }},
                        {data: "Subscribers"},
                        {data: "Status",
                         render: function(data, type, full) {
                                    return (data==1)?'Active':'Disabled'
                                 }
                        }
                    ],
        columnDefs: [
                        {"targets": [0],
                        "visible": false,
                        "searchable": false}
                    ],
        order:  [[1, "asc"]],
        pageLength: 50,
        buttons: [
                    { text   : "<span class='glyphicon glyphicon-plus' aria-hidden='true'></span> Add new subscription",  
                      action : function ( e, dt, node, config ) {
                                    // create new empty contact
                                    $.ajax({
                                        url         : parentURL + '/subscriptions/!/subscriptions/new',
                                        username: credentials.user,
                                        password: credentials.password,
                                        type        : 'post', 
                                        contentType : 'application/json',
                                        success     : function(resp) {
                                                        let subscriptionId = resp.data.SubscriptionId;
                                                        window.location.href = `./subscriptions.html?subId=${subscriptionId}/?new=yes`;
                                                    },
                                        error       : function(jqXHR, textStatus, errorThrown) {
                                                        alert('Unable to create a new empty subscription. (' + textStatus + ')');
                                                    }
                                    });
                                }
                    }
                ]
    });
});