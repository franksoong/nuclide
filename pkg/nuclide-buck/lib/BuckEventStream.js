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

exports.getEventsFromSocket = getEventsFromSocket;
exports.getEventsFromProcess = getEventsFromProcess;
exports.combineEventStreams = combineEventStreams;
exports.getDiagnosticEvents = getDiagnosticEvents;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _rxjsBundlesRxMinJs;

function _load_rxjsBundlesRxMinJs() {
  return _rxjsBundlesRxMinJs = require('rxjs/bundles/Rx.min.js');
}

var _stripAnsi;

function _load_stripAnsi() {
  return _stripAnsi = _interopRequireDefault(require('strip-ansi'));
}

var _nuclideLogging;

function _load_nuclideLogging() {
  return _nuclideLogging = require('../../nuclide-logging');
}

var _getDiagnostics;

function _load_getDiagnostics() {
  return _getDiagnostics = _interopRequireDefault(require('./getDiagnostics'));
}

var _commonsNodeProcess;

function _load_commonsNodeProcess() {
  return _commonsNodeProcess = require('../../commons-node/process');
}

var PROGRESS_OUTPUT_INTERVAL = 5 * 1000;
var BUILD_FAILED_MESSAGE = 'BUILD FAILED:';

function convertJavaLevel(level) {
  switch (level) {
    case 'INFO':
      return 'info';
    case 'WARNING':
      return 'warning';
    case 'SEVERE':
      return 'error';
  }
  return 'log';
}

function getEventsFromSocket(socketStream) {
  var log = function log(message) {
    var level = arguments.length <= 1 || arguments[1] === undefined ? 'log' : arguments[1];
    return (_rxjsBundlesRxMinJs || _load_rxjsBundlesRxMinJs()).Observable.of({
      type: 'log',
      message: message,
      level: level
    });
  };

  var eventStream = socketStream.flatMap(function (message) {
    switch (message.type) {
      case 'SocketConnected':
        return (_rxjsBundlesRxMinJs || _load_rxjsBundlesRxMinJs()).Observable.of({ type: 'socket-connected' });
      case 'ParseStarted':
        return log('Parsing BUCK files...');
      case 'ParseFinished':
        return log('Parsing finished. Starting build...');
      case 'ConsoleEvent':
        return log(message.message, convertJavaLevel(message.level.name));
      case 'InstallFinished':
        return log('Install finished.', 'info');
      case 'BuildFinished':
        return log('Build finished with exit code ' + message.exitCode + '.', message.exitCode === 0 ? 'info' : 'error');
      case 'BuildProgressUpdated':
        return (_rxjsBundlesRxMinJs || _load_rxjsBundlesRxMinJs()).Observable.of({
          type: 'progress',
          progress: message.progressValue
        });
    }
    return (_rxjsBundlesRxMinJs || _load_rxjsBundlesRxMinJs()).Observable.empty();
  }).catch(function (err) {
    (0, (_nuclideLogging || _load_nuclideLogging()).getLogger)().error('Got Buck websocket error', err);
    // Return to indeterminate progress.
    return (_rxjsBundlesRxMinJs || _load_rxjsBundlesRxMinJs()).Observable.of({
      type: 'progress',
      progress: null
    });
  }).share();

  // Periodically emit log events for progress updates.
  var progressEvents = eventStream.switchMap(function (event) {
    if (event.type === 'progress' && event.progress != null && event.progress > 0 && event.progress < 1) {
      return log('Building... [' + Math.round(event.progress * 100) + '%]');
    }
    return (_rxjsBundlesRxMinJs || _load_rxjsBundlesRxMinJs()).Observable.empty();
  });

  return eventStream.merge(progressEvents.take(1).concat(progressEvents.sampleTime(PROGRESS_OUTPUT_INTERVAL)));
}

function getEventsFromProcess(processStream) {
  return processStream.map(function (message) {
    switch (message.kind) {
      case 'error':
        return {
          type: 'error',
          message: 'Buck failed: ' + message.error.message
        };
      case 'exit':
        var logMessage = 'Buck exited with ' + (0, (_commonsNodeProcess || _load_commonsNodeProcess()).exitEventToMessage)(message) + '.';
        if (message.exitCode === 0) {
          return {
            type: 'log',
            message: logMessage,
            level: 'success'
          };
        }
        return {
          type: 'error',
          message: logMessage
        };
      case 'stderr':
      case 'stdout':
        return {
          type: 'log',
          // Some Buck steps output ansi escape codes regardless of terminal setting.
          message: (0, (_stripAnsi || _load_stripAnsi()).default)(message.data),
          // Build failure messages typically do not show up in the web socket.
          // TODO(hansonw): fix this on the Buck side
          level: message.data.indexOf(BUILD_FAILED_MESSAGE) === -1 ? 'log' : 'error'
        };
      default:
        throw new Error('impossible');
    }
  });
}

function combineEventStreams(subcommand, socketEvents, processEvents) {
  // Every build finishes with a 100% progress event.
  function isBuildFinishEvent(event) {
    return event.type === 'progress' && event.progress === 1;
  }
  function isRegularLogMessage(event) {
    return event.type === 'log' && event.level === 'log';
  }
  // Socket stream never stops, so use the process lifetime.
  var finiteSocketEvents = socketEvents.takeUntil(processEvents.ignoreElements()
  // Despite the docs, takeUntil doesn't respond to completion.
  .concat((_rxjsBundlesRxMinJs || _load_rxjsBundlesRxMinJs()).Observable.of(null))).share();
  var mergedEvents = (_rxjsBundlesRxMinJs || _load_rxjsBundlesRxMinJs()).Observable.merge(finiteSocketEvents,

  // Take all process output until the first socket message.
  // There's a slight risk of output duplication if the socket message is late,
  // but this is pretty rare.
  processEvents.takeUntil(finiteSocketEvents).takeWhile(isRegularLogMessage),

  // Error/info logs from the process represent exit/error conditions, so always take them.
  // We ensure that error/info logs will not duplicate messages from the websocket.
  // $FlowFixMe: add skipWhile to flow-typed rx definitions
  processEvents.skipWhile(isRegularLogMessage));
  if (subcommand === 'test') {
    // The websocket does not reliably provide test output.
    // After the build finishes, fall back to the Buck output stream.
    mergedEvents = (_rxjsBundlesRxMinJs || _load_rxjsBundlesRxMinJs()).Observable.concat(mergedEvents.takeUntil(finiteSocketEvents.filter(isBuildFinishEvent)),
    // Return to indeterminate progress.
    (_rxjsBundlesRxMinJs || _load_rxjsBundlesRxMinJs()).Observable.of({ type: 'progress', progress: null }), processEvents);
  } else if (subcommand === 'install') {
    // Add a message indicating that install has started after build completes.
    // The websocket does not naturally provide any indication.
    mergedEvents = (_rxjsBundlesRxMinJs || _load_rxjsBundlesRxMinJs()).Observable.merge(mergedEvents, finiteSocketEvents.filter(isBuildFinishEvent)
    // $FlowFixMe: add switchMapTo to flow-typed
    .switchMapTo((_rxjsBundlesRxMinJs || _load_rxjsBundlesRxMinJs()).Observable.of({
      type: 'progress',
      progress: null
    }, {
      type: 'log',
      message: 'Installing...',
      level: 'info'
    })));
  }
  return mergedEvents;
}

function getDiagnosticEvents(events, buckRoot) {
  return events.flatMap(function (event) {
    // For log messages, try to detect compile errors and emit diagnostics.
    if (event.type === 'log') {
      return (_rxjsBundlesRxMinJs || _load_rxjsBundlesRxMinJs()).Observable.fromPromise((0, (_getDiagnostics || _load_getDiagnostics()).default)(event.message, event.level, buckRoot)).map(function (diagnostics) {
        return { type: 'diagnostics', diagnostics: diagnostics };
      });
    }
    return (_rxjsBundlesRxMinJs || _load_rxjsBundlesRxMinJs()).Observable.empty();
  });
}