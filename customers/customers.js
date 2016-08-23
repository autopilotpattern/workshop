'use strict';

const Http = require('http');
const Consul = require('./lib/consul');
const Data = require('./lib/data');
const Sales = require('./lib/sales');


const getRoot = function (req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  Consul.getUpstreams(false, (salesHosts) => {
    if (!salesHosts || !salesHosts.length) {
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

    const host = salesHosts[Math.floor(Math.random() * salesHosts.length)];
    Sales.get(host, (err, body) => {
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
  Consul.getUpstreams(true, (hosts) => {
    let msg = 'Updated upstreamHosts: ';
    for (var i = 0; i < hosts.length; i++) {
      msg += ` ${hosts[i]['address']}:${hosts[i]['port']}`;
    }
    console.log(msg);
  });
});

server.listen(4000, () => {
  console.log('Running Customers app on port 4000');
});
