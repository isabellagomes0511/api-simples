const express = require('express');
const router = express.Router();
const mysql = require("../mysql").pool;

//Listar Usuários
router.get('/', (req, res) => {
mysql.getConnection((error, conn) => {
if (error) return res.status(500).send({ error });
conn.query("SELECT * FROM usuarios", (error, resultado) => {
conn.release();
if (error) return res.status(500).send({ error });
res.status(200).send({ usuario: resultado });
});
});
});


// BUSCAR USUÁRIO POR ID
router.get('/:id', (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) return res.status(500).send({ error: error });
        conn.query("SELECT * FROM usuarios WHERE id_usu = ?", [req.params.id], (error, resultado) => {
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
"INSERT INTO usuarios (nome, email, senha_hash, contato, genero, ativo) VALUES (?, ?, ?, ?, ?, ?)",
[req.body.nome, req.body.email, req.body.senha, req.body.contato, req.body.genero, req.body.atovo],
(error, resultado) => {
    console.log(error)
conn.release();
if (error) return res.status(500).send({ error });
res.status(201).send({
mensagem: "Usuário criado com sucesso!",
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
"UPDATE usuario SET nome = ?, email = ?, senha_hash = ? WHERE id = ?",
[req.body.nome, req.body.email, req.body.senha, req.params.id],
(error, resultado) => {
conn.release();
if (error) return res.status(500).send({ error });
res.status(202).send({
mensagem: "Usuário atualizado com sucesso!"
});
}
);
});
});


//# 3. Exportação do Módulo
module.exports = router;
