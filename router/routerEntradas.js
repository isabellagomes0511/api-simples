const express = require("express");
const router = express.Router();
const { pool, query, transaction, fail, invalid, parseId } = require("./_helpers");

router.get("/", (req, res) => {
    pool.query(
        `SELECT e.*, p.nome AS produto_nome, f.nome AS fornecedor_nome
         FROM entradas e
         JOIN produtos p ON p.id_produto = e.id_produto
         JOIN fornecedores f ON f.id_fornecedor = e.id_fornecedor
         ORDER BY e.data_entrada DESC, e.id_entrada DESC`,
        (error, rows) => {
            if (error) return fail(res, error);
            return res.status(200).json({ entradas: rows });
        }
    );
});

router.get("/:id", (req, res) => {
    let id;
    try {
        id = parseId(req.params.id);
    } catch (error) {
        return fail(res, error);
    }
    pool.query("SELECT * FROM entradas WHERE id_entrada = ?", [id], (error, rows) => {
        if (error) return fail(res, error);
        if (rows.length === 0) return res.status(404).json({ erro: "Entrada não encontrada." });
        return res.status(200).json({ entrada: rows[0] });
    });
});

router.post("/", async (req, res) => {
    const body = req.body || {};
    const idProduto = Number(body.id_produto);
    const idFornecedor = Number(body.id_fornecedor);
    const quantidade = Number(body.quantidade);
    const valorUnitario = Number(body.valor_unitario);

    if (![idProduto, idFornecedor].every((id) => Number.isInteger(id) && id > 0) ||
        !Number.isInteger(quantidade) || quantidade <= 0 ||
        !Number.isFinite(valorUnitario) || valorUnitario < 0) {
        return fail(res, invalid("Informe produto, fornecedor, quantidade positiva e valor_unitario válido."));
    }

    try {
        const result = await transaction(async (connection) => {
            const inserted = await query(
                connection,
                `INSERT INTO entradas (id_produto, id_fornecedor, quantidade, valor_unitario, data_entrada, observacao)
                 VALUES (?, ?, ?, ?, COALESCE(?, CURDATE()), ?)`,
                [idProduto, idFornecedor, quantidade, valorUnitario, body.data_entrada || null, body.observacao || null]
            );
            await query(
                connection,
                `INSERT INTO estoque (id_produto, quantidade)
                 VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE quantidade = quantidade + VALUES(quantidade)`,
                [idProduto, quantidade]
            );
            return inserted;
        });
        return res.status(201).json({
            mensagem: "Entrada registrada e estoque atualizado.",
            id_entrada: result.insertId
        });
    } catch (error) {
        return fail(res, error);
    }
});

module.exports = router;
