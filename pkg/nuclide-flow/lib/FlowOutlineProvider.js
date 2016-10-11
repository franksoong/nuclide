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

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { var callNext = step.bind(null, 'next'); var callThrow = step.bind(null, 'throw'); function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(callNext, callThrow); } } callNext(); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _atom;

function _load_atom() {
  return _atom = require('atom');
}

var _assert;

function _load_assert() {
  return _assert = _interopRequireDefault(require('assert'));
}

var _FlowServiceFactory;

function _load_FlowServiceFactory() {
  return _FlowServiceFactory = require('./FlowServiceFactory');
}

var FlowOutlineProvider = (function () {
  function FlowOutlineProvider() {
    _classCallCheck(this, FlowOutlineProvider);
  }

  _createClass(FlowOutlineProvider, [{
    key: 'getOutline',
    value: _asyncToGenerator(function* (editor) {
      var filePath = editor.getPath();
      var flowService = undefined;
      if (filePath != null) {
        flowService = (0, (_FlowServiceFactory || _load_FlowServiceFactory()).getFlowServiceByNuclideUri)(filePath);
      } else {
        flowService = (0, (_FlowServiceFactory || _load_FlowServiceFactory()).getLocalFlowService)();
      }
      (0, (_assert || _load_assert()).default)(flowService != null);
      var flowOutline = yield flowService.flowGetOutline(filePath, editor.getText());
      if (flowOutline != null) {
        return flowOutlineToNormalOutline(flowOutline);
      } else {
        return null;
      }
    })
  }]);

  return FlowOutlineProvider;
})();

exports.FlowOutlineProvider = FlowOutlineProvider;

function flowOutlineToNormalOutline(flowOutline) {
  return {
    outlineTrees: flowOutline.map(flowTreeToNormalTree)
  };
}

function flowTreeToNormalTree(flowTree) {
  return {
    tokenizedText: flowTree.tokenizedText,
    representativeName: flowTree.representativeName,
    startPosition: new (_atom || _load_atom()).Point(flowTree.startPosition.line, flowTree.startPosition.column),
    endPosition: new (_atom || _load_atom()).Point(flowTree.endPosition.line, flowTree.endPosition.column),
    children: flowTree.children.map(flowTreeToNormalTree)
  };
}