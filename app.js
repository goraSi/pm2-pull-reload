var pmx = require('pmx');
var pm2 = require('pm2');
var async = require('async');
var vizion = require('vizion');
var child = require('child_process');

/******************************
 *    ______ _______ ______
 *   |   __ \   |   |__    |
 *   |    __/       |    __|
 *   |___|  |__|_|__|______|
 *
 *      PM2 Module Sample
 *
 ******************************/

/**
 *    Module system documentation
 *       http://bit.ly/1hnpcgu
 *
 *   Start module in development mode
 *          $ cd to my-module
 *          $ pm2 install .
 *
 *  Official modules are published here
 *      https://github.com/pm2-hive
 */

/**
 *           Module Entry Point
 *
 *  We first initialize the module by calling
 *         pmx.initModule({}, cb);
 *
 *
 * More options: http://bit.ly/1EpagZS
 *
 */
pmx.initModule({

  // Options related to the display style on Keymetrics
  widget: {

    // Logo displayed
    logo: 'https://app.keymetrics.io/img/logo/keymetrics-300.png',

    // Module colors
    // 0 = main element
    // 1 = secondary
    // 2 = main border
    // 3 = secondary border
    theme: ['#141A1F', '#222222', '#3ff', '#3ff'],

    // Section to show / hide
    el: {
      probes: true,
      actions: true
    },

    // Main block to show / hide
    block: {
      actions: false,
      issues: true,
      meta: true,
    }

  }

}, function (err, conf) {

  pm2.connect(function () {
    console.log((new Date()).toISOString() + ': Module pm2-pull-reload connected to PM2');

    var running = false;

    setInterval(function () {
      if (running == true) return false;

      running = true;
      pull(function () {
        running = false;
      });
    }, conf.interval || 60000);

  });

});

var exec = function (cmd, cb) {
  var output = '';

  var c = child.exec(cmd, {}, function (err) {
    if (cb) cb(err ? err.code : 0, output);
  });

  c.stdout.on('data', function (data) {
    output += data;
  });

  c.stderr.on('data', function (data) {
    output += data;
  });
};

var execSeries = function (cmds, cb) {
  var stdout = '';

  async.eachSeries(cmds, function (cmd, cb) {
    stdout += '\n' + cmd;
    console.log((new Date()).toISOString() + `: Running command "${cmd}"`);
    exec(cmd, function (code, output) {
      stdout += '\n' + output;
      if (code === 0) return cb()
      return cb('"' + cmd + '" failed');
    });
  }, function (err) {
    if (err) return cb(stdout + '\n' + err);
    return cb(null, stdout);
  });
}

var groupBy = function (items, key) {
  return items.reduce(function (result, item) {
    //(result[item[key]] = result[item[key]] || []).push(item);
    result[item[key]] = item;
    return result;
  }, {});
};

var pull = function (cb) {
  pm2.list(function (err, procs) {
    if (err) {
      console.error((new Date()).toISOString() + ': ' + err);
      return cb();
    }

    async.eachSeries(groupBy(procs, 'name'), function (proc, next) {
      if (proc.pm2_env && proc.pm2_env.versioning) {
        vizion.update({ folder: proc.pm2_env.pm_cwd }, function (err, meta) {
          if (err) return next(err);

          if (meta && meta.success) {
            console.log((new Date()).toISOString() + `: Started reloading process "${proc.name}"`);

            var commands = [
              'cd ' + proc.pm2_env.pm_cwd + ' && npm install',
              'cd ' + proc.pm2_env.pm_cwd + ' && npm run build --if-present',
            ]
            execSeries(commands, function (err) {
              if (err) return next(err);
              if (proc.pm2_env.status !== 'online') return next();

              pm2.reload(proc.name, function () {
                console.log((new Date()).toISOString() + `: Successfully reloaded process "${proc.name}"`);
                return next();
              });
            })
          } else {
            return next();
          }
        });
      } else {
        return next();
      }
    }, function (err) {
      if (err) console.error((new Date()).toISOString() + ': ' + err);
      return cb();
    });
  });
}
