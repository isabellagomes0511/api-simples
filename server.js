require('dotenv').config();
const http = require('http');

const app = require('./app');
const { pool } = require('./mysql');
const { runtimeConfig } = require('./config');

const config = runtimeConfig();

const server = http.createServer(app);
server.requestTimeout = 30000;
server.headersTimeout = 10000;
server.keepAliveTimeout = 5000;

function closeServer(signal) {
    console.log(`Recebido ${signal}; encerrando servidor.`);
    server.close((error) => {
        if (error) {
            console.error('Erro ao encerrar o servidor:', error);
            process.exitCode = 1;
        }
        pool.end((poolError) => {
            if (poolError) {
                console.error('Erro ao encerrar conexões MySQL:', poolError);
                process.exitCode = 1;
            }
        });
    });
}

async function startServer() {
    try {
        await new Promise((resolve, reject) => {
            pool.getConnection((error, connection) => {
                if (error) return reject(error);
                connection.release();
                return resolve();
            });
        });

        server.listen(config.port, '0.0.0.0', () => {
            console.log(`Servidor rodando na porta ${config.port}`);
        });
    } catch (error) {
        console.error('Não foi possível conectar ao MySQL:', error.message);
        pool.end(() => {
            process.exitCode = 1;
        });
    }
}

process.once('SIGINT', () => closeServer('SIGINT'));
process.once('SIGTERM', () => closeServer('SIGTERM'));

startServer().catch((error) => {
    console.error('Falha ao iniciar o servidor:', error.message);
    pool.end(() => {
        process.exitCode = 1;
    });
});