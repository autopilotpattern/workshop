var exports = module.exports = {};
var os = require('os');
var consul = require('./consul');
var mysql = require('mysql');

var user = process.env.MYSQL_USER;
var password = process.env.MYSQL_PASSWORD;
var database = process.env.MYSQL_DB;

var poolCluster = null;

// the data contains the hostname so that we can see upstreams change
// in the demonstration app
var sourceName = "[sales:" + os.hostname() + "]";

var data = {
    "Alice": {"phone": "555-1234", "client": "ACME Corporation", "source": sourceName},
    "Bob": {"phone": "555-2341", "client": "Vandelay Industries", "source": sourceName},
    "Carol": {"phone": "555-3412", "client": "Hooli", "source": sourceName},
    "Dave": {"phone": "555-4123", "client": "Initech", "source": sourceName}
};

// -----------------------------------------------
// Set up the database connection pools

process.on('SIGHUP', function () {
  if (user && password && database) {
    poolCluster.end(function(err) {
      if (err) console.log(err);
      loadPool(function() { console.log('Reloaded MySQL configuration.');});
    });
  }
});

var loadPool = function(callback) {
  var thisCluster = mysql.createPoolCluster();
  consul.getUpstreams("mysql", function(hosts) {
    populatePoolCluster(thisCluster, hosts, "REPLICA");
    consul.getUpstreams("mysql-primary", function(hosts) {
      populatePoolCluster(thisCluster, hosts, "PRIMARY");
      poolCluster = thisCluster;
      callback();
    });
  });
}

var populatePoolCluster = function(cluster, hosts, nameStub) {
  console.log('Configuring ' + nameStub + ' pool with '+ hosts.length +' host(s)');
  for (var h = 0; h < hosts.length; h++) {
    config = {
      host: hosts[h].address,
      user: user,
      password: password,
      database: database,
    }
    name = nameStub + h;
    cluster.add(name, config);
  }
}

// -----------------------------------------------
// making queries against the databases

exports.getData = function(callback) {
  if (!poolCluster) {
    callback(data);
    return;
  } else {
    query("SELECT * FROM sales", [], "REPLICA*", function(err, results, fields) {
      if (err) {
        callback([]);
        return;
      }
      for (var i = 0; i < results.length; i++) {
        result = results[i];
        result.source = sourceName
      }
      callback(results);
    });
  }
}

var query = function(sql, params, serverGroup, callback) {
    // this round-robins over all instances marked for a group
    poolCluster.getConnection(serverGroup, function(err, connection) {
      if (err) {
        console.log("Could not connect to primary. "+ err);
        callback(true);
        return;
      }
      connection.query(sql, params, function(err, results, fields) {
        connection.release(); // always put connection back in pool after last query
        if (err) {
          console.log("Query failed. "+ err);
          callback(true);
          return;
        }
        callback(false, results);
      });
    });
}


// -----------------------------------------------
// Populate our initial database

// check to see if the table has been set up
var init = function() {
  if (user && password && database) {
    loadPool(function() {
      query("SELECT COUNT(*) FROM sales", [], "PRIMARY*",
            function (err) {
              if (err) loadInitialData();
            });
    });
  } else {
    console.log("No database credentials set. Assuming no MySQL backend.")
  }
}

var loadInitialData = function(callback) {
  console.log("Loading initial data.");
  query('CREATE TABLE sales (name VARCHAR(30), phone VARCHAR(30), client VARCHAR(30));',
        [], "PRIMARY*",
        function(err) {
          if (err) {
            console.log("Could not create sales table. "+ err);
            return
          }
          var initialInsert = 'INSERT INTO sales (name, phone, client) VALUES \
                              ("Alice", "555-1234", "ACME Corporation"), \
                              ("Bob",   "555-2341", "Vandelay Industries"), \
                              ("Carol", "555-3412", "Hooli"), \
                              ("Dave",  "555-4123", "Initech");'
          query(initialInsert, [], "PRIMARY*", function(err) {
            if (err) {
              console.log("Could not write initial data. "+ err + "\n" + sql);
            }
          });
        });
}

init();
