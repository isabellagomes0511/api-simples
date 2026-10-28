const express = require("express");
const router = express.Router();
const { pool, fail, invalid, parseId } = require("./_helpers");

const fields = ["nome", "cargo", "salario", "telefone", "email", "data_admissao", "ativo"];

function validateEmployee(body, partial = false) {
    const provided = fields.filter((field) => Object.hasOwn(body, field));
    if (partial && provided.length === 0) {
        throw invalid("Informe ao menos um campo válido para atualizar.");
    }
    if (!partial && (!body.nome || !body.cargo || body.salario === undefined)) {
        throw invalid("nome, cargo e salario são obrigatórios.");
    }
    if (Object.hasOwn(body, "nome") &&
        (typeof body.nome !== "string" || body.nome.trim() === "")) {
        throw invalid("nome deve ser um texto não vazio.");
    }
    if (Object.hasOwn(body, "cargo") &&
        (typeof body.cargo !== "string" || body.cargo.trim() === "")) {
        throw invalid("cargo deve ser um texto não vazio.");
    }
    if (Object.hasOwn(body, "salario") &&
        (!Number.isFinite(Number(body.salario)) || Number(body.salario) < 0)) {
        throw invalid("salario deve ser um número maior ou igual a zero.");
    }
    if (Object.hasOwn(body, "ativo") && ![0, 1, false, true].includes(body.ativo)) {
        throw invalid("ativo deve ser 0 ou 1.");
    }
    return provided;
}

router.get("/", (req, res) => {
    pool.query("SELECT * FROM funcionarios ORDER BY nome", (error, rows) => {
        if (error) return fail(res, error);
        return res.status(200).json({ funcionarios: rows });
    });
});

router.get("/:id", (req, res) => {
    let id;
    try {
        id = parseId(req.params.id);
    } catch (error) {
        return fail(res, error);
    }
    pool.query(
        "SELECT * FROM funcionarios WHERE id_funcionario = ?",
        [id],
        (error, rows) => {
            if (error) return fail(res, error);
            if (rows.length === 0) return res.status(404).json({ erro: "Funcionário não encontrado." });
            return res.status(200).json({ funcionario: rows[0] });
        }
    );
});

router.post("/", (req, res) => {
    const body = req.body || {};
    let provided;
    try {
        provided = validateEmployee(body);
    } catch (error) {
        return fail(res, error);
    }
    const columns = provided.join(", ");
    const placeholders = provided.map(() => "?").join(", ");
    const values = provided.map((field) =>
        field === "nome" || field === "cargo" ? body[field].trim() : body[field]
    );
    pool.query(
        `INSERT INTO funcionarios (${columns}) VALUES (${placeholders})`,
        values,
        (error, result) => {
            if (error) return fail(res, error);
            return res.status(201).json({
                mensagem: "Funcionário criado com sucesso.",
                id_funcionario: result.insertId
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
        provided = validateEmployee(body, true);
    } catch (error) {
        return fail(res, error);
    }

    const assignments = provided.map((field) => `${field} = ?`).join(", ");
    const values = provided.map((field) =>
        field === "nome" || field === "cargo" ? body[field].trim() : body[field]
    );
    values.push(id);
    pool.query(
        `UPDATE funcionarios SET ${assignments} WHERE id_funcionario = ?`,
        values,
        (error, result) => {
            if (error) return fail(res, error);
            if (result.affectedRows === 0) {
                return pool.query(
                    "SELECT id_funcionario FROM funcionarios WHERE id_funcionario = ?",
                    [id],
                    (lookupError, rows) => {
                        if (lookupError) return fail(res, lookupError);
                        if (rows.length === 0) {
                            return res.status(404).json({ erro: "Funcionário não encontrado." });
                        }
                        return res.status(200).json({ mensagem: "Nenhuma alteração necessária." });
                    }
                );
            }
            return res.status(200).json({ mensagem: "Funcionário atualizado com sucesso." });
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
    pool.query(
        "UPDATE funcionarios SET ativo = 0 WHERE id_funcionario = ?",
        [id],
        (error, result) => {
            if (error) return fail(res, error);
            if (result.affectedRows === 0) {
                return pool.query(
                    "SELECT id_funcionario FROM funcionarios WHERE id_funcionario = ?",
                    [id],
                    (lookupError, rows) => {
                        if (lookupError) return fail(res, lookupError);
                        if (rows.length === 0) {
                            return res.status(404).json({ erro: "Funcionário não encontrado." });
                        }
                        return res.status(200).json({ mensagem: "Funcionário já estava desativado." });
                    }
                );
            }
            return res.status(200).json({ mensagem: "Funcionário desativado com sucesso." });
        }
    );
});

module.exports = router;
