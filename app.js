const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const app = express();
const { pool } = require('./mysql');
const { authenticate, requireRole } = require('./auth');
const { runtimeConfig } = require('./config');

const config = runtimeConfig();
app.disable('x-powered-by');
if (config.trustProxy) app.set('trust proxy', config.trustProxy);

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => callback(null, !origin || config.corsOrigins.includes(origin)),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan((tokens, req, res) => [
  tokens.method(req, res),
  req.path,
  tokens.status(req, res),
  `${tokens['response-time'](req, res)}ms`
].join(' '), {
  skip: (req) => config.test || req.path.startsWith('/health/')
}));

const routerUsuario = require("./router/routerUsuario");
const routerFuncionarios = require("./router/routerFuncionarios");
const routerCategorias = require("./router/routerCategorias");
const routerClientes = require("./router/routerClientes");
const routerProdutos = require("./router/routerProdutos");
const routerFornecedores = require("./router/routerFornecedores");
const routerEntradas = require("./router/routerEntradas");
const routerEstoque = require("./router/routerEstoque");
const routerHistoricoPrecos = require("./router/routerHistoricoPrecos");
const routerPedidos = require("./router/routerPedidos");
const routerSaidas = require("./router/routerSaidas");

app.get('/teste', (req, res) => {
    return res.status(200).json({ mensagem: 'Tudo OK' });
});

app.get('/health/live', (req, res) => res.status(200).json({ status: 'ok' }));
app.get('/health/ready', async (req, res) => {
    try {
        await new Promise((resolve, reject) => {
            pool.query({ sql: 'SELECT 1', timeout: 4000 }, (error) =>
                error ? reject(error) : resolve()
            );
        });
        return res.status(200).json({ status: 'ok' });
    } catch (error) {
        console.error('Verificação de prontidão do banco falhou:', error.message);
        return res.status(503).json({ status: 'indisponivel' });
    }
});

app.use('/usuario', routerUsuario);
app.use('/funcionario', authenticate, requireRole('admin'), routerFuncionarios);
app.use('/categorias', authenticate, routerCategorias);
app.use('/clientes', authenticate, routerClientes);
app.use('/produtos', authenticate, routerProdutos);
app.use('/fornecedores', authenticate, routerFornecedores);
app.use('/entradas', authenticate, routerEntradas);
app.use('/estoque', authenticate, routerEstoque);
app.use('/historico-precos', authenticate, routerHistoricoPrecos);
app.use('/pedidos', authenticate, routerPedidos);
app.use('/saidas', authenticate, routerSaidas);

app.use((req, res, next) => {
    const error = new Error('Não encontrado.');
    error.status = 404;
    return next(error);
});
app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.status || 500;
    if (status >= 500) console.error(error);
    return res.status(status).json({
        erro: { mensagem: status >= 500 ? 'Erro interno do servidor.' : error.message }
    });
});

module.exports = app
