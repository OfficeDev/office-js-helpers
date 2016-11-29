"use strict;"

var path = require('path');
var fs = require('fs');
var dtsBuilder = require('dts-builder');
var projectRoot = path.resolve(__dirname, '../');

if (!fs.existsSync(`${projectRoot}/dist`)) {
    fs.mkdirSync(`${projectRoot}/dist`);
}

dtsBuilder.generateBundles([
    {
        name: 'office-js-helpers',
        alias: 'OfficeHelpers',
        sourceDir: `${projectRoot}/bundle`,
        destDir: `${projectRoot}/dist`
    }
]);

console.log('Waiting for 2 seconds so that the dts can be merged before proceeding. If this fails the either increase the wait time or just re-run the task.');
setTimeout(function() {
    console.log('Replacing the references to officeJsHelpers and regularizing it.');
    fs.readFile(`${projectRoot}/dist/office-js-helpers.d.ts`, 'utf8', function(err, data) {
        if (err) {
            return console.log(err);
        }

        var result = replace(data)
            (/officeJsHelpers/gm, 'OfficeHelpers')
            (/declare module 'OfficeHelpers'/gm, 'declare module \'office-js-helpers\'')
            (/^import OfficeHelpers.*/g, '')
            (/^var _default: void;/, '')
            (/export default _default;/, '')
            (/^\s*[\r\n]/gm, '')
            ();

        fs.writeFile(`${projectRoot}/dist/office-js-helpers.d.ts`, result, 'utf8', function(err) {
            if (err) return console.log(err);

            fs.rename(`${projectRoot}/dist/office-js-helpers.d.ts`, `${projectRoot}/dist/office.helpers.d.ts`, function(err) {
                if (err) {
                    console.log('ERROR: ' + err);
                    throw err;
                }
            });
        });
    });
}, 2000);

function replace(source) {
    var current = source;

    return function stage(regex, value) {
        if (arguments.length == 0) {
            return current;
        }
        else {
            current = current.replace(regex, value);
            return stage;
        }
    }
}