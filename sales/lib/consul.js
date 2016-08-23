'use strict';

const Http = require('http');

// query Consul for the upstream services
exports.getUpstreams = function (service, callback) {
  Http.get({
    host: 'consul',
    port: 8500,
    path: `/v1/health/service/${service}?passing`
  }, (response) => {
    let body = '';
    response.on('data', (data) => { body += data; });
    response.on('end', () => {
      const parsed = JSON.parse(body);
      const hosts = parsed.map((host) => {
        return {
          address: host.Service.Address,
          port: host.Service.Port
        };
      });

      callback(hosts);
    });
  });
}
