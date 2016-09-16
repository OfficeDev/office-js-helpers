var webpack = require('webpack');
var path = require('path');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
    entry: {
        'app': "./src/app.ts",
        'vendors': "./src/vendors.ts"
    },
    devtool: 'source-map',
    output: {
        path: path.resolve('./test'),
        filename: '[name].[hash].js'
    },

    plugins: [
        new HtmlWebpackPlugin({
            title: 'OfficeJS Helpers Test',
            filename: 'index.html',
            template: './src/index.html'
        }),
        new ExtractTextPlugin("styles.css")
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
            },
            {
                test: /\.css$/,
                loader: ExtractTextPlugin.extract({
                    loader: "css-loader"
                })
            }
        ]
    }
};