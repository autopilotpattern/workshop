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
      callback(null, JSON.parse(body));
    });
  });
};
