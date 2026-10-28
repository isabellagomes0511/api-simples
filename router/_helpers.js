const pool = require("../mysql").pool;

function query(connection, sql, values = []) {
    return new Promise((resolve, reject) => {
        connection.query(sql, values, (error, result) => {
            if (error) return reject(error);
            resolve(result);
        });
    });
}

async function transaction(callback) {
    const connection = await new Promise((resolve, reject) => {
        pool.getConnection((error, conn) => {
            if (error) return reject(error);
            resolve(conn);
        });
    });

    try {
        await query(connection, "START TRANSACTION");
        const result = await callback(connection);
        await query(connection, "COMMIT");
        return result;
    } catch (error) {
        try {
            await query(connection, "ROLLBACK");
        } catch (rollbackError) {
            console.error("Erro ao desfazer transação:", rollbackError);
        }
        throw error;
    } finally {
        connection.release();
    }
}

function fail(res, error) {
    console.error(error);
    const status = error.status ||
        (["ER_ROW_IS_REFERENCED_2", "ER_DUP_ENTRY"].includes(error.code) ? 409 : 500);
    const mensagem = status >= 500 ? "Erro interno do servidor." : error.message;
    return res.status(status).json({ erro: mensagem });
}

function invalid(message) {
    const error = new Error(message);
    error.status = 400;
    return error;
}

function parseId(value) {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
        throw invalid("O identificador deve ser um número inteiro positivo.");
    }
    return id;
}

module.exports = { pool, query, transaction, fail, invalid, parseId };
