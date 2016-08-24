'use strict';

const Http = require('http');
const Consulite = require('consulite');
const Data = require('./lib/data');
const Sales = require('./lib/sales');


const getRoot = function (req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  Consulite.getService('sales', (err, service) => {
    if (err) {
      console.error(err);
    }

    if (!service) {
      const body = [];
      for (let company in Data) {
        body.push({
          company: company,
          location: Data[company]['location'],
          rep: 'No data available.',
          source: 'No data available.'
        });
      }

      return res.end(JSON.stringify(body));
    }

    Sales.get(service, (err, body) => {
      return res.end(JSON.stringify(body));
    });
  });
};

// The /data route just sends the data this microservice knows
// about without querying any other service.
const getData = function (req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(Data));
};


const server = Http.createServer((req, res) => {
  if (req.path === '/data') {
    return getData(req, res);
  }

  return getRoot(req, res);
});


process.on('SIGHUP', () => {
  console.log('Received SIGHUP');
  Consulite.refreshService('sales', (err, hosts) => {
    if (err) {
      return console.error(err);
    }

    let msg = 'Updated upstreamHosts: ' + hosts.map((host) => {
      return `${host.address}:${host.port}`;
    }).join('\n');
    console.log(msg);
  });
});

server.listen(4000, () => {
  console.log('Running Customers app on port 4000');
});
