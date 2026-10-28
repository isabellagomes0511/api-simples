const express = require("express");
const router = express.Router();
const { pool, fail, invalid, parseId } = require("./_helpers");

const fields = ["nome", "email", "contato", "ativo"];

function validateClient(body, partial = false) {
    const provided = fields.filter((field) => Object.hasOwn(body, field));
    if (partial && provided.length === 0) {
        throw invalid("Informe ao menos um campo válido para atualizar.");
    }
    if (!partial && (!body.nome || !body.email)) {
        throw invalid("nome e email são obrigatórios.");
    }
    if (Object.hasOwn(body, "nome") &&
        (typeof body.nome !== "string" || body.nome.trim() === "")) {
        throw invalid("nome deve ser um texto não vazio.");
    }
    if (Object.hasOwn(body, "email") &&
        (typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))) {
        throw invalid("Informe um email válido.");
    }
    if (Object.hasOwn(body, "contato") && body.contato !== null && typeof body.contato !== "string") {
        throw invalid("contato deve ser um texto ou null.");
    }
    if (Object.hasOwn(body, "ativo") && ![0, 1, false, true].includes(body.ativo)) {
        throw invalid("ativo deve ser 0 ou 1.");
    }
    return provided;
}

router.get("/", (req, res) => {
    pool.query("SELECT * FROM clientes ORDER BY nome", (error, rows) => {
        if (error) return fail(res, error);
        return res.status(200).json({ clientes: rows });
    });
});

router.get("/:id", (req, res) => {
    let id;
    try {
        id = parseId(req.params.id);
    } catch (error) {
        return fail(res, error);
    }

    pool.query("SELECT * FROM clientes WHERE id_cliente = ?", [id], (error, rows) => {
        if (error) return fail(res, error);
        if (rows.length === 0) return res.status(404).json({ erro: "Cliente não encontrado." });
        return res.status(200).json({ cliente: rows[0] });
    });
});

router.post("/", (req, res) => {
    const body = req.body || {};
    let provided;
    try {
        provided = validateClient(body);
    } catch (error) {
        return fail(res, error);
    }

    const columns = provided.join(", ");
    const placeholders = provided.map(() => "?").join(", ");
    const values = provided.map((field) =>
        (field === "nome" || field === "email") && typeof body[field] === "string"
            ? body[field].trim()
            : body[field]
    );
    pool.query(
        `INSERT INTO clientes (${columns}) VALUES (${placeholders})`,
        values,
        (error, result) => {
            if (error) return fail(res, error);
            return res.status(201).json({
                mensagem: "Cliente criado com sucesso.",
                id_cliente: result.insertId
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
        provided = validateClient(body, true);
    } catch (error) {
        return fail(res, error);
    }

    const assignments = provided.map((field) => `${field} = ?`).join(", ");
    const values = provided.map((field) =>
        (field === "nome" || field === "email") && typeof body[field] === "string"
            ? body[field].trim()
            : body[field]
    );
    values.push(id);
    pool.query(
        `UPDATE clientes SET ${assignments} WHERE id_cliente = ?`,
        values,
        (error, result) => {
            if (error) return fail(res, error);
            if (result.affectedRows === 0) {
                return pool.query(
                    "SELECT id_cliente FROM clientes WHERE id_cliente = ?",
                    [id],
                    (lookupError, rows) => {
                        if (lookupError) return fail(res, lookupError);
                        if (rows.length === 0) {
                            return res.status(404).json({ erro: "Cliente não encontrado." });
                        }
                        return res.status(200).json({ mensagem: "Nenhuma alteração necessária." });
                    }
                );
            }
            return res.status(200).json({ mensagem: "Cliente atualizado com sucesso." });
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

    pool.query("UPDATE clientes SET ativo = 0 WHERE id_cliente = ?", [id], (error, result) => {
        if (error) return fail(res, error);
        if (result.affectedRows === 0) {
            return pool.query(
                "SELECT id_cliente FROM clientes WHERE id_cliente = ?",
                [id],
                (lookupError, rows) => {
                    if (lookupError) return fail(res, lookupError);
                    if (rows.length === 0) return res.status(404).json({ erro: "Cliente não encontrado." });
                    return res.status(200).json({ mensagem: "Cliente já estava desativado." });
                }
            );
        }
        return res.status(200).json({ mensagem: "Cliente desativado com sucesso." });
    });
});

module.exports = router;
