var webpack = require('webpack');
var declarationBundler = require('declaration-bundler-webpack-plugin');
var path = require('path');

var library = 'OfficeJSHelpers';

module.exports = {
    entry: "./src/index.ts",
    devtool: 'source-map',
    output: {
        path: path.resolve('./dist'),
        filename: 'office-js-helpers.js',
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