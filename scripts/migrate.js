require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const { pool } = require("../mysql");

function query(connection, sql, values = []) {
    return new Promise((resolve, reject) => {
        connection.query(sql, values, (error, result) => {
            if (error) return reject(error);
            return resolve(result);
        });
    });
}

async function isSaidasMigrationApplied(connection) {
    const [columns] = await query(
        connection,
        `SELECT EXTRA FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'saidas' AND COLUMN_NAME = 'id_saida'`
    );
    if (!columns || !columns.EXTRA.toLowerCase().includes("auto_increment")) return false;

    const [primaryKey] = await query(
        connection,
        `SELECT COUNT(*) AS total FROM information_schema.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'saidas'
           AND COLUMN_NAME = 'id_saida' AND CONSTRAINT_NAME = 'PRIMARY'`
    );
    if (Number(primaryKey.total) !== 1) return false;

    const [foreignKeys] = await query(
        connection,
        `SELECT COUNT(DISTINCT CONSTRAINT_NAME) AS total
         FROM information_schema.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'saidas'
           AND ((COLUMN_NAME = 'id_produto' AND REFERENCED_TABLE_NAME = 'produtos')
             OR (COLUMN_NAME = 'id_funcionario' AND REFERENCED_TABLE_NAME = 'funcionarios'))`
    );
    return Number(foreignKeys.total) === 2;
}

async function migrate(connection) {
    const [lock] = await query(
        connection,
        "SELECT GET_LOCK('api-simples:migrations', 30) AS acquired"
    );
    if (!lock || Number(lock.acquired) !== 1) {
        throw new Error("Não foi possível obter o bloqueio exclusivo de migrações.");
    }
    try {
        await query(
            connection,
            `CREATE TABLE IF NOT EXISTS schema_migrations (
                name VARCHAR(255) NOT NULL PRIMARY KEY,
                applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB`
        );

        const directory = path.join(__dirname, "..", "migrations");
        const files = fs.readdirSync(directory)
            .filter((name) => /^\d+.*\.sql$/i.test(name))
            .sort();

        for (const name of files) {
            const [existing] = await query(
                connection,
                "SELECT name FROM schema_migrations WHERE name = ?",
                [name]
            );
            if (existing) continue;

            if (name.startsWith("20261104_fix_saidas_schema") &&
                await isSaidasMigrationApplied(connection)) {
                console.log(`Migração ${name} já refletida no esquema; registrada sem reaplicar.`);
            } else {
                const sql = fs.readFileSync(path.join(directory, name), "utf8").trim();
                await query(connection, sql);
                console.log(`Migração aplicada: ${name}`);
            }

            await query(connection, "INSERT INTO schema_migrations (name) VALUES (?)", [name]);
        }
    } finally {
        await query(connection, "SELECT RELEASE_LOCK('api-simples:migrations')");
    }
}

pool.getConnection((error, connection) => {
    if (error) {
        console.error("Não foi possível conectar ao MySQL para executar migrações:", error.message);
        pool.end(() => {
            process.exitCode = 1;
        });
        return;
    }

    migrate(connection)
        .catch((migrationError) => {
            console.error("Falha ao executar migrações:", migrationError.message);
            process.exitCode = 1;
        })
        .finally(() => {
            connection.release();
            pool.end();
        });
});
