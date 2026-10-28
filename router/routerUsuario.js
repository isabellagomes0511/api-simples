const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const { pool, fail, invalid, parseId } = require("./_helpers");

const publicColumns = "id_usu, nome, email, contato, genero, ativo, criado_em, atualizado_em";

function validateUser(body, partial = false) {
    const fields = ["nome", "email", "senha", "contato", "genero", "ativo"];
    const provided = fields.filter((field) => Object.hasOwn(body, field));
    if (partial && provided.length === 0) {
        throw invalid("Informe ao menos um campo válido para atualizar.");
    }

    if (!partial && (!body.nome || !body.email || !body.senha)) {
        throw invalid("nome, email e senha são obrigatórios.");
    }
    if (Object.hasOwn(body, "nome") &&
        (typeof body.nome !== "string" || body.nome.trim() === "")) {
        throw invalid("nome deve ser um texto não vazio.");
    }
    if (Object.hasOwn(body, "email") &&
        (typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))) {
        throw invalid("Informe um email válido.");
    }
    if (Object.hasOwn(body, "senha") &&
        (typeof body.senha !== "string" || body.senha.length < 8)) {
        throw invalid("A senha deve ter pelo menos 8 caracteres.");
    }
    if (Object.hasOwn(body, "ativo") && ![0, 1, false, true].includes(body.ativo)) {
        throw invalid("ativo deve ser 0 ou 1.");
    }
    return provided;
}

router.post("/login", (req, res) => {
    const body = req.body || {};
    if (typeof body.email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) ||
        typeof body.senha !== "string" ||
        body.senha.length === 0) {
        return fail(res, invalid("Informe um email válido e uma senha."));
    }

    pool.query(
        `SELECT ${publicColumns}, senha_hash FROM usuarios WHERE email = ? LIMIT 1`,
        [body.email.trim()],
        async (error, rows) => {
            if (error) return fail(res, error);

            try {
                const usuario = rows[0];
                if (!usuario || Number(usuario.ativo) !== 1) {
                    return res.status(401).json({ erro: "Email ou senha inválidos." });
                }

                const senhaLegada = !usuario.senha_hash.startsWith("$2");
                const senhaValida = senhaLegada
                    ? usuario.senha_hash === body.senha
                    : await bcrypt.compare(body.senha, usuario.senha_hash);
                if (!senhaValida) {
                    return res.status(401).json({ erro: "Email ou senha inválidos." });
                }

                if (senhaLegada) {
                    const senhaHash = await bcrypt.hash(body.senha, 12);
                    await new Promise((resolve, reject) => {
                        pool.query(
                            "UPDATE usuarios SET senha_hash = ? WHERE id_usu = ?",
                            [senhaHash, usuario.id_usu],
                            (updateError) => updateError ? reject(updateError) : resolve()
                        );
                    });
                }

                delete usuario.senha_hash;
                return res.status(200).json({
                    mensagem: "Login realizado com sucesso.",
                    usuario
                });
            } catch (loginError) {
                return fail(res, loginError);
            }
        }
    );
});

router.get("/", (req, res) => {
    pool.query(`SELECT ${publicColumns} FROM usuarios`, (error, rows) => {
        if (error) return fail(res, error);
        return res.status(200).json({ usuarios: rows });
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
        `SELECT ${publicColumns} FROM usuarios WHERE id_usu = ?`,
        [id],
        (error, rows) => {
            if (error) return fail(res, error);
            if (rows.length === 0) return res.status(404).json({ erro: "Usuário não encontrado." });
            return res.status(200).json({ usuario: rows[0] });
        }
    );
});

router.post("/", async (req, res) => {
    const body = req.body || {};
    try {
        validateUser(body);
        const senhaHash = await bcrypt.hash(body.senha, 12);
        pool.query(
            `INSERT INTO usuarios (nome, email, senha_hash, contato, genero, ativo)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                body.nome.trim(),
                body.email.trim(),
                senhaHash,
                body.contato ?? null,
                body.genero ?? null,
                body.ativo ?? 1
            ],
            (error, result) => {
                if (error) return fail(res, error);
                return res.status(201).json({
                    mensagem: "Usuário criado com sucesso.",
                    id_usuario: result.insertId
                });
            }
        );
    } catch (error) {
        return fail(res, error);
    }
});

router.patch("/:id", async (req, res) => {
    let id;
    let fields;
    const body = req.body || {};
    try {
        id = parseId(req.params.id);
        fields = validateUser(body, true);
    } catch (error) {
        return fail(res, error);
    }

    try {
        const values = [];
        const assignments = [];
        for (const field of fields) {
            const column = field === "senha" ? "senha_hash" : field;
            assignments.push(`${column} = ?`);
            values.push(field === "senha" ? await bcrypt.hash(body.senha, 12) :
                (field === "nome" || field === "email") && typeof body[field] === "string"
                    ? body[field].trim()
                    : body[field]);
        }
        values.push(id);
        pool.query(
            `UPDATE usuarios SET ${assignments.join(", ")} WHERE id_usu = ?`,
            values,
            (error, result) => {
                if (error) return fail(res, error);
                if (result.affectedRows === 0) {
                    return pool.query(
                        "SELECT id_usu FROM usuarios WHERE id_usu = ?",
                        [id],
                        (lookupError, rows) => {
                            if (lookupError) return fail(res, lookupError);
                            if (rows.length === 0) {
                                return res.status(404).json({ erro: "Usuário não encontrado." });
                            }
                            return res.status(200).json({ mensagem: "Nenhuma alteração necessária." });
                        }
                    );
                }
                return res.status(200).json({ mensagem: "Usuário atualizado com sucesso." });
            }
        );
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
    pool.query("UPDATE usuarios SET ativo = 0 WHERE id_usu = ?", [id], (error, result) => {
        if (error) return fail(res, error);
        if (result.affectedRows === 0) {
            return pool.query(
                "SELECT id_usu FROM usuarios WHERE id_usu = ?",
                [id],
                (lookupError, rows) => {
                    if (lookupError) return fail(res, lookupError);
                    if (rows.length === 0) return res.status(404).json({ erro: "Usuário não encontrado." });
                    return res.status(200).json({ mensagem: "Usuário já estava desativado." });
                }
            );
        }
        return res.status(200).json({ mensagem: "Usuário desativado com sucesso." });
    });
});

module.exports = router;
