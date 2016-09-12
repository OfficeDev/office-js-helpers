var path = require('path');
var dtsBuilder = require('dts-builder');

dtsBuilder.generateBundles([
    {
        name: 'office-js-helpers',
        alias: 'OfficeJSHelpers',
        sourceDir: path.resolve('./temp'),
        destDir: path.resolve('./dist'),
        externals: []
    }
]);