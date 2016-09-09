(function (factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(["require", "exports", './helpers/dictionary', './helpers/storage', './authentication/token.manager.ts', './authentication/endpoint.manager.ts', './authentication/authenticator.ts'], factory);
    }
})(function (require, exports) {
    "use strict";
    function __export(m) {
        for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
    }
    __export(require('./helpers/dictionary'));
    __export(require('./helpers/storage'));
    __export(require('./authentication/token.manager.ts'));
    __export(require('./authentication/endpoint.manager.ts'));
    __export(require('./authentication/authenticator.ts'));
});
//# sourceMappingURL=index.js.map