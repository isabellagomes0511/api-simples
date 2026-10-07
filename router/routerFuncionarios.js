const express = require('express');
const router = express.Router();
const mysql = require("../mysql").pool;

//Listar Usuários
router.get('/', (req, res) => {
mysql.getConnection((error, conn) => {
if (error) return res.status(500).send({ error });
conn.query("SELECT * FROM funcionarios", (error, resultado) => {
conn.release();
if (error) return res.status(500).send({ error });
res.status(200).send({ funcionario: resultado });
});
});


});


// BUSCAR USUÁRIO POR ID
router.get('/:id', (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) return res.status(500).send({ error: error });
        conn.query("SELECT * FROM funcionarios WHERE id_funcionario = ?", [req.params.id], (error, resultado) => {
            conn.release();
            if (error) return res.status(500).send({ error: error });
            res.status(200).send({ usuario: resultado });
        });
    });
});

router.post('/', (req, res, next) => {
mysql.getConnection((error, conn) => {
if (error) return res.status(500).send({ error });
conn.query(
"INSERT INTO funcionarios (nome, cargo, salario, telefone, email, data_admissao, ativo, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
[req.body.nome, req.body.cargo, req.body.salario, req.body.telefone, req.body.email, req.body.data_admissao,  req.body.ativo,  req.body.criado_em],
(error, resultado) => {
    console.log(error)
conn.release();
if (error) return res.status(500).send({ error });
res.status(201).send({
mensagem: "Funcionário criado com sucesso!",
id_usuario: resultado.insertId
});
}
);

});
});

router.patch('/:id', (req, res, next) => {
mysql.getConnection((error, conn) => {
if (error) return res.status(500).send({ error });
conn.query(
"UPDATE funcionarios SET nome = ?, salario = ?, telefone = ?, email = ?, data_admissao = ?, ativo = ? WHERE id_funcionario = ?",
              [req.body.nome, req.body.salario, req.body.telefone, req.body.email, req.body.data_admissao,  req.body.ativo,req.params.id],
(error, resultado) => {
conn.release();
if (error) return res.status(500).send({ error });
res.status(202).send({
mensagem: "Funcionário atualizado com sucesso!"
});
}
);
});
});


//# 3. Exportação do Módulo
module.exports = router;
