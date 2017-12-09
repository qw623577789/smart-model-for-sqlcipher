const fsx = require('fs-extra');
const Helper = require('../../lib/helper');
const sqlite3 = require('sqlcipher').verbose();

async function executeSql(connection, sql) {
    return await new Promise((resolve, reject) => {
        connection.run(sql, (error) => {
            if (error) {
                return reject(error);
            }
            return resolve();
        });
    });
}

function addFieldSql(table, field, desc) {
    let sql = `ALTER TABLE \`${table}\` ADD COLUMN \`${field}\``;
    switch(desc.type.toLowerCase()) {
        case 'string':
            sql += ` VARCHAR(${desc.length}) NOT NULL DEFAULT '${desc.default}'`;
            break;
        case 'integer':
            sql += ` INTEGER NOT NULL DEFAULT ${desc.default}`;
            break;
    }
    return sql;
}

function addIndexSql(table, field, desc) {
    let sql = "";
    switch (desc.index) {
        case 'unique':
            sql = `CREATE UNIQUE INDEX IF NOT EXISTS idx_${table}_${field} on \`${table}\`(${field});`;
            break;
        case 'ordinary':
            sql = `CREATE INDEX IF NOT EXISTS idx_${table}_${field} on \`${table}\`(${field});`;
            break;
    }
    return sql;
}

function dropFieldSql(table, field, desc) {
    return `ALTER TABLE \`${table}\` DROP COLUMN \`${field}\``;
}

module.exports = async (param) => {
    try {
        const helper = new Helper(param.modelsDir, param.configDir);
        
        if (helper.config === undefined) {
            throw new Error(`no config`);
        }

        let connection = await new Promise((resolve, reject) => {
            const conn = new sqlite3.Database(helper.config.file, (err) => {
                if (err) return reject(err);
            });
            if (helper.config.password !=  undefined) {
                conn.exec(`pragma key = '${helper.config.password}';pragma cipher = '${helper.config.cipherMode}';`, (err) => {
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

        for (let name of helper.models) {
            const {current, obsolete} = helper.model(name);
            if (obsolete !== undefined) {

            	let sqls = [];
			    Object.entries(current).forEach(([field, desc]) => {
			        if (obsolete[field] === undefined) {
                        sqls.push(addFieldSql(name, field, desc));
                        if (desc.index != undefined) {
                            sqls.push(addIndexSql(name, field, desc));
                        }
			            return;
			        }
			    });
			    Object.entries(obsolete).forEach(([field, desc]) => {
			        if (current[field] === undefined) {
			            sqls.push(dropFieldSql(name, field, desc));
			            return;
			        }
			    });

			    for (let sql of sqls) {
                    await executeSql(connection, sql);
			    }
            }
        }

        return new Promise((resolve, reject) => {
            connection.close((error) => {
                if (error) {
                    return reject(error);
                }
                return resolve();
            })
        });
    }
    catch(err) {
        console.log(err.stack);
        process.exit(-1);
    }
}