var express = require('express');
var http = require('http');
var os = require('os');

var app = express();
var upstreamHosts = [];

// the data contains the hostname so that we can see upstreams change
// in the demonstration app
var sourceName = "[sales:" + os.hostname() + "]";
var data = {
    "Alice": {"phone": "555-1234", "client": "ACME Corporation", "source": sourceName},
    "Bob": {"phone": "555-2341", "client": "Vandelay Industries", "source": sourceName},
    "Carol": {"phone": "555-3412", "client": "Hooli", "source": sourceName},
    "Dave": {"phone": "555-4123", "client": "Initech", "source": sourceName}
};

// query Consul for the upstream services
var getUpstreams = function(force, callback) {
    if (upstreamHosts.length != 0 && !force) {
        callback(upstreamHosts);
    } else {
        http.get({
            host: 'consul',
            port: 8500,
            path: '/v1/catalog/service/customers'
        }, function(response) {
            var body = '';
            response.on('data', function(d) { body += d; });
            response.on('end', function() {
                var parsed = JSON.parse(body);
                hosts = []
                for (var i = 0; i < parsed.length; i++) {
                    hosts.push({address: parsed[i].ServiceAddress,
                                port: parsed[i].ServicePort});
                }
                upstreamHosts = hosts; // cache the result
                callback(hosts);
            });
        });
    }
}

// The root route queries the Customers microservice for information about the
// customer associated with each sales rep, and then returns a JSON response
// with the merged data.
app.get('/', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    getUpstreams(false, function(customerHosts) {
        if (customerHosts.length == 0) {
            // if no upstreams are available we'll respond without
            // trying to query them.
            resp = []
            for (var rep in data) {
                resp.push({"rep": rep,
                           "client": data[rep]["client"],
                           "phone": data[rep]["phone"],
                           "territory": "No data available.",
                           "source": "No data available."});
            }
            res.send(resp);
        } else {
            // in a real production application we'd want a more robust
            // load-balancing algo but this avoids managing state
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
                    resp = []
                    for (var rep in data) {
                        company = data[rep]["client"]
                        resp.push({"rep": rep,
                                   "client": company,
                                   "phone": data[rep]["phone"],
                                   "territory": parsed[company]["location"],
                                   "source": parsed[company]["source"]});
                    }
                    res.send(resp);
                });
            });
        }
    });
});

// The /data route just sends the data this microservice knows
// about without querying any other service.
app.get('/data', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send(data);
});

app.listen(3000, function () {
    console.log('Running Sales app on port 3000');
});

process.on('SIGHUP', function () {
    console.log('Received SIGHUP');
    getUpstreams(true, function(hosts) {
        msg = "Updated upstreamHosts: ";
        for (var i = 0; i < hosts.length; i++) {
            msg += " " + hosts[i]["address"] + ":" + hosts[i]["port"];
        }
        console.log(msg);
    });
});
