var path = require('path');
var dtsBuilder = require('dts-builder');

dtsBuilder.generateBundles([
    {
        name: 'OfficeHelpers',
        alias: 'OfficeHelpers',
        sourceDir: path.resolve('./dist'),
        destDir: path.resolve('./dist'),
        externals: []
    }
]);