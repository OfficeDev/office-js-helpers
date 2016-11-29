// Credit to Basarat/typescript-collections
// https://github.com/basarat/typescript-collections/blob/release/minify-umd.js

"use strict;"

var fs = require("fs");
var path = require("path");
var UglifyJS = require("uglify-js");
var projectRoot = path.resolve(__dirname, '../');
var distInFile = `${projectRoot}/dist/office.helpers.js`;
var distOutFileUnversioned = `${projectRoot}/dist/office.helpers.min.js`;

var result = UglifyJS.minify(distInFile, { mangle: true });
fs.writeFileSync(distOutFileUnversioned, result.code, { encoding: "utf-8", flags: "wx" });