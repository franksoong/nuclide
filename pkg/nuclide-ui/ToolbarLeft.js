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

var _reactForAtom;

function _load_reactForAtom() {
  return _reactForAtom = require('react-for-atom');
}

var ToolbarLeft = function ToolbarLeft(props) {
  return (_reactForAtom || _load_reactForAtom()).React.createElement(
    'div',
    { className: 'nuclide-ui-toolbar__left' },
    props.children
  );
};
exports.ToolbarLeft = ToolbarLeft;