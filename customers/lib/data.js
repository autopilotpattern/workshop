'use strict';

const Os = require('os');

const sourceName = `[customers:${Os.hostname()})]`;

module.exports = {
  'ACME Corporation': {
    location: 'Atlanta',
    source: sourceName
  },
  'Vandelay Industries': {
    location: 'Boston',
    source: sourceName
  },
  'Hooli': {
    location: 'Chicago',
    source: sourceName
  },
  'Initech': {
    location: 'Denver',
    source: sourceName
  }
};
