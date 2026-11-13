// 1. Criando o Pool de Conexões
const mysql = require("mysql2");
const { databaseConfig } = require("./config");
const pool = mysql.createPool({
    ...databaseConfig(),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 100,
    connectTimeout: 10000
});

exports.pool = pool;
