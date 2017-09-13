const webpack = require('webpack');
const path = require('path');
const libraryName = 'OfficeHelpers';
const fileName = 'office.helpers.js';

class DtsBundlePlugin {
  apply(compiler) {
    compiler.plugin('done', () => {
      const dts = require('dts-bundle');

      dts.bundle({
        name: libraryName,
        main: 'dts/index.d.ts',
        baseDir: 'dts',
        out: '../dist/office.helpers.d.ts',
        removeSource: false,
        externals: true,
        outputAsModuleFolder: true
      });
    });
  }
}

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
        test: /(\.ts)$/,
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
    new webpack.NamedModulesPlugin(),
    new DtsBundlePlugin()
  ]
};
