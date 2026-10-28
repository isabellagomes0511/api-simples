const express = require("express");
const router = express.Router();
const { pool, fail, parseId } = require("./_helpers");

router.get("/", (req, res) => {
    pool.query(
        `SELECT h.*, p.nome AS produto_nome
         FROM historico_precos h
         LEFT JOIN produtos p ON p.id_produto = h.id_produto
         ORDER BY h.vigencia DESC, h.id_historico DESC`,
        (error, rows) => {
            if (error) return fail(res, error);
            return res.status(200).json({ historico_precos: rows });
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
        "SELECT * FROM historico_precos WHERE id_produto = ? ORDER BY vigencia DESC, id_historico DESC",
        [id],
        (error, rows) => {
            if (error) return fail(res, error);
            return res.status(200).json({ historico_precos: rows });
        }
    );
});

module.exports = router;
