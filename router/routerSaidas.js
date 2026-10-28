const express = require("express");
const router = express.Router();
const { pool, query, transaction, fail, invalid, parseId } = require("./_helpers");

router.get("/", (req, res) => {
    pool.query(
        `SELECT s.*, p.nome AS produto_nome, f.nome AS funcionario_nome
         FROM saidas s
         JOIN produtos p ON p.id_produto = s.id_produto
         JOIN funcionarios f ON f.id_funcionario = s.id_funcionario
         ORDER BY s.data_saida DESC, s.id_saida DESC`,
        (error, rows) => {
            if (error) return fail(res, error);
            return res.status(200).json({ saidas: rows });
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
    pool.query("SELECT * FROM saidas WHERE id_saida = ?", [id], (error, rows) => {
        if (error) return fail(res, error);
        if (rows.length === 0) return res.status(404).json({ erro: "Saída não encontrada." });
        return res.status(200).json({ saida: rows[0] });
    });
});

router.post("/", async (req, res) => {
    const body = req.body || {};
    const idProduto = Number(body.id_produto);
    const idFuncionario = Number(body.id_funcionario);
    const quantidade = Number(body.quantidade);
    const valorUnitario = Number(body.valor_unitario);

    if (![idProduto, idFuncionario].every((id) => Number.isInteger(id) && id > 0) ||
        !Number.isInteger(quantidade) || quantidade <= 0 ||
        !Number.isFinite(valorUnitario) || valorUnitario < 0) {
        return fail(res, invalid("Informe produto, funcionário, quantidade positiva e valor_unitario válido."));
    }

    try {
        const result = await transaction(async (connection) => {
            const products = await query(connection, "SELECT id_produto FROM produtos WHERE id_produto = ?", [idProduto]);
            if (products.length === 0) {
                const error = new Error("Produto não encontrado.");
                error.status = 404;
                throw error;
            }
            const employees = await query(
                connection,
                "SELECT id_funcionario FROM funcionarios WHERE id_funcionario = ?",
                [idFuncionario]
            );
            if (employees.length === 0) {
                const error = new Error("Funcionário não encontrado.");
                error.status = 404;
                throw error;
            }
            await query(
                connection,
                "INSERT INTO estoque (id_produto, quantidade) VALUES (?, 0) ON DUPLICATE KEY UPDATE id_produto = VALUES(id_produto)",
                [idProduto]
            );
            const stock = await query(
                connection,
                "SELECT quantidade FROM estoque WHERE id_produto = ? FOR UPDATE",
                [idProduto]
            );
            if (stock.length === 0) {
                const error = new Error("Produto não encontrado.");
                error.status = 404;
                throw error;
            }
            if (stock[0].quantidade < quantidade) {
                const error = new Error("Estoque insuficiente para registrar a saída.");
                error.status = 409;
                throw error;
            }

            const inserted = await query(
                connection,
                `INSERT INTO saidas (id_produto, id_funcionario, quantidade, valor_unitario, data_saida, destino)
                 VALUES (?, ?, ?, ?, COALESCE(?, CURDATE()), ?)`,
                [
                    idProduto,
                    idFuncionario,
                    quantidade,
                    valorUnitario,
                    body.data_saida || null,
                    body.destino || null
                ]
            );
            return inserted;
        });
        return res.status(201).json({
            mensagem: "Saída registrada e estoque atualizado.",
            id_saida: result.insertId
        });
    } catch (error) {
        return fail(res, error);
    }
});

module.exports = router;
