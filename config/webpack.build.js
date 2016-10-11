var webpack = require('webpack');
var path = require('path');

var library = 'OfficeHelpers';

module.exports = {
    entry: {
        'office.helpers': "./src/index.ts",
    },
    devtool: 'source-map',
    output: {
        path: path.resolve('./dist'),
        filename: '[name].js',
        library: library,
        libraryTarget: 'umd',
        umdNamedDefine: true
    },

    tslint: {
        emitErrors: false,
        failOnHint: false,
        resourcePath: 'src'
    },

    resolve: {
        root: path.resolve('./src'),
        extensions: ['', '.js', '.ts']
    },

    module: {
        loaders: [
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                exclude: /(node_modules|bower_components)/
            }
        ]
    }
};