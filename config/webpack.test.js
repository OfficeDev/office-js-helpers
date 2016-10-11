var webpack = require('webpack');
var path = require('path');
var HtmlWebpackPlugin = require('html-webpack-plugin');

var library = 'OfficeHelpers';

module.exports = {
    entry: {
        'office.helpers': "./src/index.spec.ts",
    },
    devtool: 'source-map',
    output: {
        path: path.resolve('./test'),
        filename: '[name].[hash].js',
        library: library,
        libraryTarget: 'umd',
        umdNamedDefine: true
    },

    plugins: [
        new HtmlWebpackPlugin({
            title: 'OfficeJS Helpers Test',
            filename: 'index.html',
            template: './tests.html'
        })
    ],

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