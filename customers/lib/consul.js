'use strict';

const Http = require('http');

let upstreamHosts = [];


// query Consul for the upstream services
exports.getUpstreams = function (force, callback) {
  if (upstreamHosts.length && !force) {
    return callback(upstreamHosts);
  }

  Http.get({
    host: 'consul',
    port: 8500,
    path: '/v1/health/service/sales?passing'
  }, (response) => {
    let body = '';
    response.on('data', (data) => { body += data; });
    response.on('end', () => {
      const parsed = JSON.parse(body);
      upstreamHosts = parsed.map((host) => {
        return {
          address: host.Service.Address,
          port: host.Service.Port
        };
      });

      callback(upstreamHosts);
    });
  });
};
