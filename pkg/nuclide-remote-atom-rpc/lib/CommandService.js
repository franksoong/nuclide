Object.defineProperty(exports, '__esModule', {
  value: true
});

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

exports.getAtomCommands = getAtomCommands;

var _CommandServer;

function _load_CommandServer() {
  return _CommandServer = require('./CommandServer');
}

// Called by the server side command line 'atom' command.

function getAtomCommands() {
  return Promise.resolve((_CommandServer || _load_CommandServer()).CommandServer.getAtomCommands());
}