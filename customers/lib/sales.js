'use strict';

const Http = require('http');
const Data = require('./data');

exports.get = function (host, callback) {
  Http.get({
    host: host.address,
    port: host.port,
    path: '/data'
  }, (response) => {
    let body = '';
    response.on('data', (data) => { body += data; });
    response.on('end', () => {
      const parsed = JSON.parse(body);
      let result = [];
      for (const rep in parsed) {
        const company = parsed[rep]['client'];
        result.push({
          company: company,
          location: Data[company]['location'],
          rep: rep,
          source: parsed[rep]['source']
        });
      }

      callback(null, result);
    });
  });
};
