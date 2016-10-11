Object.defineProperty(exports, '__esModule', {
  value: true
});

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

var _rxjsBundlesRxMinJs;

function _load_rxjsBundlesRxMinJs() {
  return _rxjsBundlesRxMinJs = require('rxjs/bundles/Rx.min.js');
}

var NUCLIDE_CONFIG_SCOPE = 'nuclide.';

function formatKeyPath(keyPath) {
  return '' + NUCLIDE_CONFIG_SCOPE + keyPath;
}

/*
 * Returns the value of a setting for a Nuclide feature key. Takes and returns the same types as
 * `atom.config.get` exception `keyPath` is not optional. To get the entire config object, use
 * `atom.config.get`.
 */
function get(keyPath, options) {
  var _atom$config;

  return (_atom$config = atom.config).get.apply(_atom$config, [formatKeyPath(keyPath)].concat(_toConsumableArray(Array.prototype.slice.call(arguments, 1))));
}

/*
 * Gets the schema of a setting for a Nuclide feature key. Takes and returns the same types as
 * `atom.config.getSchema`.
 */
function getSchema(keyPath) {
  return atom.config.getSchema(formatKeyPath(keyPath));
}

/*
 * Takes and returns the same types as `atom.config.observe` except `keyPath` is not optional.
 * To observe changes on the entire config, use `atom.config.observe`.
 */
function observe(keyPath, optionsOrCallback, callback) {
  var _atom$config2;

  return (_atom$config2 = atom.config).observe.apply(_atom$config2, [formatKeyPath(keyPath)].concat(_toConsumableArray(Array.prototype.slice.call(arguments, 1))));
}

/*
 * Behaves similarly to the `observe` function, but returns a stream of values, rather
 * then receiving a callback.
 */
function observeAsStream(keyPath) {
  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  return (_rxjsBundlesRxMinJs || _load_rxjsBundlesRxMinJs()).Observable.create(function (observer) {
    var disposable = observe(keyPath, options, observer.next.bind(observer));
    return disposable.dispose.bind(disposable);
  });
}

/*
 * Takes and returns the same types as `atom.config.onDidChange` except `keyPath` is not optional.
 * To listen to changes on all key paths, use `atom.config.onDidChange`.
 */
function onDidChange(keyPath, optionsOrCallback, callback) {
  var _atom$config3;

  return (_atom$config3 = atom.config).onDidChange.apply(_atom$config3, [formatKeyPath(keyPath)].concat(_toConsumableArray(Array.prototype.slice.call(arguments, 1))));
}

/*
 * Sets the value of a setting for a Nuclide feature key. Takes and returns the same types as
 * `atom.config.set`.
 */
function set(keyPath, value, options) {
  var _atom$config4;

  return (_atom$config4 = atom.config).set.apply(_atom$config4, [formatKeyPath(keyPath)].concat(_toConsumableArray(Array.prototype.slice.call(arguments, 1))));
}

/*
 * Sets the schema of a setting for a Nuclide feature key. Takes and returns the same types as
 * `atom.config.setSchema`.
 */
function setSchema(keyPath, schema) {
  var _atom$config5;

  return (_atom$config5 = atom.config).setSchema.apply(_atom$config5, [formatKeyPath(keyPath)].concat(_toConsumableArray(Array.prototype.slice.call(arguments, 1))));
}

/*
 * Restores a setting for a Nuclide feature key to its default value. Takes and returns the same
 * types as `atom.config.set`.
 */
function unset(keyPath, options) {
  var _atom$config6;

  return (_atom$config6 = atom.config).unset.apply(_atom$config6, [formatKeyPath(keyPath)].concat(_toConsumableArray(Array.prototype.slice.call(arguments, 1))));
}

/**
 * Returns `true` if the feature with the given name is disabled either directly or because the
 *   'nuclide' package itself is disabled.
 */
function isFeatureDisabled(name) {
  return atom.packages.isPackageDisabled('nuclide') || !atom.config.get('nuclide.use.' + name);
}

exports.default = {
  get: get,
  getSchema: getSchema,
  observe: observe,
  observeAsStream: observeAsStream,
  onDidChange: onDidChange,
  set: set,
  setSchema: setSchema,
  unset: unset,
  isFeatureDisabled: isFeatureDisabled
};
module.exports = exports.default;