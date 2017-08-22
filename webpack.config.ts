const webpack = require('webpack');
const UglifyJsPlugin = webpack.optimize.UglifyJsPlugin;
const path = require('path');
const isProdMode = process.env.NODE_ENV === 'production';
const libraryName = 'OfficeHelpers';
const fileName = 'office.helpers';


let outputFile = fileName, plugins = [];

if (isProdMode) {
  plugins.push(new UglifyJsPlugin({ minimize: true }));
  outputFile += '.min.js';
} else {
  outputFile += '.js';
}

const config = {
  entry: __dirname + '/src/index.ts',
  devtool: 'source-map',
  output: {
    path: __dirname + '/dist',
    filename: outputFile,
    library: libraryName,
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  module: {
    rules: [
      {
        test: /(\.html)$/,
        loader: 'html-loader',
        exclude: /node_modules/
      },
      {
        test: /(\.ts)$/,
        loader: 'awesome-typescript-loader',
        options: {
        }
      }
    ]
  },
  resolve: {
    modules: [
      path.resolve('./node_modules'),
      path.resolve('./src')
    ],
    extensions: ['.json', '.js', '.ts', '.html']
  },
  plugins: plugins
};

module.exports = config;