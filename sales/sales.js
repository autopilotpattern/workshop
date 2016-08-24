'use strict';

const Http = require('http');
const Consulite = require('consulite');
const Express = require('express');
const SalesData = require('./lib/data');

const app = Express();


// The root route queries the Customers microservice for information about the
// customer associated with each sales rep, and then returns a JSON response
// with the merged data.
app.get('/', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  Consulite.getService('customers', (err, host) => {
    // Either a connection issue or no host was found
    if (err) {
      console.error(err);
    }

    SalesData.getData((data) => {
      if (!host) {
        // if no upstreams are available we'll respond without
        // trying to query them.
        return sendData(res, data,
                 'No data available.',
                 'No data available.');
      }

      getCustomerData(host, (customers) => {
        sendData(res, data, customers);
      });
    });
  });
});

const getCustomerData = function (host, callback) {
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
      territory: customer ? customer.location : 'Not Found',
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
  Consulite.refreshService('customers', function (err, hosts) {
    if (err) {
      console.error(err);
    }

    if (hosts && hosts.length) {
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
