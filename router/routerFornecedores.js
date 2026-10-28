const express = require("express");
const router = express.Router();
const { pool, fail, invalid, parseId } = require("./_helpers");

const fields = ["nome", "empresa", "email", "telefone", "cidade", "estado", "ativo"];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateSupplier(body, partial = false) {
    const provided = fields.filter((field) => Object.hasOwn(body, field));
    if (partial && provided.length === 0) {
        throw invalid("Informe ao menos um campo válido para atualizar.");
    }
    if (!partial && !body.nome) {
        throw invalid("nome é obrigatório.");
    }
    if (Object.hasOwn(body, "nome") &&
        (typeof body.nome !== "string" || body.nome.trim() === "")) {
        throw invalid("nome deve ser um texto não vazio.");
    }
    if (Object.hasOwn(body, "email") &&
        body.email !== null &&
        (typeof body.email !== "string" || !emailPattern.test(body.email))) {
        throw invalid("Informe um email válido ou null.");
    }
    for (const field of ["empresa", "telefone", "cidade", "estado"]) {
        if (Object.hasOwn(body, field) && body[field] !== null && typeof body[field] !== "string") {
            throw invalid(`${field} deve ser um texto ou null.`);
        }
    }
    if (Object.hasOwn(body, "ativo") && ![0, 1, false, true].includes(body.ativo)) {
        throw invalid("ativo deve ser 0 ou 1.");
    }
    return provided;
}

router.get("/", (req, res) => {
    pool.query("SELECT * FROM fornecedores ORDER BY nome", (error, rows) => {
        if (error) return fail(res, error);
        return res.status(200).json({ fornecedores: rows });
    });
});

router.get("/:id", (req, res) => {
    let id;
    try {
        id = parseId(req.params.id);
    } catch (error) {
        return fail(res, error);
    }

    pool.query("SELECT * FROM fornecedores WHERE id_fornecedor = ?", [id], (error, rows) => {
        if (error) return fail(res, error);
        if (rows.length === 0) return res.status(404).json({ erro: "Fornecedor não encontrado." });
        return res.status(200).json({ fornecedor: rows[0] });
    });
});

router.post("/", (req, res) => {
    const body = req.body || {};
    let provided;
    try {
        provided = validateSupplier(body);
    } catch (error) {
        return fail(res, error);
    }

    const columns = provided.join(", ");
    const placeholders = provided.map(() => "?").join(", ");
    const values = provided.map((field) =>
        field === "nome" && typeof body[field] === "string" ? body[field].trim() :
            field === "email" && typeof body[field] === "string" ? body[field].trim() :
                body[field]
    );
    pool.query(
        `INSERT INTO fornecedores (${columns}) VALUES (${placeholders})`,
        values,
        (error, result) => {
            if (error) return fail(res, error);
            return res.status(201).json({
                mensagem: "Fornecedor criado com sucesso.",
                id_fornecedor: result.insertId
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
        provided = validateSupplier(body, true);
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
        `UPDATE fornecedores SET ${assignments} WHERE id_fornecedor = ?`,
        values,
        (error, result) => {
            if (error) return fail(res, error);
            if (result.affectedRows === 0) {
                return pool.query(
                    "SELECT id_fornecedor FROM fornecedores WHERE id_fornecedor = ?",
                    [id],
                    (lookupError, rows) => {
                        if (lookupError) return fail(res, lookupError);
                        if (rows.length === 0) {
                            return res.status(404).json({ erro: "Fornecedor não encontrado." });
                        }
                        return res.status(200).json({ mensagem: "Nenhuma alteração necessária." });
                    }
                );
            }
            return res.status(200).json({ mensagem: "Fornecedor atualizado com sucesso." });
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

    pool.query("UPDATE fornecedores SET ativo = 0 WHERE id_fornecedor = ?", [id], (error, result) => {
        if (error) return fail(res, error);
        if (result.affectedRows === 0) {
            return pool.query(
                "SELECT id_fornecedor FROM fornecedores WHERE id_fornecedor = ?",
                [id],
                (lookupError, rows) => {
                    if (lookupError) return fail(res, lookupError);
                    if (rows.length === 0) return res.status(404).json({ erro: "Fornecedor não encontrado." });
                    return res.status(200).json({ mensagem: "Fornecedor já estava desativado." });
                }
            );
        }
        return res.status(200).json({ mensagem: "Fornecedor desativado com sucesso." });
    });
});

module.exports = router;
