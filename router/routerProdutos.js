const express = require("express");
const router = express.Router();
const { pool, query, transaction, fail, invalid, parseId } = require("./_helpers");

router.get("/", (req, res) => {
    pool.query(
        "SELECT p.*, c.nome AS categoria_nome FROM produtos p LEFT JOIN categorias c ON c.id_categoria = p.id_categoria",
        (error, rows) => {
            if (error) return fail(res, error);
            return res.status(200).json({ produtos: rows });
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

    pool.query(
        "SELECT p.*, c.nome AS categoria_nome FROM produtos p LEFT JOIN categorias c ON c.id_categoria = p.id_categoria WHERE p.id_produto = ?",
        [id],
        (error, rows) => {
            if (error) return fail(res, error);
            if (rows.length === 0) return res.status(404).json({ erro: "Produto não encontrado." });
            return res.status(200).json({ produto: rows[0] });
        }
    );
});

router.post("/", async (req, res) => {
    const { nome, descricao, preco, imagem_produto, id_categoria = null } = req.body || {};
    if (typeof descricao !== "string" || !descricao.trim() ||
        typeof imagem_produto !== "string" || !imagem_produto.trim()) {
        return fail(res, invalid("Os campos descricao e imagem_produto são obrigatórios."));
    }
    if (preco !== undefined && preco !== null &&
        (!Number.isFinite(Number(preco)) || Number(preco) < 0)) {
        return fail(res, invalid("O preço deve ser um número maior ou igual a zero."));
    }

    try {
        const result = await transaction(async (connection) => {
            const inserted = await query(
                connection,
                "INSERT INTO produtos (nome, descricao, preco, imagem_produto, id_categoria) VALUES (?, ?, ?, ?, ?)",
                [nome || null, descricao.trim(), preco ?? null, imagem_produto.trim(), id_categoria]
            );
            if (preco !== undefined && preco !== null) {
                await query(
                    connection,
                    "INSERT INTO historico_precos (id_produto, preco, vigencia) VALUES (?, ?, CURDATE())",
                    [inserted.insertId, preco]
                );
            }
            return inserted;
        });
        return res.status(201).json({ mensagem: "Produto criado com sucesso.", id_produto: result.insertId });
    } catch (error) {
        return fail(res, error);
    }
});

router.patch("/:id", async (req, res) => {
    let id;
    try {
        id = parseId(req.params.id);
    } catch (error) {
        return fail(res, error);
    }

    const allowed = ["nome", "descricao", "preco", "imagem_produto", "id_categoria"];
    const fields = allowed.filter((field) => Object.hasOwn(req.body || {}, field));
    if (fields.length === 0) return fail(res, invalid("Informe ao menos um campo válido para atualizar."));

    if (fields.includes("preco") && req.body.preco !== null &&
        (!Number.isFinite(Number(req.body.preco)) || Number(req.body.preco) < 0)) {
        return fail(res, invalid("O preço deve ser um número maior ou igual a zero."));
    }

    try {
        const changed = await transaction(async (connection) => {
            const products = await query(connection, "SELECT preco FROM produtos WHERE id_produto = ? FOR UPDATE", [id]);
            if (products.length === 0) {
                const error = new Error("Produto não encontrado.");
                error.status = 404;
                throw error;
            }

            const assignments = fields.map((field) => `${field} = ?`).join(", ");
            const values = fields.map((field) => req.body[field]);
            values.push(id);
            await query(connection, `UPDATE produtos SET ${assignments} WHERE id_produto = ?`, values);

            if (fields.includes("preco") && req.body.preco !== null &&
                Number(products[0].preco) !== Number(req.body.preco)) {
                await query(
                    connection,
                    "INSERT INTO historico_precos (id_produto, preco, vigencia) VALUES (?, ?, CURDATE())",
                    [id, req.body.preco]
                );
            }
            return true;
        });
        return res.status(200).json({ mensagem: "Produto atualizado com sucesso.", atualizado: changed });
    } catch (error) {
        return fail(res, error);
    }
});

router.delete("/:id", (req, res) => {
    let id;
    try {
        id = parseId(req.params.id);
    } catch (error) {
        return fail(res, error);
    }

    pool.query("DELETE FROM produtos WHERE id_produto = ?", [id], (error, result) => {
        if (error) return fail(res, error);
        if (result.affectedRows === 0) return res.status(404).json({ erro: "Produto não encontrado." });
        return res.status(204).end();
    });
});

module.exports = router;
