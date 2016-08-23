'use strict';

const Express = require('express');
const Http = require('http');
const SalesData = require('./lib/data');
const Consul = require('./lib/consul');

const app = Express();
let customersHosts = [];

// Get the list of upstream hosts for the Customers service
// and cache them for the next call.
const getCustomersHosts = function (force, callback) {
  if (customersHosts.length && !force) {
    callback(customersHosts);
  } else {
    Consul.getUpstreams('customers', (hosts) => {
      customersHosts = hosts;
      callback(hosts);
    });
  }
}

// The root route queries the Customers microservice for information about the
// customer associated with each sales rep, and then returns a JSON response
// with the merged data.
app.get('/', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  getCustomersHosts(false, (hosts) => {
    SalesData.getData((data) => {
      if (!hosts.length) {
        // if no upstreams are available we'll respond without
        // trying to query them.
        sendData(res, data,
                 'No data available.',
                 'No data available.');
      } else {
        getCustomerData(hosts, (customers) => {
          sendData(res, data, customers);
        });
      }
    });
  });
});

const getCustomerData = function (customerHosts, callback) {
  // in a real production application we'd want a more robust
  // load-balancing algo but this avoids managing state by
  // picking at random
  const host = customerHosts[Math.floor(Math.random() * customerHosts.length)];
  Http.get({
    host: host.address,
    port: host.port,
    path: '/data'
  }, (response) => {
    let body = '';
    response.on('data', (data) => { body += data; });
    response.on('end', () => {
      callback(JSON.parse(body));
    });
  });
}

const sendData = function (res, salesData, customers) {
  const resp = Object.keys(salesData).map((rep) => {
    const salesPerson = salesData[rep];
    const customer = customers.find((customer) => {
      return customer.rep === rep;
    });

    return {
      rep: rep,
      client: salesPerson.client,
      phone: salesPerson.phone,
      territory: customer.location,
      source: salesPerson.source
    };
  });

  res.send(resp);
}

// The /data route just sends the data this microservice knows
// about without querying any other service.
app.get('/data', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  SalesData.getData((data) => { res.send(data) });
});

process.on('SIGHUP', function () {
  console.log('Received SIGHUP');
  getCustomersHosts(true, function(hosts) {
    if (hosts.length > 0) {
      let msg = 'Updated customers hosts: ';
      for (let i = 0; i < hosts.length; i++) {
        msg += ` ${hosts[i]['address']}:${hosts[i]['port']}`;
      }
      console.log(msg);
    }
  });
});

app.listen(3000, () => {
  console.log('Running Sales app on port 3000');
});
