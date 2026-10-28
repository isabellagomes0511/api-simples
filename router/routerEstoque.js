const express = require("express");
const router = express.Router();
const { pool, fail, invalid, parseId } = require("./_helpers");

router.get("/", (req, res) => {
    pool.query(
        `SELECT e.*, p.nome AS produto_nome
         FROM estoque e
         JOIN produtos p ON p.id_produto = e.id_produto
         ORDER BY p.nome`,
        (error, rows) => {
            if (error) return fail(res, error);
            return res.status(200).json({ estoque: rows });
        }
    );
});

router.get("/:idProduto", (req, res) => {
    let id;
    try {
        id = parseId(req.params.idProduto);
    } catch (error) {
        return fail(res, error);
    }
    pool.query(
        `SELECT p.id_produto, p.nome AS produto_nome,
                COALESCE(e.quantidade, 0) AS quantidade,
                e.estoque_minimo, e.estoque_maximo, e.localizacao
         FROM produtos p
         LEFT JOIN estoque e ON e.id_produto = p.id_produto
         WHERE p.id_produto = ?`,
        [id],
        (error, rows) => {
            if (error) return fail(res, error);
            if (rows.length === 0) return res.status(404).json({ erro: "Produto não encontrado." });
            return res.status(200).json({ estoque: rows[0] });
        }
    );
});

router.patch("/:idProduto", (req, res) => {
    let id;
    try {
        id = parseId(req.params.idProduto);
    } catch (error) {
        return fail(res, error);
    }
    const body = req.body || {};
    const fields = ["estoque_minimo", "estoque_maximo", "localizacao"]
        .filter((field) => Object.hasOwn(body, field));
    if (fields.length === 0) {
        return fail(res, invalid("Informe estoque_minimo, estoque_maximo ou localizacao."));
    }

    for (const field of ["estoque_minimo", "estoque_maximo"]) {
        if (Object.hasOwn(body, field) && body[field] !== null &&
            (!Number.isInteger(Number(body[field])) || Number(body[field]) < 0)) {
            return fail(res, invalid(`${field} deve ser um inteiro maior ou igual a zero ou null.`));
        }
    }
    if (Object.hasOwn(body, "localizacao") && body.localizacao !== null &&
        typeof body.localizacao !== "string") {
        return fail(res, invalid("localizacao deve ser texto ou null."));
    }

    pool.query("SELECT id_produto FROM produtos WHERE id_produto = ?", [id], (lookupError, products) => {
        if (lookupError) return fail(res, lookupError);
        if (products.length === 0) return res.status(404).json({ erro: "Produto não encontrado." });

        const columns = ["id_produto", "quantidade", ...fields];
        const values = [id, 0, ...fields.map((field) => body[field])];
        const updates = fields.map((field) => `${field} = VALUES(${field})`).join(", ");
        pool.query(
            `INSERT INTO estoque (${columns.join(", ")})
             VALUES (${columns.map(() => "?").join(", ")})
             ON DUPLICATE KEY UPDATE ${updates}`,
            values,
            (error) => {
                if (error) return fail(res, error);
                return res.status(200).json({ mensagem: "Parâmetros de estoque atualizados." });
            }
        );
    });
});

module.exports = router;
