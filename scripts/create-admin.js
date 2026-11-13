require("dotenv").config();

const bcrypt = require("bcryptjs");
const { pool } = require("../mysql");

function query(connection, sql, values = []) {
    return new Promise((resolve, reject) => {
        connection.query(sql, values, (error, result) => {
            if (error) return reject(error);
            return resolve(result);
        });
    });
}

async function createAdmin(connection) {
    const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
    const name = process.env.BOOTSTRAP_ADMIN_NAME;
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !name || !name.trim() || !password || Buffer.byteLength(password, "utf8") < 12 ||
        Buffer.byteLength(password, "utf8") > 72) {
        throw new Error(
            "Defina BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_NAME e uma BOOTSTRAP_ADMIN_PASSWORD de 12 a 72 bytes."
        );
    }

    const hash = await bcrypt.hash(password, 12);
    await query(
        connection,
        `INSERT INTO usuarios (nome, email, senha_hash, role, ativo)
         VALUES (?, ?, ?, 'admin', 1)
         ON DUPLICATE KEY UPDATE nome = VALUES(nome), senha_hash = VALUES(senha_hash),
                                 role = 'admin', ativo = 1`,
        [name.trim(), email.trim(), hash]
    );
    console.log(`Administrador configurado para ${email.trim()}.`);
}

pool.getConnection((error, connection) => {
    if (error) {
        console.error("Não foi possível conectar ao MySQL:", error.message);
        pool.end(() => {
            process.exitCode = 1;
        });
        return;
    }

    createAdmin(connection)
        .catch((bootstrapError) => {
            console.error("Não foi possível configurar o administrador:", bootstrapError.message);
            process.exitCode = 1;
        })
        .finally(() => {
            connection.release();
            pool.end();
        });
});
