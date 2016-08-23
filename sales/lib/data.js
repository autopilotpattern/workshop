'use strict';


const Os = require('os');
const Consul = require('./consul');
const MySql = require('mysql');

const user = process.env.MYSQL_USER;
const password = process.env.MYSQL_PASSWORD;
const database = process.env.MYSQL_DB;

let poolCluster = null;

// the data contains the hostname so that we can see upstreams change
// in the demonstration app
const sourceName = `[sales:${Os.hostname()}]`;

const data = {
    Alice: {
      phone: '555-1234',
      client: 'ACME Corporation',
      source: sourceName
    },
    Bob: {
      phone: '555-2341',
      client: 'Vandelay Industries',
      source: sourceName
    },
    Carol: {
      phone: '555-3412',
      client: 'Hooli',
      source: sourceName
    },
    Dave: {
      phone: '555-4123',
      client: 'Initech',
      source: sourceName
    }
};

// -----------------------------------------------
// Set up the database connection pools

process.on('SIGHUP', function () {
  if (user && password && database) {
    poolCluster.end((err) => {
      if (err) {
        console.error(err);
      }

      loadPool(() => { console.log('Reloaded MySQL configuration.');});
    });
  }
});

const loadPool = function (callback) {
  const thisCluster = MySql.createPoolCluster();
  Consul.getUpstreams('mysql', (hosts) => {
    populatePoolCluster(thisCluster, hosts, 'REPLICA');
    Consul.getUpstreams('mysql-primary', (hosts) => {
      populatePoolCluster(thisCluster, hosts, 'PRIMARY');
      poolCluster = thisCluster;
      callback();
    });
  });
};

const populatePoolCluster = function (cluster, hosts, nameStub) {
  console.log(`Configuring ${nameStub} pool with ${hosts.length} host(s)`);
  for (let i = 0; i < hosts.length; i++) {
    const config = {
      host: hosts[i].address,
      user: user,
      password: password,
      database: database,
    }
    const name = nameStub + i;

    cluster.add(name, config);
  }
};

// -----------------------------------------------
// making queries against the databases

exports.getData = function (callback) {
  if (!poolCluster) {
    return callback(data);
  }

  query('SELECT * FROM sales', [], 'REPLICA*', (err, results, fields) => {
    if (err) {
      return callback([]);
    }
    for (var i = 0; i < results.length; i++) {
      result = results[i];
      result.source = sourceName
    }

    callback(results);
  });
};

const query = function (sql, params, serverGroup, callback) {
  // this round-robins over all instances marked for a group
  poolCluster.getConnection(serverGroup, (err, connection) => {
    if (err) {
      console.error(`Could not connect to primary. ${err}`);
      return callback(true);
    }
    connection.query(sql, params, (err, results, fields) => {
      connection.release(); // always put connection back in pool after last query
      if (err) {
        console.error(`Query failed. ${err}`);
        return callback(true);
      }

      callback(false, results);
    });
  });
}


// -----------------------------------------------
// Populate our initial database

// check to see if the table has been set up
const init = function () {
  if (user && password && database) {
    loadPool(() => {
      query('SELECT COUNT(*) FROM sales', [], 'PRIMARY*', (err) => {
        if (err) {
          loadInitialData();
        }
      });
    });
  } else {
    console.log('No database credentials set. Assuming no MySQL backend.')
  }
}

const loadInitialData = function (callback) {
  console.log('Loading initial data.');
  query('CREATE TABLE sales (name VARCHAR(30), phone VARCHAR(30), client VARCHAR(30));', [], 'PRIMARY*', (err) => {
    if (err) {
      console.error(`Could not create sales table. ${err}`);
      return;
    }

    const initialInsert = `INSERT INTO sales (name, phone, client) VALUES
                        ('Alice', '555-1234', 'ACME Corporation'),
                        ('Bob',   '555-2341', 'Vandelay Industries'),
                        ('Carol', '555-3412', 'Hooli'),
                        ('Dave',  '555-4123', 'Initech');`;
    query(initialInsert, [], 'PRIMARY*', (err) => {
      if (err) {
        console.error(`Could not write initial data. ${err}\n${sql}`);
      }
    });
  });
}

init();
