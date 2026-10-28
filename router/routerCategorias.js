const express = require("express");
const router = express.Router();
const { pool, fail, invalid, parseId } = require("./_helpers");

const fields = ["nome", "descricao", "ativo"];

function validateCategory(body, partial = false) {
    const provided = fields.filter((field) => Object.hasOwn(body, field));
    if (partial && provided.length === 0) {
        throw invalid("Informe ao menos um campo válido para atualizar.");
    }
    if (!partial && !body.nome) {
        throw invalid("nome é obrigatório.");
    }
    for (const field of ["nome", "descricao"]) {
        if (Object.hasOwn(body, field) &&
            body[field] !== null &&
            (typeof body[field] !== "string" || (field === "nome" && body[field].trim() === ""))) {
            throw invalid(`${field} deve ser um texto${field === "nome" ? " não vazio" : " ou null"}.`);
        }
    }
    if (Object.hasOwn(body, "ativo") && ![0, 1, false, true].includes(body.ativo)) {
        throw invalid("ativo deve ser 0 ou 1.");
    }
    return provided;
}

router.get("/", (req, res) => {
    pool.query("SELECT * FROM categorias ORDER BY nome", (error, rows) => {
        if (error) return fail(res, error);
        return res.status(200).json({ categorias: rows });
    });
});

router.get("/:id", (req, res) => {
    let id;
    try {
        id = parseId(req.params.id);
    } catch (error) {
        return fail(res, error);
    }

    pool.query("SELECT * FROM categorias WHERE id_categoria = ?", [id], (error, rows) => {
        if (error) return fail(res, error);
        if (rows.length === 0) return res.status(404).json({ erro: "Categoria não encontrada." });
        return res.status(200).json({ categoria: rows[0] });
    });
});

router.post("/", (req, res) => {
    const body = req.body || {};
    let provided;
    try {
        provided = validateCategory(body);
    } catch (error) {
        return fail(res, error);
    }

    const columns = provided.join(", ");
    const placeholders = provided.map(() => "?").join(", ");
    const values = provided.map((field) =>
        field === "nome" && typeof body[field] === "string" ? body[field].trim() : body[field]
    );
    pool.query(
        `INSERT INTO categorias (${columns}) VALUES (${placeholders})`,
        values,
        (error, result) => {
            if (error) return fail(res, error);
            return res.status(201).json({
                mensagem: "Categoria criada com sucesso.",
                id_categoria: result.insertId
            });
        }
    );
});

router.patch("/:id", (req, res) => {
    let id;
    let provided;
    const body = req.body || {};
    try {
        id = parseId(req.params.id);
        provided = validateCategory(body, true);
    } catch (error) {
        return fail(res, error);
    }

    const assignments = provided.map((field) => `${field} = ?`).join(", ");
    const values = provided.map((field) =>
        field === "nome" && typeof body[field] === "string" ? body[field].trim() : body[field]
    );
    values.push(id);
    pool.query(
        `UPDATE categorias SET ${assignments} WHERE id_categoria = ?`,
        values,
        (error, result) => {
            if (error) return fail(res, error);
            if (result.affectedRows === 0) {
                return pool.query(
                    "SELECT id_categoria FROM categorias WHERE id_categoria = ?",
                    [id],
                    (lookupError, rows) => {
                        if (lookupError) return fail(res, lookupError);
                        if (rows.length === 0) {
                            return res.status(404).json({ erro: "Categoria não encontrada." });
                        }
                        return res.status(200).json({ mensagem: "Nenhuma alteração necessária." });
                    }
                );
            }
            return res.status(200).json({ mensagem: "Categoria atualizada com sucesso." });
        }
    );
});

router.delete("/:id", (req, res) => {
    let id;
    try {
        id = parseId(req.params.id);
    } catch (error) {
        return fail(res, error);
    }

    pool.query("UPDATE categorias SET ativo = 0 WHERE id_categoria = ?", [id], (error, result) => {
        if (error) return fail(res, error);
        if (result.affectedRows === 0) {
            return pool.query(
                "SELECT id_categoria FROM categorias WHERE id_categoria = ?",
                [id],
                (lookupError, rows) => {
                    if (lookupError) return fail(res, lookupError);
                    if (rows.length === 0) return res.status(404).json({ erro: "Categoria não encontrada." });
                    return res.status(200).json({ mensagem: "Categoria já estava desativada." });
                }
            );
        }
        return res.status(200).json({ mensagem: "Categoria desativada com sucesso." });
    });
});

module.exports = router;
