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

exports.default = repositoryContainsPath;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _atom;

function _load_atom() {
  return _atom = require('atom');
}

var _commonsNodeNuclideUri;

function _load_commonsNodeNuclideUri() {
  return _commonsNodeNuclideUri = _interopRequireDefault(require('../../commons-node/nuclideUri'));
}

/**
 * @param repository Either a GitRepository or HgRepositoryClient.
 * @param filePath The absolute file path of interest.
 * @return boolean Whether the file path exists within the working directory
 *   (aka root directory) of the repository, or is the working directory.
 */

function repositoryContainsPath(repository, filePath) {
  var workingDirectoryPath = repository.getWorkingDirectory();
  if (pathsAreEqual(workingDirectoryPath, filePath)) {
    return true;
  }

  if (repository.getType() === 'git') {
    var rootGitProjectDirectory = new (_atom || _load_atom()).Directory(workingDirectoryPath);
    return rootGitProjectDirectory.contains(filePath);
  } else if (repository.getType() === 'hg') {
    var hgRepository = repository;
    return hgRepository._workingDirectory.contains(filePath);
  }
  throw new Error('repositoryContainsPath: Received an unrecognized repository type. Expected git or hg.');
}

/**
 * @param filePath1 An abolute file path.
 * @param filePath2 An absolute file path.
 * @return Whether the file paths are equal, accounting for trailing slashes.
 */
function pathsAreEqual(filePath1, filePath2) {
  var realPath1 = (_commonsNodeNuclideUri || _load_commonsNodeNuclideUri()).default.resolve(filePath1);
  var realPath2 = (_commonsNodeNuclideUri || _load_commonsNodeNuclideUri()).default.resolve(filePath2);
  return realPath1 === realPath2;
}
module.exports = exports.default;