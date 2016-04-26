var express = require('express');
var http = require('http');
var os = require('os');

var salesData = require('./data');
var consul = require('./consul');

var app = express();
var customersHosts = [];

// Get the list of upstream hosts for the Customers service
// and cache them for the next call.
var getCustomersHosts = function(force, callback) {
  if (customersHosts.length != 0 && !force) {
    callback(customersHosts);
  } else {
    consul.getUpstreams("customers", function(hosts) {
      customerHosts = hosts;
      callback(hosts);
    });
  }
}

// The root route queries the Customers microservice for information about the
// customer associated with each sales rep, and then returns a JSON response
// with the merged data.
app.get('/', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  getCustomersHosts(false, function(hosts) {
    data = salesData.getData(function(data) {
      if (hosts.length == 0) {
        // if no upstreams are available we'll respond without
        // trying to query them.
        sendData(res, data,
                 "No data available.",
                 "No data available.");
      } else {
        getCustomerData(hosts, function(parsed) {
          sendData(res, data,
                   parsed[company]["location"],
                   parsed[company]["source"]
                  );
        });
      }
    });
  });
});

var getCustomerData = function(callback) {
  // in a real production application we'd want a more robust
  // load-balancing algo but this avoids managing state by
  // picking at random
  var host = customerHosts[Math.floor(Math.random() * customerHosts.length)];
  http.get({
    host: host["address"],
    port: host["port"],
    path: '/data'
  }, function(response) {
    var body = '';
    response.on('data', function(d) { body += d; });
    response.on('end', function() {
      var parsed = JSON.parse(body);
      callback(parsed);
    });
  });
}

var sendData = function(res, salesData, territory, source) {
  resp = []
  for (var rep in salesData) {
    resp.push({"rep": rep,
               "client": salesData[rep]["client"],
               "phone": salesData[rep]["phone"],
               "territory": territory,
               "source": source});
  }
  res.send(resp);
}

// The /data route just sends the data this microservice knows
// about without querying any other service.
app.get('/data', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  salesData.getData(function (data) { res.send(data) });
});

app.listen(3000, function () {
  console.log('Running Sales app on port 3000');
});

process.on('SIGHUP', function () {
  console.log('Received SIGHUP');
  getCustomersHosts(true, function(hosts) {
    if (hosts.length > 0) {
      msg = "Updated customers hosts: ";
      for (var i = 0; i < hosts.length; i++) {
        msg += " " + hosts[i]["address"] + ":" + hosts[i]["port"];
      }
      console.log(msg);
    }
  });
});
