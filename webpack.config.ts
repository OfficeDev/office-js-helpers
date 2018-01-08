const webpack = require('webpack');
const path = require('path');
const DtsBundlePlugin = require('./generate-dts');
const libraryName = 'OfficeHelpers';
const fileName = 'office.helpers.js';
const { version, name: companyName, license, author } = require('./package.json');

module.exports = {
  entry: __dirname + '/src/index.ts',
  devtool: 'source-map',
  output: {
    path: __dirname + '/dist',
    filename: fileName,
    library: libraryName,
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  module: {
    rules: [
      {
        test: /(\.html)$/,
        loader: 'html-loader',
        options: {
          exportAsEs6Default: true
        }
      },
      {
        enforce: 'pre',
        test: /\.ts?$/,
        loader: 'tslint-loader'
      },
      {
        test: /\.ts$/,
        exclude: /\.spec\.ts$/,
        loader: 'awesome-typescript-loader',
        options: {
          configFileName: 'tsconfig.webpack.json'
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
  plugins: [
    new webpack.BannerPlugin({
      banner: `${companyName} v.${version}
Copyright (c) ${author}. All rights reserved.
Licensed under the ${license} license.`
    }),
    new webpack.NamedModulesPlugin(),
    new DtsBundlePlugin()
  ]
};
