var webpack = require('webpack');
var path = require('path');

var library = 'office-js-helpers';

module.exports = {
    entry: {
        "office-js-helpers": "./src/index.ts"
    },
    devtool: 'source-map',
    output: {
        path: path.resolve('./dist'),
        filename: library + '.js',
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
    },

    plugins: [
        // new webpack.optimize.DedupePlugin(),
        // new webpack.optimize.OccurrenceOrderPlugin(),
        // new webpack.optimize.UglifyJsPlugin({
        //    compress: {
        //        warnings: false
        //    }
        // })
    ]
};