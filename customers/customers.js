var express = require('express');
var http = require('http');
var os = require('os');

var app = express();
var upstreamHosts = [];

// the data contains the hostname so that we can see upstreams change
// in the demonstration app
var sourceName = "[customers:" + os.hostname() + "]";
var data = {
    "ACME Corporation": {"location": "Atlanta", "source": sourceName},
    "Vandelay Industries": {"location": "Boston", "source": sourceName},
    "Hooli": {"location": "Chicago", "source": sourceName},
    "Initech": {"location": "Denver", "source": sourceName}
};

// query Consul for the upstream services
var getUpstreams = function(force, callback) {
    if (upstreamHosts.length != 0 && !force) {
        callback(upstreamHosts);
    } else {
        http.get({
            host: 'consul',
            port: 8500,
            path: '/v1/catalog/service/sales'
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

// The root route queries the Sales microservice for information about the
// sales reps associated with each customer, and then returns a JSON response
// with the merged data.
app.get('/', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    getUpstreams(false, function(salesHosts) {
        if (salesHosts.length == 0) {
            // if no upstreams are available we'll respond without
            // trying to query them.
            resp = []
            for (var company in data) {
                resp.push({"company": company,
                           "location": data[company]["location"],
                           "rep": "No data available.",
                           "source": "No data available."});
            }
            res.send(resp);
        } else {
            // in a real production application we'd want a more robust
            // load-balancing algo but this avoids managing state
            var host = salesHosts[Math.floor(Math.random() * salesHosts.length)];
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
                    for (var rep in parsed) {
                        company = parsed[rep]["client"];
                        resp.push({"company": company,
                                   "location": data[company]["location"],
                                   "rep": rep,
                                   "source": parsed[rep]["source"]});
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

app.listen(4000, function () {
    console.log('Running Customers app on port 4000');
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
