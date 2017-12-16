const fs = require('fs');
const path = require("path");
const walk = require('klaw-sync');

module.exports = class {
    constructor(modelsDir, configDir) {
        this._modelsDir = __dirname + "/" + path.relative(__dirname, modelsDir);
        this._configDir = __dirname + "/" + path.relative(__dirname, configDir);
    }

    get models() {
        return walk(this._modelsDir, {
            nodir: true,
            filter: item => item.path.endsWith('.js') && !item.path.endsWith('.obsolete.js')
        }).map(item => item.path.substring(item.path.lastIndexOf('/') + 1).replace(/\.js$/g, ''));
    }

    model(name) {
        return {
            current: require(`${this._modelsDir}/${name}.js`),
            obsolete: fs.existsSync(`${this._modelsDir}/${name}.obsolete.js`) ? require(`${this._modelsDir}/${name}.obsolete.js`) : undefined
        };
    }

    get config() {
        return require(this._configDir);
    }
}