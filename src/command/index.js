const assert = require('assert');
const sqlite3 = require('sqlite3').verbose();
let config = undefined;
let models = {};

module.exports = class {
    constructor(name) {
        this._model = this._findModel(name);
        this._name = name;
        this._data = undefined;
        this._logic = undefined;
        this._joins = [];
        this._sorts = undefined;
        this._range = undefined;
        this._limit = undefined;
        this._sql = '';
        this._params = [];
    }

    static set config(cfg) {
        config = cfg;
    }

    static set models(mlds) {
        models = mlds;
    }

    run() {
        throw new Error('run is supposed to be implemented by subclass');    
    }
    
    _findModel(name) {
        assert(models[name] !== undefined, `no such model named ${name}`);
        return models[name];
    }

    _parseoInsertData(data) {
        this._sql += ' (`' + Object.keys(data).join('`,`') + '`) VALUES (' + Object.keys(data).map(item => '?').join(',') + ')';
        this._params = this._params.concat(Object.values(data));
    }

    _parseoUpdateData(data) {
        this._sql += ' SET `' + Object.keys(data).map(item => item + '`=?').join(',`') ;
        this._params = this._params.concat(Object.values(data));
    }

    _parseJoins(joins) {
        let fieldLeft = '';
        let fieldRight = '';
        joins.forEach(join => {
            switch(join.type.toLowerCase()) {
                case 'left':
                    fieldLeft = join.fieldLeft.split('.').map(item => '\`' + item + '\`').join('.');
                    fieldRight = join.fieldRight.split('.').map(item => '\`' + item + '\`').join('.');
                    this._sql += ` ${join.type.toUpperCase()} OUTER JOIN \`${join.name}\` ON ${fieldLeft}=${fieldRight}`;
                    break; 
                case 'inner':
                    fieldLeft = join.fieldLeft.split('.').map(item => '\`' + item + '\`').join('.');
                    fieldRight = join.fieldRight.split('.').map(item => '\`' + item + '\`').join('.');
                    this._sql += ` ${join.type.toUpperCase()}  JOIN \`${join.name}\` ON ${fieldLeft}=${fieldRight}`;
                    break;
                case 'right':
                    throw new Error(`sqlite not suppport join type ${join.type}`);
                default:
                    throw new Error(`unknown join type ${join.type}`);
            }
        });        
    }

    _parseLogic(logic) {
        this._sql += ` WHERE ${logic.toSql()}`;
        this._params = this._params.concat(logic.toParams());      
    }

    _parseSorts(sorts) {
        this._sql += ' ORDER BY ' + sorts.map(sort => `\`${sort.field}\` ${sort.order}`).join(',');
    }

    _parseRange(range) {
        this._sql += ` LIMIT ?,?`;
        this._params = this._params.concat([range.offset, range.number]);
    }

    _parseLimit(limit) {
        this._sql += ` LIMIT ?`;
        this._params = this._params.concat(limit);
    }

    async _execute() {
        assert(config !== undefined, 'You need to call setup before making any practical calls');
        let connection = await new Promise((resolve, reject) => {
            const conn = new sqlite3.Database(config.file, (err) => {
                if (err) return reject(err);
            });
            if (config.password !=  undefined) {
                conn.exec(`pragma key = '${config.password}';pragma cipher = '${config.cipherMode}';`, (err) => {
                    if (err) {
                        return reject(err);
                    }
                    else {
                        return resolve(conn);
                    }
                });
            }
            else {
                return resolve(conn);
            }
        })

        let data = await new Promise((resolve, reject) => {
            switch(this._sql.split(' ')[0].toLowerCase()) {
                case "select":
                    connection.all(this._sql, this._params, (error, rows) => {
                        if (error) {
                            return reject(error);
                        }
                        return resolve(rows);
                    });
                    break;
                case "insert":
                    connection.run(this._sql, this._params, function(error) {
                        if (error) {
                            return reject(error);
                        }
                        return resolve(this.lastID);
                    });
                    break;
                case "update":
                case "delete":
                    connection.run(this._sql, this._params, function (error) {
                        if (error) {
                            return reject(error);
                        }
                        return resolve(this.changes);
                    });
                    break;
            }
        });

        await new Promise((resolve, reject) => {
            connection.close((error) => {
                if (error) {
                    return reject(error);
                }
                return resolve();
            })
        });

        return data;
    }
}
