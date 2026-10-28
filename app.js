//1. Dependências e Middlewares
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser');
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

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

//2. Controle de CORS (Headers & OPTIONS)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));



//3. Definição de Rotas 

app.use("/usuario",routerUsuario);
app.use("/funcionario",routerFuncionarios);
app.use("/categorias", routerCategorias);
app.use("/clientes", routerClientes);
app.use("/produtos", routerProdutos);
app.use("/fornecedores", routerFornecedores);
app.use("/entradas", routerEntradas);
app.use("/estoque", routerEstoque);
app.use("/historico-precos", routerHistoricoPrecos);
app.use("/pedidos", routerPedidos);
app.use("/saidas", routerSaidas);




app.get('/teste', (req, res) => {
    res.status(200).send({
        mensagem: 'Tudo OK'
    });
});
//4. Tratamento de Erros (Fallback & Handler)
app.use((req,res,next)=>{
      const erro = new Error("Não encontrado!");
      erro.status = 404;
      next(erro);
});
app.use((error,req,res,next)=>{
        res.status(error.status || 500);
        return res.json({
            erro:{
                 mensagem:error.message
            }  })
})

module.exports = app
