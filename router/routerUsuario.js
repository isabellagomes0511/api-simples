const express = require("express");
const bcrypt = require("bcryptjs");
const { randomBytes } = require("node:crypto");
const { rateLimit } = require("express-rate-limit");
const router = express.Router();
const { pool, fail, invalid, parseId } = require("./_helpers");
const { authenticate, issueToken, requireRole, tokenLifetimeSeconds } = require("../auth");

const publicColumns = "id_usu, nome, email, contato, genero, role, ativo, criado_em, atualizado_em";
const dummyPasswordHash = bcrypt.hashSync(randomBytes(32).toString("base64"), 12);
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { erro: "Muitas tentativas de login. Tente novamente mais tarde." }
});

function validateUser(body, partial = false) {
    const fields = ["nome", "email", "senha", "contato", "genero", "ativo", "role"];
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
        (typeof body.senha !== "string" || Buffer.byteLength(body.senha, "utf8") < 12 ||
            Buffer.byteLength(body.senha, "utf8") > 72)) {
        throw invalid("A senha deve conter entre 12 e 72 bytes.");
    }
    if (Object.hasOwn(body, "ativo") && ![0, 1, false, true].includes(body.ativo)) {
        throw invalid("ativo deve ser 0 ou 1.");
    }
    if (Object.hasOwn(body, "role") && !["admin", "operador"].includes(body.role)) {
        throw invalid("role deve ser admin ou operador.");
    }
    return provided;
}

router.post("/login", loginLimiter, (req, res) => {
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
                const hashValido = Boolean(usuario) && typeof usuario.senha_hash === "string" &&
                    /^\$2[aby]\$\d{2}\$/.test(usuario.senha_hash);
                const hashParaComparar = hashValido
                    ? usuario.senha_hash.replace(/^\$2y\$/, "$2b$")
                    : dummyPasswordHash;
                const senhaValida = await bcrypt.compare(body.senha, hashParaComparar);
                if (!usuario || Number(usuario.ativo) !== 1 || !hashValido || !senhaValida) {
                    return res.status(401).json({ erro: "Email ou senha inválidos." });
                }

                delete usuario.senha_hash;
                res.set("Cache-Control", "no-store");
                return res.status(200).json({
                    mensagem: "Login realizado com sucesso.",
                    usuario,
                    access_token: issueToken(usuario),
                    token_type: "Bearer",
                    expires_in: tokenLifetimeSeconds
                });
            } catch (loginError) {
                return fail(res, loginError);
            }
        }
    );
});

router.use(authenticate, requireRole("admin"));

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
            `INSERT INTO usuarios (nome, email, senha_hash, contato, genero, ativo, role)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                body.nome.trim(),
                body.email.trim(),
                senhaHash,
                body.contato ?? null,
                body.genero ?? null,
                body.ativo ?? 1,
                body.role ?? "operador"
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
        if (id === Number(req.auth.id)) {
            if (body.role && body.role !== req.auth.role) {
                throw invalid("Não é permitido alterar o próprio perfil de acesso.");
            }
            if (body.ativo === 0 || body.ativo === false) {
                throw invalid("Não é permitido desativar a própria conta.");
            }
        }
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
        if (id === Number(req.auth.id)) {
            throw invalid("Não é permitido desativar a própria conta.");
        }
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
