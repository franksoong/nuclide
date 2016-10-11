Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

var _atom;

function _load_atom() {
  return _atom = require('atom');
}

var _commonsNodeDebounce;

function _load_commonsNodeDebounce() {
  return _commonsNodeDebounce = _interopRequireDefault(require('../../commons-node/debounce'));
}

var _commonsNodeString;

function _load_commonsNodeString() {
  return _commonsNodeString = require('../../commons-node/string');
}

var _nuclideAnalytics;

function _load_nuclideAnalytics() {
  return _nuclideAnalytics = require('../../nuclide-analytics');
}

var _nuclideLogging;

function _load_nuclideLogging() {
  return _nuclideLogging = require('../../nuclide-logging');
}

var VALID_NUX_POSITIONS = new Set(['top', 'bottom', 'left', 'right', 'auto']);
// The maximum number of times the NuxView will attempt to attach to the DOM.
var ATTACHMENT_ATTEMPT_THRESHOLD = 5;
var ATTACHMENT_RETRY_TIMEOUT = 500; // milliseconds
var RESIZE_EVENT_DEBOUNCE_DURATION = 100; // milliseconds
// The frequency with which to poll the element that the NUX is bound to.
var POLL_ELEMENT_TIMEOUT = 100; // milliseconds

var logger = (0, (_nuclideLogging || _load_nuclideLogging()).getLogger)();

function validatePlacement(position) {
  return VALID_NUX_POSITIONS.has(position);
}

var NuxView = (function () {

  /**
   * Constructor for the NuxView.
   *
   * @param {number} tourId - The ID of the associated NuxTour
   * @param {?string} selectorString - The query selector to use to find an element
    on the DOM to attach to. If null, will use `selectorFunction` instead.
   * @param {?Function} selectorFunction - The function to execute to query an item
    on the DOM to attach to. If this is null, will use `selectorString` inside
    a call to `document.querySelector`.
   * @param {string} position - The position relative to the DOM element that the
    NUX should show.
   * @param {string} content - The content to show in the NUX.
   * @param {?(() => boolean)} completePredicate - Will be used when determining whether
   * the NUX has been completed/viewed. The NUX will only be completed if this returns true.
   * If null, the predicate used will always return true.
   * @param {number} indexInTour - The index of the NuxView in the associated NuxTour
   * @param {number} tourSize - The number of NuxViews in the associated tour
   *
   * @throws Errors if both `selectorString` and `selectorFunction` are null.
   */

  function NuxView(tourId, selectorString, selectorFunction, position, content, completePredicate, indexInTour, tourSize) {
    if (completePredicate === undefined) completePredicate = null;

    _classCallCheck(this, NuxView);

    this._tourId = tourId;
    if (selectorFunction != null) {
      this._selector = selectorFunction;
    } else if (selectorString != null) {
      this._selector = function () {
        return document.querySelector(selectorString);
      };
    } else {
      throw new Error('Either the selector or selectorFunction must be non-null!');
    }
    this._content = content;
    this._position = validatePlacement(position) ? position : 'auto';
    this._completePredicate = completePredicate;
    this._index = indexInTour;
    this._finalNuxInTour = indexInTour === tourSize - 1;

    this._disposables = new (_atom || _load_atom()).CompositeDisposable();
  }

  _createClass(NuxView, [{
    key: '_createNux',
    value: function _createNux() {
      var _this = this;

      var creationAttempt = arguments.length <= 0 || arguments[0] === undefined ? 1 : arguments[0];

      if (creationAttempt > ATTACHMENT_ATTEMPT_THRESHOLD) {
        this._onNuxComplete(false);
        // An error is logged and tracked instead of simply throwing an error since this function
        // will execute outside of the parent scope's execution and cannot be caught.
        var error = 'NuxView #' + this._index + ' for NUX#"' + this._tourId + '" ' + 'failed to succesfully attach to the DOM.';
        logger.error('ERROR: ' + error);
        this._track(error, error);
        return;
      }
      var elem = this._selector();
      if (elem == null) {
        var _ret = (function () {
          var attachmentTimeout = setTimeout(_this._createNux.bind(_this, creationAttempt + 1), ATTACHMENT_RETRY_TIMEOUT);
          _this._disposables.add(new (_atom || _load_atom()).Disposable(function () {
            if (attachmentTimeout !== null) {
              clearTimeout(attachmentTimeout);
            }
          }));
          return {
            v: undefined
          };
        })();

        if (typeof _ret === 'object') return _ret.v;
      }

      // A reference to the element we decorate with classes and listeners is retained
      // for easy cleanup when the NUX is destroyed.
      this._modifiedElem = elem;

      this._tooltipDiv = document.createElement('div');
      this._tooltipDiv.className = 'nuclide-nux-tooltip-helper';
      this._modifiedElem.classList.add('nuclide-nux-tooltip-helper-parent');
      this._modifiedElem.appendChild(this._tooltipDiv);

      this._createDisposableTooltip();

      var debouncedWindowResizeListener = (0, (_commonsNodeDebounce || _load_commonsNodeDebounce()).default)(this._handleWindowResize.bind(this), RESIZE_EVENT_DEBOUNCE_DURATION, false);
      window.addEventListener('resize', debouncedWindowResizeListener);

      // Destroy the NUX if the element it is bound to is no longer visible.
      var tryDismissTooltip = function tryDismissTooltip(element) {
        // ヽ༼ຈل͜ຈ༽/ Yay for documentation! ᕕ( ᐛ )ᕗ
        // According to https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/offsetParent,
        // `offsetParent` returns `null` if the parent or element is hidden.
        // However, it also returns null if the `position` CSS of the element is
        // `fixed`. This case requires a much slower operation `getComputedStyle`,
        // so try and avoid it if possible.
        var isHidden = undefined;
        if (element.style.position !== 'fixed') {
          isHidden = element.offsetParent === null;
        } else {
          isHidden = window.getComputedStyle(element).display === 'none';
        }
        if (isHidden) {
          // Consider the NUX to be dismissed and mark it as completed.
          _this._handleDisposableClick(false);
        }
      };
      // The element is polled every `POLL_ELEMENT_TIMEOUT` milliseconds instead
      // of using a MutationObserver. When an element such as a panel is closed,
      // it may not mutate but simply be removed from the DOM - a change which
      // would not be captured by the MutationObserver.
      var pollElementTimeout = setInterval(tryDismissTooltip.bind(this, elem), POLL_ELEMENT_TIMEOUT);
      this._disposables.add(new (_atom || _load_atom()).Disposable(function () {
        if (pollElementTimeout !== null) {
          clearTimeout(pollElementTimeout);
        }
      }));

      var boundClickListener = this._handleDisposableClick.bind(this, true /* continue to the next NUX in the NuxTour */
      );
      this._modifiedElem.addEventListener('click', boundClickListener);
      this._disposables.add(new (_atom || _load_atom()).Disposable(function () {
        _this._modifiedElem.removeEventListener('click', boundClickListener);
        window.removeEventListener('resize', debouncedWindowResizeListener);
      }));
    }
  }, {
    key: '_handleWindowResize',
    value: function _handleWindowResize() {
      this._tooltipDisposable.dispose();
      this._createDisposableTooltip();
    }
  }, {
    key: '_createDisposableTooltip',
    value: function _createDisposableTooltip() {
      var _this2 = this;

      var LINK_ENABLED = 'nuclide-nux-link-enabled';
      var LINK_DISABLED = 'nuclide-nux-link-disabled';

      // Let the link to the next NuxView be enabled iff
      //  a) it is not the last NuxView in the tour AND
      //  b) there is no condition for completion
      var nextLinkStyle = !this._finalNuxInTour && this._completePredicate == null ? LINK_ENABLED : LINK_DISABLED;

      // Additionally, the `Next` button may be disabled if an action must be completed.
      // In this case we show a hint to the user.
      var nextLinkButton = '      <span\n        class="nuclide-nux-link ' + nextLinkStyle + ' nuclide-nux-next-link-' + this._index + '"\n        ' + (nextLinkStyle === LINK_DISABLED ? 'title="Interact with the indicated UI element to proceed."' : '') + '>\n        Continue\n      </span>\n    ';

      // The next NUX in the tour can be created and added before this NUX
      // has completed its disposal. So, we attach an index to the classname
      // of the navigation links to specificy which specific NUX the event listener
      // should be attached to.
      // Also, we don't show the
      var content = '      <span class="nuclide-nux-content-container">\n        <div class="nuclide-nux-content">\n            ' + this._content + '\n        </div>\n        <div class="nuclide-nux-navigation">\n          <span class="nuclide-nux-link ' + LINK_ENABLED + ' nuclide-nux-dismiss-link-' + this._index + '">\n            ' + (!this._finalNuxInTour ? 'Dismiss' : 'Complete') + ' Tour\n          </span>\n          ' + (!this._finalNuxInTour ? nextLinkButton : '') + '\n      </div>\n    </span>';

      this._tooltipDisposable = atom.tooltips.add(this._tooltipDiv, {
        title: content,
        trigger: 'manual',
        placement: this._position,
        html: true,
        template: '<div class="tooltip nuclide-nux-tooltip">\n                    <div class="tooltip-arrow"></div>\n                    <div class="tooltip-inner"></div>\n                  </div>'
      });
      this._disposables.add(this._tooltipDisposable);

      if (nextLinkStyle === LINK_ENABLED) {
        (function () {
          var nextElementClickListener = _this2._handleDisposableClick.bind(_this2, true /* continue to the next NUX in the tour */);
          var nextElement = document.querySelector('.nuclide-nux-next-link-' + _this2._index);
          nextElement.addEventListener('click', nextElementClickListener);
          _this2._disposables.add(new (_atom || _load_atom()).Disposable(function () {
            return nextElement.removeEventListener('click', nextElementClickListener);
          }));
        })();
      }

      // Record the NUX as dismissed iff it is not the last NUX in the tour.
      // Clicking "Complete Tour" on the last NUX should be tracked as succesful completion.
      var dismissElementClickListener = !this._finalNuxInTour ? this._handleDisposableClick.bind(this, false /* skip to the end of the tour */) : this._handleDisposableClick.bind(this, true /* continue to the next NUX in the tour */);
      var dismissElement = document.querySelector('.nuclide-nux-dismiss-link-' + this._index);
      dismissElement.addEventListener('click', dismissElementClickListener);

      this._disposables.add(new (_atom || _load_atom()).Disposable(function () {
        return dismissElement.removeEventListener('click', dismissElementClickListener);
      }));
    }
  }, {
    key: '_handleDisposableClick',
    value: function _handleDisposableClick() {
      var success = arguments.length <= 0 || arguments[0] === undefined ? true : arguments[0];

      // If a completion predicate exists, only consider the NUX as complete
      // if the completion condition has been met.
      // Use `success` to short circuit the check and immediately dispose of the NUX.
      if (success && this._completePredicate != null && !this._completePredicate()) {
        return;
      }

      // Cleanup changes made to the DOM.
      this._modifiedElem.classList.remove('nuclide-nux-tooltip-helper-parent');
      this._tooltipDiv.remove();

      this._onNuxComplete(success);
    }
  }, {
    key: 'showNux',
    value: function showNux() {
      this._createNux();
    }
  }, {
    key: 'setNuxCompleteCallback',
    value: function setNuxCompleteCallback(callback) {
      this._callback = callback;
    }
  }, {
    key: '_onNuxComplete',
    value: function _onNuxComplete() {
      var success = arguments.length <= 0 || arguments[0] === undefined ? true : arguments[0];

      if (this._callback) {
        this._callback(success);
        // Avoid the callback being invoked again.
        this._callback = null;
      }
      this.dispose();
      return success;
    }
  }, {
    key: 'dispose',
    value: function dispose() {
      this._disposables.dispose();
    }
  }, {
    key: '_track',
    value: function _track(message, error) {
      (0, (_nuclideAnalytics || _load_nuclideAnalytics()).track)('nux-view-action', {
        tourId: this._tourId,
        message: '' + message,
        error: (0, (_commonsNodeString || _load_commonsNodeString()).maybeToString)(error)
      });
    }
  }]);

  return NuxView;
})();

exports.NuxView = NuxView;