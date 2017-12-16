const fsx = require('fs-extra');
const Helper = require('../../../lib/helper');
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

module.exports = async (modelsDir, configDir) => {
    try {
        const helper = new Helper(modelsDir, configDir);
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
            const {current} = helper.model(name);

            let sql = '';
            Object.entries(current).forEach(([field, desc]) => {
                sql += sql.length > 0 ? `,\`${field}\`` : `\`${field}\``;
                switch(desc.type.toLowerCase()) {
                    case 'string':
                        sql += ` VARCHAR(${desc.length}) NOT NULL DEFAULT '${desc.default}'`;
                        break;
                    case 'integer':
                        sql += ` INTEGER NOT NULL DEFAULT ${desc.default}`;
                        break;
                }
            });

            sql = `CREATE TABLE IF NOT EXISTS \`${name}\`(${sql})`;
            await executeSql(connection, sql);

            Object.entries(current).forEach(async ([field, desc]) => {
                switch (desc.index) {
                    case 'unique':
                        sql = `CREATE UNIQUE INDEX IF NOT EXISTS idx_${name}_${field} on \`${name}\`(${field});`;
                        break;
                    case 'ordinary':
                        sql = `CREATE INDEX IF NOT EXISTS idx_${name}_${field} on \`${name}\`(${field});`;
                        break;
                }
                await executeSql(connection, sql);
            })


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