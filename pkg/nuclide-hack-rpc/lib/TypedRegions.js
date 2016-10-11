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

exports.convertCoverage = convertCoverage;
exports.convertTypedRegionsToCoverageResult = convertTypedRegionsToCoverageResult;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _assert;

function _load_assert() {
  return _assert = _interopRequireDefault(require('assert'));
}

var _simpleTextBuffer;

function _load_simpleTextBuffer() {
  return _simpleTextBuffer = require('simple-text-buffer');
}

// A region of untyped code.
// Currently may not span multiple lines. Consider enabling multi-line regions.
//
// start/end are column indices.
// Line/start/end are 1 based.
// end is inclusive.

var UNCHECKED_MESSAGE = 'Un-type checked code. Consider adding type annotations.';
var PARTIAL_MESSAGE = 'Partially type checked code. Consider adding type annotations.';

function convertCoverage(filePath, regions) {
  if (regions == null) {
    return null;
  }
  var hackCoverageResult = convertTypedRegionsToCoverageResult(regions);
  var uncoveredRegions = hackCoverageResult.uncoveredRegions.map(function (region) {
    return convertHackRegionToCoverageRegion(filePath, region);
  });
  return {
    percentage: hackCoverageResult.percentage,
    uncoveredRegions: uncoveredRegions
  };
}

function convertHackRegionToCoverageRegion(filePath, region) {
  var line = region.line - 1;
  return {
    range: new (_simpleTextBuffer || _load_simpleTextBuffer()).Range([line, region.start - 1], [line, region.end]),
    message: region.type === 'partial' ? PARTIAL_MESSAGE : UNCHECKED_MESSAGE
  };
}

function convertTypedRegionsToCoverageResult(regions) {
  var startColumn = 1;
  var line = 1;
  var column = startColumn;
  var unfilteredResults = [];
  regions.forEach(function (region) {
    var type = region.color;

    function addMessage(width) {
      if (width > 0) {
        var _last = unfilteredResults[unfilteredResults.length - 1];
        var endColumn = column + width - 1;
        // Often we'll get contiguous blocks of errors on the same line.
        if (_last != null && _last.type === type && _last.line === line && _last.end === column - 1) {
          // So we just merge them into 1 block.
          _last.end = endColumn;
        } else {
          unfilteredResults.push({
            type: type,
            line: line,
            start: column,
            end: endColumn
          });
        }
      }
    }

    var strings = region.text.split('\n');
    (0, (_assert || _load_assert()).default)(strings.length > 0);

    // Add message for each line ending in a new line.
    var lines = strings.slice(0, -1);
    lines.forEach(function (text) {
      addMessage(text.length);
      line += 1;
      column = startColumn;
    });

    // Add message for the last string which does not end in a new line.
    var last = strings[strings.length - 1];
    addMessage(last.length);
    column += last.length;
  });

  var totalInterestingRegionCount = unfilteredResults.reduce(function (count, region) {
    return region.type !== 'default' ? count + 1 : count;
  }, 0);
  var checkedRegionCount = unfilteredResults.reduce(function (count, region) {
    return region.type === 'checked' ? count + 1 : count;
  }, 0);
  var partialRegionCount = unfilteredResults.reduce(function (count, region) {
    return region.type === 'partial' ? count + 1 : count;
  }, 0);

  return {
    percentage: totalInterestingRegionCount === 0 ? 100 : (checkedRegionCount + partialRegionCount / 2) / totalInterestingRegionCount * 100,
    uncoveredRegions: filterResults(unfilteredResults)
  };
}

function filterResults(unfilteredResults) {
  // Flow doesn't understand filter so we cast.
  return unfilteredResults.filter(function (region) {
    return region.type === 'unchecked' || region.type === 'partial';
  });
}