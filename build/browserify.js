// Credit to Basarat/typescript-collections
// https://github.com/basarat/typescript-collections/blob/release/browserify-umd.js

"use strict;"

var browserify = require("browserify");
var fs = require("fs");
var distOutFileUnversioned = "./dist/office.helpers.js";
var distOutUnversioned = fs.createWriteStream(distOutFileUnversioned, { encoding: "utf-8", flags: "w" })

var bundled = browserify({
    extensions: [".js"],
    standalone: 'OfficeHelpers'
})
    .require("./dist/index.js", { expose: "office-js-helpers" })
    .bundle();

bundled.pipe(distOutUnversioned);