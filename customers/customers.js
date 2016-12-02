'use strict';

const Http = require('http');
const Piloted = require('piloted');
const ContainerPilot = require(process.env.CONTAINERPILOT.replace('file://', ''));
const Data = require('./lib/data');
const Sales = require('./lib/sales');


const getRoot = function (req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });

  const service = Piloted('sales');
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

Piloted.config(ContainerPilot, (err) => {
  if (err) {
    console.error(err);
  }

  server.listen(4000, () => {
    console.log('Running Customers app on port 4000');
  });
});
