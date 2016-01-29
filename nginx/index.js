// provide empty data when upstream services are not available
var dummy = [{
    company: "Data not available",
    rep: "Data not available",
    client: "N/A",
    territory: "N/A",
    phone: "N/A",
    location: "N/A",
    source: "N/A"
}];

var fillCustomerTable = function(rows) {
    var html = "";
    for (var i = 0; i < rows.length; i++) {
        html+="<tr>";
        html+="<td>"+rows[i].company+"</td>";
        html+="<td>"+rows[i].location+"</td>";
        html+="<td>"+rows[i].rep+"</td>";
        html+="<td>"+rows[i].source+"</td>";

        html+="</tr>";
    }
    document.getElementById("customerTable").innerHTML = html;
}

var fillSalesTable = function(rows) {
    var html = "";
    for (var i = 0; i < rows.length; i++) {
        html+="<tr>";
        html+="<td>"+rows[i].rep+"</td>";
        html+="<td>"+rows[i].client+"</td>";
        html+="<td>"+rows[i].phone+"</td>";
        html+="<td>"+rows[i].territory+"</td>";
        html+="<td>"+rows[i].source+"</td>";
        html+="</tr>";
    }
    document.getElementById("salesRepTable").innerHTML = html;
}


var fillTable = function(fillTableFn, url) {
    var req = new XMLHttpRequest();
    req.onreadystatechange = function() {
        if (req.readyState == XMLHttpRequest.DONE) {
            var rows = dummy;
            if (req.status === 200) {
                rows = JSON.parse(req.responseText);
            }
            fillTableFn(rows);
        }
    }
    req.open('GET', url, true);
    req.send(null);
}

window.onload = function() {
    fillTable(fillCustomerTable, "customers/");
    fillTable(fillSalesTable, "sales/");
};
