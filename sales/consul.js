var exports = module.exports = {};
var http = require('http');

// query Consul for the upstream services
exports.getUpstreams = function(service, callback) {
  http.get({
    host: 'consul',
    port: 8500,
    path: '/v1/catalog/service/' + service
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
      callback(hosts);
    });
  });
}
