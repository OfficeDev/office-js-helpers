const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const timeout = 2000;

function DtsBundlePlugin(options) { }

DtsBundlePlugin.prototype.apply = compiler => {
  const self = this;

  compiler.plugin('emit', (_compilation, callback) => {
    const dtsBuilder = require('dts-builder');

    dtsBuilder.generateBundles([{
      name: 'office-js-helpers',
      alias: 'OfficeHelpers',
      sourceDir: './dts',
      destDir: './dist'
    }]);

    console.log('Waiting for 2 seconds so that the dts can be merged before proceeding. If this fails the either increase the wait time or just re-run the task.');
    setTimeout(() => patchDTS(callback), timeout);
  });
}

function patchDTS(callback) {
  const self = this;
  console.log('Replacing the references to officeJsHelpers and regularizing it.');
  fs.readFile('./dist/office-js-helpers.d.ts', 'utf8', (err, data) => {
    if (err) {
      return console.log(err);
    }

    const result = replace(data)
      (/officeJsHelpers/gm, 'OfficeHelpers')
      (/declare module 'OfficeHelpers'/gm, 'declare module \'@microsoft/office-js-helpers\'')
      (/^import OfficeHelpers.*/g, '')
      (/^var _default: void;/, '')
      (/export default _default;/, '')
      (/^\s*[\r\n]/gm, '')
      ();

    fs.writeFile('./dist/office-js-helpers.d.ts', result, 'utf8', (err) => {
      if (err) {
        return console.log(err);
      }

      fs.rename('./dist/office-js-helpers.d.ts', './/dist/office.helpers.d.ts', (err) => {
        if (err) {
          console.log('ERROR: ' + err);
          throw err;
        }

        rimraf('./dts', () => {
          if (callback) {
            callback();
          }
        });
      });
    });
  });
}

function replace(source) {
  let current = source;

  // tslint:disable-next-line:only-arrow-functions
  return function stage(regex, value) {
    if (arguments.length === 0) {
      return current;
    }
    else {
      current = current.replace(regex, value);
      return stage;
    }
  };
}

module.exports = DtsBundlePlugin;