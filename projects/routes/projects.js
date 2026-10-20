
var express = require("express");
var router = express.Router();
const axios = require("axios");
const sharp = require("sharp");

const multer = require("multer");
const FormData = require("form-data");

const fs = require("fs");
const fs_extra = require("fs-extra");
const path = require("path");
const mime = require("mime-types");

const JSZip = require("jszip");

const { v4: uuidv4 } = require('uuid');

const {
  send_msg_tool,
  send_msg_client,
  send_msg_client_error,
  send_msg_client_preview,
  send_msg_client_preview_error,
  read_msg,
  send_msg_project_op,   
} = require("../utils/project_msg");

const Project = require("../controllers/project");
const Process = require("../controllers/process");
const Result = require("../controllers/result");
const Preview = require("../controllers/preview");
const jwt = require("jsonwebtoken");
const { getCallerId } = require("../utils/caller");
const { ensureEditorSlot, releaseEditorSlot } = require("../utils/presence");
const { extractImageFeatures } = require("../utils/imageFeatures");
const PreviewCache = require("../controllers/previewCache");
const { makePreviewCacheKey, makeToolsFingerprint } = require("../utils/cacheKey");

const {
  get_image_internal_url,
  get_image_public_url,
  post_image,
  delete_image,
  copy_image,
} = require("../utils/imageStorage");

const {
  checkSharePermission,
  requireEditPermission
} = require("../middleware/shareAuth");

const { requireProjectVersion } = require("../middleware/projectVersion");

const storage = multer.memoryStorage();
var upload = multer({ storage: storage });

const key = fs.readFileSync(__dirname + "/../certs/selfsigned.key");
const cert = fs.readFileSync(__dirname + "/../certs/selfsigned.crt");

const https = require("https");
const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // (NOTE: this will disable client verification)
  cert: cert,
  key: key,
});

const users_ms = "https://users:10001/";

const enforcePresenceLimit = require("../middleware/enforcePresenceLimit");

const advanced_tools = [
  "cut_ai",
  "upgrade_ai",
  "bg_remove_ai",
  "text_ai",
  "obj_ai",
  "people_ai",
  "expand_ai",
];

// Conta quantas ferramentas avançadas existem neste projeto (independente de imagens)
function count_advanced_tools(project) {
  const tools = project.tools || [];
  return tools.filter((t) => advanced_tools.includes(t.procedure)).length;
}

function requireOwner(req, res, next) {
  const caller = getCallerId(req);
  if (String(caller) !== String(req.params.user)) {
    return res.status(403).jsonp("Not allowed");
  }
  next();
}

function requireAuth(req, res, next) {
  const caller = getCallerId(req);
  if (!caller) return res.status(401).jsonp("Authentication required");
  next();
}

/**
 * Calcula quantas operações avançadas vão ser usadas *nesta execução*.
 * - totalAdv: nº total de tools avançadas atualmente no projeto
 * - charged: nº de tools avançadas já “pagas” (clamped para nunca ser > totalAdv)
 * - newTools: nº de tools avançadas novas desde a última vez que foram pagas
 * - adv_ops: nº de operações a debitar no users-ms (= newTools * nº de imagens)
 */
function advanced_tool_num(project) {
  const totalAdv = count_advanced_tools(project);
  let charged = project.chargedAdvancedTools || 0;

  // Se o utilizador apagou tools avançadas depois de pagar, 
  // garantimos que charged nunca é maior que o total atual.
  if (charged > totalAdv) charged = totalAdv;

  const newTools = totalAdv - charged;
  const adv_ops = newTools > 0 ? newTools * project.imgs.length : 0;

  return { totalAdv, charged, newTools, adv_ops };
}

function toolsEqual(a, b) {
  const A = Array.isArray(a) ? a.slice() : [];
  const B = Array.isArray(b) ? b.slice() : [];
  if (A.length !== B.length) return false;

  const norm = (t) => ({
    procedure: t.procedure,
    position: t.position,
    params: t.params ?? {},
  });

  // comparar por posição (a tua pipeline é ordenada)
  A.sort((x, y) => (x.position ?? 0) - (y.position ?? 0));
  B.sort((x, y) => (x.position ?? 0) - (y.position ?? 0));

  for (let i = 0; i < A.length; i++) {
    const x = norm(A[i]);
    const y = norm(B[i]);
    if (x.procedure !== y.procedure) return false;
    if ((x.position ?? 0) !== (y.position ?? 0)) return false;

    // comparação estável de params
    if (JSON.stringify(x.params) !== JSON.stringify(y.params)) return false;
  }
  return true;
}


// TODO process message according to type of output
function process_msg() {
  read_msg(async (msg) => {

    const timestamp = new Date().toISOString();
    const user_msg_id = `update-client-process-${uuidv4()}`;

    // variáveis “seguras” para usar no catch
    let runnerIdSafe = null;
    let ownerIdSafe = null;

    try {
      const msg_content = JSON.parse(msg.content.toString());
      const msg_id = msg_content.correlationId;

      const process = await Process.getOneByMsgId(msg_id);
      if (!process) return;

      ownerIdSafe = process.user_id;
      runnerIdSafe = process.runner_id || process.user_id;

       console.log(
        `[T-03][RABBIT] msg=${msg_id} status=${msg_content.status} outType=${msg_content?.output?.type} curPos=${process.cur_pos} key=${(process.cache_key||"").slice(0,8)}`
      );

      const ownerId = process.user_id;
      const runnerId = process.runner_id || process.user_id; 

      const prev_process_input_img = process.og_img_uri;
      const prev_process_output_img = process.new_img_uri;
      
      // Get current process, delete it and create it's sucessor if possible
      const og_img_uri = process.og_img_uri;
      const img_id = process.img_id;
      
      await Process.delete(process.user_id, process.project_id, process._id);
      
      if (msg_content.status === "error") {
        console.log(JSON.stringify(msg_content));
        if (/preview/.test(msg_id)) {
          send_msg_client_preview_error(`update-client-preview-${uuidv4()}`, timestamp, runnerId, msg_content.error.code, msg_content.error.msg)
        }
        
        else {
          send_msg_client_error(
            user_msg_id,
            timestamp,
            runnerId,   
            msg_content.error.code,
            msg_content.error.msg
          );
        }
        return;
      }
      
      const output_file_uri = msg_content.output.imageURI;
      const type = msg_content.output.type;
      const project = await Project.getOne(process.user_id, process.project_id);

      // Guard robusto: se o utilizador cancelou, activeToken muda e ignoramos outputs deste run
      const active = project.activeToken || 0;
      const tok = process.token || 0;

      console.log(
        `[RUN-DEBUG] msg=${msg_id} curPos=${process.cur_pos} processTok=${tok} activeTok=${active}`
      );

      if (active !== tok) {
        console.log(`[RUN-GUARD] IGNORE msg=${msg_id} processTok=${tok} activeTok=${active}`);
        return;
      }

      const next_pos = process.cur_pos + 1;

if (/preview/.test(msg_id) && (type == "text" || next_pos >= project.tools.length)) {
  const file_path = path.join(__dirname, `/../${output_file_uri}`);
  const file_name = path.basename(file_path);
  const fileStream = fs.createReadStream(file_path);

  const data = new FormData();
  await data.append(
    "file",
    fileStream,
    path.basename(file_path),
    mime.lookup(file_path)
  );

  const resp = await post_image(process.user_id, process.project_id, "preview", data);

  const og_key_tmp = resp.data.data.imageKey.split("/");
  const og_key = og_key_tmp[og_key_tmp.length - 1];

  const preview = {
    type: type,
    file_name: file_name,
    img_key: og_key,
    img_id: img_id,
    project_id: process.project_id,
    user_id: process.user_id,
  };

  await Preview.create(preview);

  // considerar "preview final" quando:
  // - a tool devolveu texto (tipicamente o fim), ou quando
  // - chegámos ao fim do pipeline
  if (type == "text" || next_pos >= project.tools.length) {
    const previews = await Preview.getAll(process.user_id, process.project_id);

    // 1) Copiar todos os previews do stage volátil (preview) para o stage persistente (preview_cache)
    let copiedOk = true;
    for (const p of previews) {
      try {
        await copy_image(process.user_id, process.project_id, "preview", "preview_cache", p.img_key);
        const key8 = (process.cache_key || "").slice(0, 8);
        console.log(`[T-03][CACHE-COPY][OK] key=${key8} file=${p.img_key}`);

      } catch (e) {
        copiedOk = false;
          console.error(`[T-03][CACHE-COPY][FAIL] key=${key8} file=${p.img_key} err=${e.message}`);
        // não crash — mas atenção: se falhar, o HIT futuro pode dar 404
      }
    }

    let urls = {
      imageUrl: "",
      textResults: [],
    };

    // Montar URLs atuais (assinadas) a partir das keys
    for (let p of previews) {
      const url_resp = await get_image_public_url(
        process.user_id,
        process.project_id,
        "preview_cache",
        p.img_key
      );

      const url = url_resp.data.url;

      if (p.type != "text") urls.imageUrl = url;
      else urls.textResults.push(url);
    }

    // métricas de duração (se timestamps ativos no Process)
    const startedAt = process.createdAt ? new Date(process.createdAt).getTime() : null;
    const durationMs = startedAt ? (Date.now() - startedAt) : null;

    console.log(
      `[T-03][RABBIT][PREVIEW-DONE] msg=${msg_id} key=${(process.cache_key||"").slice(0,8)} previews=${previews.length} durationMs=${durationMs}`
    );

    // grava cache do preview final (image + texts + duration)
    // (se cache_key não existir por algum motivo, não crashes)
    if (process.cache_key) {
      const imgSha =
        project.imgs.find((i) => String(i._id) === String(process.img_id))?.og_sha256 ?? "";

      const imageKey = previews.find((p) => p.type !== "text")?.img_key ?? "";
      const textKeys = previews.filter((p) => p.type === "text").map((p) => p.img_key);

      await PreviewCache.upsert({
        user_id: process.user_id,
        project_id: process.project_id,
        img_id: process.img_id,
        cache_key: process.cache_key,
        img_sha256: imgSha,
        image_key: imageKey,
        text_keys: textKeys,
        duration_ms: durationMs,
      });

      console.log(
        `[T-03][RABBIT][CACHE-SAVE] key=${process.cache_key.slice(0,8)} imageKey=${imageKey ? imageKey.slice(0,8) : "-"} textKeys=${textKeys.length}`
      );
    }

    // envia preview ao cliente
    send_msg_client_preview(
      `update-client-preview-${uuidv4()}`,
      timestamp,
      runnerId,
      JSON.stringify(urls)
    );
  }
}

      if(/preview/.test(msg_id) && next_pos >= project.tools.length) return;

      if (!/preview/.test(msg_id))
        send_msg_client(
          user_msg_id,
          timestamp,
          runnerId
        );

      if (!/preview/.test(msg_id) && (type == "text" || next_pos >= project.tools.length)) {
        const file_path = path.join(__dirname, `/../${output_file_uri}`);
        const file_name = path.basename(file_path);
        const fileStream = fs.createReadStream(file_path); // Use createReadStream for efficiency

        const data = new FormData();
        await data.append(
          "file",
          fileStream,
          path.basename(file_path),
          mime.lookup(file_path)
        );

        const resp = await post_image(
          process.user_id,
          process.project_id,
          "out",
          data
        );

        const og_key_tmp = resp.data.data.imageKey.split("/");
        const og_key = og_key_tmp[og_key_tmp.length - 1];

        const result = {
          type: type,
          file_name: file_name,
          img_key: og_key,
          img_id: img_id,
          project_id: process.project_id,
          user_id: process.user_id,
          token: process.token || 0, 
        };

        await Result.create(result);
      }

      // Se esta imagem acabou o pipeline, pode ser que a execução tenha terminado
      if (!/preview/.test(msg_id) && (type == "text" || next_pos >= project.tools.length)) {

        // Já eliminei este Process no início: await Process.delete(...)
        // Agora verifica se ainda há processos desta run
        const remaining = await Process.countByProjectAndToken(
          process.project_id,
          process.token || 0
        );

        if (remaining === 0) {
          // re-fetch do projeto (já tens project) mas garante que está fresh
          const freshProject = await Project.getOne(process.user_id, process.project_id);

          // só commita se ainda for a execução ativa (não foi cancelada entretanto)
          if ((freshProject.activeToken || 0) === (process.token || 0)) {
            freshProject.committedToken = process.token || 0;

            //  guardar também resultsToken se ainda uso noutros sítios
            freshProject.resultsToken = freshProject.committedToken;

            const toolsSnapshot = [...(freshProject.tools || [])]
              .sort((a,b) => (a.position ?? 0) - (b.position ?? 0))
              .map(t => ({
                _id: t._id,
                position: t.position,
                procedure: t.procedure,
                params: t.params,
              }));

            await Project.updateRaw(process.user_id, process.project_id, { 
              $set: {
                committedToken: process.token || 0,
                resultsToken: process.token || 0,
                committedTools: toolsSnapshot,
              }
            });

            console.log(`[COMMIT] project=${process.project_id} committedToken=${process.token || 0}`);

          } else {
            console.log(
              `[COMMIT-SKIP] project=${process.project_id} token=${process.token} activeToken=${freshProject.activeToken}`
            );
          }
        }
      }

      if (next_pos >= project.tools.length) return;

      const new_msg_id = /preview/.test(msg_id)
        ? `preview-${uuidv4()}`
        : `request-${uuidv4()}`;

      const tool = project.tools.filter((t) => t.position == next_pos)[0];

      const tool_name = tool.procedure;
      const params = tool.params;

      const read_img = type == "text" ? prev_process_input_img : output_file_uri;
      const output_img = type == "text" ? prev_process_output_img : output_file_uri;

      // o token de cancelamento que vai ser propagado para o successor
      const processToken = process.cancelToken || 0;

      const new_process = {
        user_id: project.user_id,
        runner_id: runnerId,       
        project_id: project._id,
        img_id: img_id,
        msg_id: new_msg_id,
        cur_pos: next_pos,
        og_img_uri: read_img,
        new_img_uri: output_img,
        cancelToken: processToken,
        token: process.token,
      };

      // Making sure database entry is created before sending message to avoid conflicts
      await Process.create(new_process);
      send_msg_tool(
        new_msg_id,
        timestamp,
        new_process.og_img_uri,
        new_process.new_img_uri,
        tool_name,
        params
      );
    } catch (err) {

      console.error("[process_msg] error:", err);

      const target = runnerIdSafe || ownerIdSafe;

      send_msg_client_error(
        user_msg_id,
        timestamp,
        target,
        "30000",
        "An error happened while processing the project"
      );
      return;
    }
  });
}

async function deleteProjectAndResources(userId, projectId) {
  const project = await Project.getOne(userId, projectId);

  // apagar imagens
  const previous_img = JSON.parse(JSON.stringify(project["imgs"]));
  for (let img of previous_img) {
    await delete_image(userId, projectId, "src", img.og_img_key);
    project["imgs"].remove(img);
  }

  // apagar resultados
  const results = await Result.getAll(userId, projectId);
  for (let r of results) {
    await delete_image(userId, projectId, "out", r.img_key);
    await Result.delete(r.user_id, r.project_id, r.img_id);
  }

  // apagar previews
  const previews = await Preview.getAll(userId, projectId);
  for (let p of previews) {
    await delete_image(userId, projectId, "preview", p.img_key);
    await Preview.delete(p.user_id, p.project_id, p.img_id);
  }

  // apagar o próprio projeto
  await Project.delete(userId, projectId);
}

// ================== SHARING / LINKS ==================

// listar links de partilha de um projeto (para o dono)
router.get("/:user/:project/share", requireOwner, async (req, res) => {
  try {
    const project = await Project.getOne(req.params.user, req.params.project);
    if (!project) return res.status(404).jsonp("Project not found");

    const sharedLinks = (project.sharedLinks || []).map((l) => ({
      id: l.id,
      permission: l.permission,
      createdAt: l.createdAt,
      revoked: l.revoked,
    }));

    return res.status(200).jsonp(sharedLinks);
  } catch (err) {
    console.error("Error listing shared links:", err);
    return res.status(500).jsonp("Error listing shared links");
  }
});

// criar um novo link de partilha
router.post("/:user/:project/share", requireOwner, enforcePresenceLimit, requireProjectVersion, async (req, res) => {
  try {
    const permission = req.body.permission === "edit" ? "edit" : "read";

    const newLink = {
      id: uuidv4(),
      permission,
      createdAt: new Date(),
      revoked: false,
    };

    const project = await Project.getOne(req.params.user, req.params.project);
      if (!project) return res.status(404).jsonp("Project not found");

      if (project.dirty) {
        return res.status(409).jsonp({
          message: "Project has unsaved changes",
          code: "UNSAVED_CHANGES",
          serverVersion: project.version ?? null,
        });
      }

    const updated = await Project.addShareLinkIfVersion(
      req.params.user,
      req.params.project,
      newLink,
      req.expectedVersion
    );

    if (!updated) {
      const fresh = await Project.getOne(req.params.user, req.params.project);
      if (!fresh) return res.status(404).jsonp("Project not found");
      return res.status(409).jsonp({
        message: "Project version conflict",
        serverVersion: fresh?.version ?? null,
      });
    }

    res.set("X-Project-Version", String(updated.version));

    const frontendBase = process.env.FRONTEND_BASE_URL || "http://localhost:8080";
    const url = `${frontendBase}/share/${newLink.id}`;

    return res.status(201).jsonp({ ...newLink, url });
  } catch (err) {
    console.error("Error creating shared link:", err);
    return res.status(500).jsonp("Error creating shared link");
  }
});


// resolver um link de partilha (usado por convidados)
router.get("/share/:shareId", async (req, res) => {
  try {
    const project = await Project.getOneByShareId(req.params.shareId);

    if (!project) {
      return res.status(404).jsonp("Share link not found");
    }

    const link = (project.sharedLinks || []).find(
      (l) => l.id === req.params.shareId,
    );

    if (!link) {
      return res.status(404).jsonp("Share link not found");
    }

    if (link.revoked) {
      return res.status(410).jsonp("Share link revoked");
    }

    return res.status(200).jsonp({
      projectId: project._id,
      ownerId: project.user_id,
      permission: link.permission,
      projectName: project.name,

    });
  } catch (err) {
    console.error("Error resolving share link:", err);
    return res.status(500).jsonp("Error resolving share link");
  }
});

// devolver projeto completo (imgs + tools) via shareId, sem precisar do owner
router.get("/share/:shareId/project", requireAuth,async (req, res) => {
  try {
    const project = await Project.getOneByShareId(req.params.shareId);

    if (!project) {
      return res.status(404).jsonp("Share link not found");
    }

    const link = (project.sharedLinks || []).find(
      (l) => l.id === req.params.shareId,
    );

    if (!link) {
      return res.status(404).jsonp("Share link not found");
    }

    if (link.revoked) {
      return res.status(410).jsonp("Share link revoked");
    }

    // estrutura semelhante ao GET "/:user/:project"
    const response = {
      _id: project._id,
      user_id: project.user_id,
      name: project.name,
      tools: project.tools,
      imgs: [],
      permission: link.permission,
      version: project.version, 

    };

    // tentar usar resultados mais recentes
    const committed = project.committedToken || 0;
    const results = await Result.getAllByToken(project.user_id, project._id, committed);
    const imageResults = results.filter((r) => r.type !== "text");

    if (imageResults.length > 0) {
      // usar imagens editadas
      for (const r of imageResults) {
        try {
          const resp = await get_image_public_url(
            r.user_id,
            r.project_id,
            "out",
            r.img_key,
          );
          const url = resp.data.url;

          response.imgs.push({
            _id: r.img_id,
            name: r.file_name,
            url,
          });
        } catch (err) {
          console.error("Error getting result image url for shared project:", err);
          return res.status(500).jsonp("Error getting image url");
        }
      }
    } else {
      // fallback: imagens originais
      for (const img of project.imgs) {
        try {
          const resp = await get_image_public_url(
            project.user_id,
            project._id,
            "src",
            img.og_img_key,
          );
          const url = resp.data.url;

          response.imgs.push({
            _id: img._id,
            name: path.basename(img.og_uri),
            url,
          });
        } catch (err) {
          console.error("Error getting image url for shared project:", err);
          return res.status(500).jsonp("Error getting image url");
        }
      }
    }

    return res.status(200).jsonp(response);
  } catch (err) {
    console.error("Error getting shared project:", err);
    return res.status(500).jsonp("Error getting shared project");
  }
});

// revogar um link de partilha
router.delete("/:user/:project/share/:shareId", requireOwner, enforcePresenceLimit, requireProjectVersion, async (req, res) => {
  try {
    const { user, project, shareId } = req.params;
    const expected = req.expectedVersion;

    //  valida que o link existe no projeto carregado
    const link = req.projectDoc?.sharedLinks?.find((l) => l.id === shareId);
    if (!link) return res.status(404).jsonp("Share link not found");
    if (link.revoked) return res.status(410).jsonp("Share link revoked");

    const updated = await Project.revokeShareLinkIfVersion(user, project, shareId, expected);

    if (!updated) {
      const fresh = await Project.getOne(user, project);
      if (!fresh) return res.status(404).jsonp("Project not found");

      // conflito de versão
      if (fresh.version !== expected) {
        return res.status(409).jsonp({
          message: "Project version conflict",
          serverVersion: fresh.version,
        });
      }

      // mesma versão mas não atualizou -> link não existe / já revogado
      return res.status(404).jsonp("Share link not found");
    }

    res.set("X-Project-Version", String(updated.version));
    return res.sendStatus(204);
  } catch (err) {
    console.error("Error revoking share link:", err);
    return res.status(500).jsonp("Error revoking share link");
  }
});


// ================== FIM SHARING ==================

// Get list of all projects from a user
router.get("/:user", (req, res, next) => {
  Project.getAll(req.params.user)
    .then((projects) => {
      const ans = [];

      for (let p of projects) {
        ans.push({
          _id: p._id,
          name: p.name,
          version: p.version
        });
      }

      res.status(200).jsonp(ans);
    })
    .catch((_) => res.status(500).jsonp("Error acquiring user's projects"));
});

// Get a specific user's project
router.get("/:user/:project", checkSharePermission, async (req, res, next) => {
  try {
    // só conta como “colaborador” se puder editar (dono ou share edit)
    const canEdit = !req.sharedPermission || req.sharedPermission === "edit";

    if (canEdit) {
      const ownerId = req.params.user;
      const projectId = req.params.project;
      console.log("[GET /:user/:project headers]", {
        hasAuth: !!req.headers.authorization,
        authStart: req.headers.authorization?.slice(0, 20),
        caller: getCallerId(req),
      });

      const callerId = getCallerId(req);
      if (!callerId) {
        return res.status(401).jsonp("Authentication required");
      }

      const result = await ensureEditorSlot({ ownerId, projectId, callerId });
      if (!result.ok) {
        return res.status(429).jsonp({
          message: "Too many active editors for this project",
          active: result.active,
          limit: result.limit,
        });
      }
    }

    return next();
  } catch (e) {
    console.error("Presence limit error on GET /:user/:project:", e);
    return res.status(500).jsonp("Error checking presence limit");
  }
}, (req, res, next) => {
  Project.getOne(req.params.user, req.params.project)
    .then(async (project) => {
      const response = {
        _id: project._id,
        name: project.name,
        tools: project.tools,
        imgs: [],
        version: project.version,
      };

      for (let img of project.imgs) {
        try {
          const resp = await get_image_public_url(
            req.params.user,
            req.params.project,
            "src",
            img.og_img_key
          );
          const url = resp.data.url;

          response["imgs"].push({
            _id: img._id,
            name: path.basename(img.og_uri),
            url: url,
          });
        } catch (_) {
          res.status(404).jsonp(`Error acquiring image's url`);
          return;
        }
      }

      res.status(200).jsonp(response);
    })
    .catch((_) => res.status(501).jsonp(`Error acquiring user's project`));
});

// Get a specific project's image
router.get("/:user/:project/img/:img", checkSharePermission, async (req, res, next) => {
  Project.getOne(req.params.user, req.params.project)
    .then(async (project) => {
      try {
        const img = project.imgs.filter((i) => i._id == req.params.img)[0];
        const resp = await get_image_public_url(
          req.params.user,
          req.params.project,
          "src",
          img.og_img_key
        );
        res.status(200).jsonp({
          _id: img._id,
          name: path.basename(img.og_uri),
          url: resp.data.url,
        });
      } catch (_) {
        res.status(404).jsonp("No image with such id.");
      }
    })
    .catch((_) => res.status(501).jsonp(`Error acquiring user's project`));
});

// Get project images
router.get("/:user/:project/imgs", checkSharePermission, async (req, res, next) => {
  Project.getOne(req.params.user, req.params.project)
    .then(async (project) => {
      try {
        const ans = [];

        for (let img of project.imgs) {
          try {
            const resp = await get_image_public_url(
              req.params.user,
              req.params.project,
              "src",
              img.og_img_key
            );
            const url = resp.data.url;

            ans.push({
              _id: img._id,
              name: path.basename(img.og_uri),
              url: url,
            });
          } catch (_) {
            res.status(404).jsonp(`Error acquiring image's url`);
            return;
          }
        }
        res.status(200).jsonp(ans);
      } catch (_) {
        res.status(404).jsonp("No image with such id.");
      }
    })
    .catch((_) => res.status(501).jsonp(`Error acquiring user's project`));
});

// Get results of processing a project
router.get("/:user/:project/process", checkSharePermission, (req, res, next) => {
  // Getting last processed request from project in order to get their result's path
  Project.getOne(req.params.user, req.params.project)
    .then(async (_) => {
      const zip = new JSZip();
      const project = await Project.getOne(req.params.user, req.params.project);
      const committed = project.committedToken || 0;
      const results = await Result.getAllByToken(req.params.user, req.params.project, committed);

      const result_path = `/../images/users/${req.params.user}/projects/${req.params.project}/tmp`;

      fs.mkdirSync(path.join(__dirname, result_path), { recursive: true });

      for (let r of results) {
        const res_path = path.join(__dirname, result_path, r.file_name);

        const resp = await get_image_internal_url(
          r.user_id,
          r.project_id,
          "out",
          r.img_key
        );
        const url = resp.data.url;

        const file_resp = await axios.get(url, { responseType: "stream" });
        const writer = fs.createWriteStream(res_path);

        // Use a Promise to handle the stream completion
        await new Promise((resolve, reject) => {
          writer.on("finish", resolve);
          writer.on("error", reject);
          file_resp.data.pipe(writer); // Pipe AFTER setting up the event handlers
        });

        const fs_res = fs.readFileSync(res_path);
        zip.file(r.file_name, fs_res);
      }

      fs.rmSync(path.join(__dirname, result_path), {
        recursive: true,
        force: true,
      });

      const ans = await zip.generateAsync({ type: "blob" });

      res.type(ans.type);
      res.set(
        "Content-Disposition",
        `attachment; filename=user_${req.params.user}_project_${req.params.project}_results.zip`
      );
      const b = await ans.arrayBuffer();
      res.status(200).send(Buffer.from(b));
    })
    .catch((_) =>
      res.status(601).jsonp(`Error acquiring project's processing result`)
    );
});


// Get results of processing a project
router.get("/:user/:project/process/url", checkSharePermission, async (req, res) => {
  try {
    const project = await Project.getOne(req.params.user, req.params.project);
    const committed = project.committedToken || 0;

    const results = await Result.getAllByToken(req.params.user, req.params.project, committed);

    const ans = { imgs: [], texts: [] };
    for (const r of results) {
      const resp = await get_image_public_url(r.user_id, r.project_id, "out", r.img_key);
      const url = resp.data.url;

      if (r.type === "text") ans.texts.push({ og_img_id: r.img_id, name: r.file_name, url });
      else ans.imgs.push({ og_img_id: r.img_id, name: r.file_name, url });
    }

    return res.status(200).jsonp(ans);
  } catch (e) {
    return res.status(601).jsonp("Error acquiring project's processing result");
  }
});



// Get number of advanced tools used in a project
router.get("/:user/:project/advanced_tools", checkSharePermission, (req, res, next) => {
  Project.getOne(req.params.user, req.params.project)
    .then((project) => {
      const { adv_ops } = advanced_tool_num(project);
      // nº de operações avançadas que ESTA execução iria gastar
      res.status(200).jsonp(adv_ops);
    })
    .catch((_) => res.status(501).jsonp(`Error acquiring user's project`));
});

// Create new project
router.post("/:user", (req, res, next) => {
  const project = {
    name: req.body.name,
    user_id: req.params.user,
    imgs: [],
    tools: [],
  };

  Project.create(project)
    .then((project) => res.status(201).jsonp(project))
    .catch((_) => res.status(502).jsonp(`Error creating new project`));
});

// Preview an image
router.post("/:user/:project/preview/:img", checkSharePermission, requireEditPermission, enforcePresenceLimit, (req, res, next) => {
  const ownerId = req.params.user;
  const runnerUserId = getCallerId(req);

  Project.getOne(ownerId, req.params.project)
    .then(async (project) => {
      if (project.tools.length === 0) {
        return res.status(400).jsonp("No tools selected");
      }

      const tool = project.tools.filter((t) => t.position == 0)[0];
      if (!tool) {
        return res.status(400).jsonp("No tools selected");
      }

      const tool_name = tool.procedure;
      const params = tool.params;

      const source_path = `/../images/users/${ownerId}/projects/${req.params.project}/src`;
      const result_path = `/../images/users/${ownerId}/projects/${req.params.project}/preview`;

      if (!fs.existsSync(path.join(__dirname, source_path)))
        fs.mkdirSync(path.join(__dirname, source_path), { recursive: true });

      if (!fs.existsSync(path.join(__dirname, result_path)))
        fs.mkdirSync(path.join(__dirname, result_path), { recursive: true });

      const img = project.imgs.filter((i) => i._id == req.params.img)[0];

      const orderedTools = [...project.tools].sort((a,b) => a.position - b.position);
      const cacheKey = makePreviewCacheKey(img.og_sha256, orderedTools);

      console.log(
        `[T-03][PREVIEW] req user=${ownerId} project=${req.params.project} img=${req.params.img} key=${cacheKey.slice(0,8)} tools=${orderedTools.length}`
      );

      const cached = await PreviewCache.getByKey(ownerId, cacheKey);
      if (cached) {
        // gerar URLs atuais (assinadas) a partir das keys guardadas
        const urls = { imageUrl: "", textResults: [] };
        if (cached.image_key) {
          const u = await get_image_public_url(ownerId, req.params.project, "preview_cache", cached.image_key);
          urls.imageUrl = u.data.url;
        }
        for (const tk of cached.text_keys || []) {
          const u = await get_image_public_url(ownerId, req.params.project, "preview_cache", tk);
          urls.textResults.push(u.data.url);
        }

        await PreviewCache.touchHit(ownerId, cacheKey);

        console.log(
          `[T-03][PREVIEW][HIT] key=${cacheKey.slice(0,8)} imgSha=${img.og_sha256?.slice(0,8)}`
        );

        // envia imediatamente para o runner (cumpre performance)
        send_msg_client_preview(
          `update-client-preview-${uuidv4()}`,
          new Date().toISOString(),
          runnerUserId,
          JSON.stringify(urls)
        );
        return res.sendStatus(200);
      }

      console.log(
        `[T-03][PREVIEW][MISS] key=${cacheKey.slice(0,8)} -> processing`
      );

      const prev_preview = await Preview.getAll(
        ownerId,
        req.params.project
      );

      console.log(
        `[T-03][PREVIEW][CLEAN] deleting previous previews count=${prev_preview.length}`
      );

      for (let p of prev_preview) {
        console.log(`[T-03][PREVIEW][CLEAN] delete key=${p.img_key}`);
        await delete_image(
          ownerId,
          req.params.project,
          "preview",
          p.img_key
        );
        await Preview.delete(
          ownerId,
          req.params.project,
          p.img_id
        );
      }

      const msg_id = `preview-${uuidv4()}`;
      const timestamp = new Date().toISOString();
      const og_img_uri = img.og_uri;
      const img_id = img._id;

      const resp = await get_image_internal_url(
        ownerId,
        req.params.project,
        "src",
        img.og_img_key
      );
      const url = resp.data.url;

      const img_resp = await axios.get(url, { responseType: "stream" });
      const writer = fs.createWriteStream(og_img_uri);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
        img_resp.data.pipe(writer);
      });

      const img_name_parts = img.new_uri.split("/");
      const img_name = img_name_parts[img_name_parts.length - 1];
      const new_img_uri = `./images/users/${ownerId}/projects/${req.params.project}/preview/${img_name}`;

      const process = {
        user_id: ownerId,        
        runner_id: runnerUserId,  
        project_id: req.params.project,
        img_id: img_id,
        msg_id: msg_id,
        cur_pos: 0,
        og_img_uri: og_img_uri,
        new_img_uri: new_img_uri,
        cache_key: cacheKey,
        cancelToken: project.cancelToken || 0,
        token: project.activeToken || 0,
      };

      Process.create(process)
        .then(() => {
          send_msg_tool(
            msg_id,
            timestamp,
            og_img_uri,
            new_img_uri,
            tool_name,
            params
          );
          res.sendStatus(201);
        })
        .catch((err) => {
          console.error("[PREVIEW][Process.create] error:", err);
          return res.status(500).jsonp("Error creating preview process request");
        });
    })
    .catch(() => res.status(501).jsonp(`Error acquiring user's project`));
});

// Add new image to a project
router.post(
  "/:user/:project/img", checkSharePermission, requireEditPermission, enforcePresenceLimit, requireProjectVersion, upload.single("image"),
  async (req, res) => {
    console.log("PROJECTS-MS /:user/:project/img HIT, file =", !!req.file);
    if (!req.file) {
      res.status(400).jsonp("No file found");
      return;
    }

    Project.getOne(req.params.user, req.params.project)
      .then(async (project) => {
        const same_name_img = project.imgs.filter(
          (i) => path.basename(i.og_uri) == req.file.originalname
        );

        if (same_name_img.length > 0) {
          res
            .status(400)
            .jsonp("This project already has an image with that name.");
          return;
        }

        try {
          const data = new FormData();
          data.append("file", req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
          });
          const resp = await post_image(
            req.params.user,
            req.params.project,
            "src",
            data
          );

          const og_key_tmp = resp.data.data.imageKey.split("/");
          const og_key = og_key_tmp[og_key_tmp.length - 1];

          try {
            const og_uri = `./images/users/${req.params.user}/projects/${req.params.project}/src/${req.file.originalname}`;
            const new_uri = `./images/users/${req.params.user}/projects/${req.params.project}/out/${req.file.originalname}`;

            const crypto = require("crypto");
            const sha = crypto.createHash("sha256").update(req.file.buffer).digest("hex");

            // Insert new image
            project["imgs"].push({
              og_uri: og_uri,
              new_uri: new_uri,
              og_img_key: og_key,
              og_sha256: sha,
            });

            const updated = await Project.updateIfVersion(
              req.params.user,
              req.params.project,
              project,
              req.expectedVersion
            );

            if (!updated) {
              const fresh = await Project.getOne(req.params.user, req.params.project);
              return res.status(409).jsonp({
                message: "Project version conflict",
                serverVersion: fresh?.version ?? null,
              });
            }

            res.set("X-Project-Version", String(updated.version));
            return res.sendStatus(204);

          } catch (_) {
            res.status(501).jsonp(`Updating project information`);
          }
        } catch (_) {
          res.status(501).jsonp(`Error storing image`);
        }
      })
      .catch((_) => res.status(501).jsonp(`Error acquiring user's project`));
  }
);

// Add new tool to a project
router.post("/:user/:project/tool", checkSharePermission, requireEditPermission, enforcePresenceLimit, requireProjectVersion, (req, res, next) => {
  // Reject posts to tools that don't fullfil the requirements
  if (!req.body.procedure || !req.body.params) {
    res
      .status(400)
      .jsonp(`A tool should have a procedure and corresponding parameters`);
    return;
  }

  let required_types = ["free", "premium"];

  if (!advanced_tools.includes(req.body.procedure))
    required_types.push("anonymous");

  const callerId = getCallerId(req);

  axios
    .get(users_ms + `${callerId}/type`, { httpsAgent })
    .then((resp) => {
      // Check user type before proceeding
      if (!required_types.includes(resp.data.type)) {
        return res.status(403).jsonp(`User type can't use this tool`);
      }

      // Get project and insert new tool
      Project.getOne(req.params.user, req.params.project)
        .then(async (project) => {
          const tool = { position: project.tools.length, ...req.body };
          project.tools.push(tool);

          const updated = await Project.updateIfVersion(
            req.params.user,
            req.params.project,
            project,
            req.expectedVersion
          );

          if (!updated) {
            const fresh = await Project.getOne(req.params.user, req.params.project);
            return res.status(409).jsonp({
              message: "Project version conflict",
              serverVersion: fresh?.version ?? null,
            });
          }

          res.set("X-Project-Version", String(updated.version));

          // evento para co-edição
          send_msg_project_op({
            projectId: req.params.project,
            ownerId: req.params.user,
            op: {
              opId: req.headers["x-op-id"] || null,
              type: "TOOL_ADDED",
              actorId: getCallerId(req),
              baseVersion: req.expectedVersion,
              newVersion: updated.version,
              payload: { tool }, // tool criado acima
            },
          });

          return res.sendStatus(204);
        })
        .catch(() => res.status(501).jsonp(`Error acquiring user's project`));
    })
    .catch(() => res.status(401).jsonp(`Error accessing users-ms`));
});

// Reorder tools of a project
router.post(
  "/:user/:project/reorder",
  checkSharePermission,
  requireEditPermission,
  enforcePresenceLimit,
  requireProjectVersion,
  (req, res) => {
    Project.getOne(req.params.user, req.params.project)
      .then(async (project) => {
        project.tools = [];

        for (let t of req.body) {
          project.tools.push({
            position: project.tools.length,
            ...t,
          });
        }

        const updated = await Project.updateIfVersion(
          req.params.user,
          req.params.project,
          project,
          req.expectedVersion
        );

        if (!updated) {
          const fresh = await Project.getOne(req.params.user, req.params.project);
          return res.status(409).jsonp({
            message: "Project version conflict",
            serverVersion: fresh?.version ?? null,
          });
        }

        res.set("X-Project-Version", String(updated.version));

        send_msg_project_op({
          projectId: req.params.project,
          ownerId: req.params.user,
          op: {
            opId: req.headers["x-op-id"] || null,
            type: "TOOLS_REORDERED",
            actorId: getCallerId(req),
            baseVersion: req.expectedVersion,
            newVersion: updated.version,
            payload: { tools: project.tools }, // já com positions
          },
        });

        return res.sendStatus(204);
      })
      .catch(() => res.status(501).jsonp(`Error acquiring user's project`));
  }
);

// Process a specific project
router.post("/:user/:project/process", checkSharePermission, requireEditPermission, enforcePresenceLimit, requireProjectVersion, (req, res) => {
  const ownerId = req.params.user;
  const runnerUserId = getCallerId(req); // <-- agora pode vir do body
  
  console.log("[CALLER]", {
  userParam: req.params.user,
  forwarded: req.headers["x-caller-id"],
  hasAuth: !!req.headers["authorization"],
  caller: getCallerId(req),
});

  Project.getOne(ownerId, req.params.project)
    .then(async (project) => {
      try {

      } catch (_) {
        res.status(400).jsonp("Error deleting previous results");
        return;
      }

      if (project.tools.length == 0) {
        res.status(400).jsonp("No tools selected");
        return;
      }

      const { adv_ops, totalAdv, charged, newTools } = advanced_tool_num(project);

      console.log(
        "[ADV DEBUG] project:",
        req.params.project,
        "adv_ops:", adv_ops,
        "totalAdv:", totalAdv,
        "charged:", charged,
        "newTools:", newTools,
        "tools:", project.tools.map((t) => t.procedure)
      );

      let runToken = null;

      // função local com a lógica de "arrancar processamento"
      const startProcessing = async () => {
        const source_path = `/../images/users/${ownerId}/projects/${req.params.project}/src`;
        const result_path = `/../images/users/${ownerId}/projects/${req.params.project}/out`;

        if (fs.existsSync(path.join(__dirname, source_path)))
          fs.rmSync(path.join(__dirname, source_path), {
            recursive: true,
            force: true,
          });

        fs.mkdirSync(path.join(__dirname, source_path), { recursive: true });

        if (fs.existsSync(path.join(__dirname, result_path)))
          fs.rmSync(path.join(__dirname, result_path), {
            recursive: true,
            force: true,
          });

        fs.mkdirSync(path.join(__dirname, result_path), { recursive: true });

        let error = false;

        for (let img of project.imgs) {
          let url = "";
          try {
            const resp = await get_image_internal_url(
              ownerId,
              req.params.project,
              "src",
              img.og_img_key
            );
            url = resp.data.url;

            const img_resp = await axios.get(url, { responseType: "stream" });
            const writer = fs.createWriteStream(img.og_uri);

            await new Promise((resolve, reject) => {
              writer.on("finish", resolve);
              writer.on("error", reject);
              img_resp.data.pipe(writer);
            });
          } catch (_) {
            res.status(400).jsonp("Error acquiring source images");
            return;
          }

          const msg_id = `request-${uuidv4()}`;
          const timestamp = new Date().toISOString();

          const og_img_uri = img.og_uri;
          const new_img_uri = img.new_uri;
          const tool = project.tools.filter((t) => t.position === 0)[0];

          const tool_name = tool.procedure;
          const params = tool.params;

          const process = {
            user_id: ownerId,
            runner_id: runnerUserId,
            project_id: req.params.project,
            img_id: img._id,
            msg_id: msg_id,
            cur_pos: 0,
            og_img_uri: og_img_uri,
            new_img_uri: new_img_uri,
            cancelToken: project.cancelToken || 0,
            token: runToken,
          };

          await Process.create(process)
            .then(() => {
              send_msg_tool(
                msg_id,
                timestamp,
                og_img_uri,
                new_img_uri,
                tool_name,
                params
              );
            })
            .catch(() => (error = true));
        }

        if (error) {
          res
            .status(603)
            .jsonp(
              `There were some erros creating all process requests. Some results can be invalid.`
            );
        } else {
          res.sendStatus(201);
        }
      };

      // Caso 1: sem advanced tools -> não é preciso falar com users-ms
      if (adv_ops === 0) {
        try {

          // T-03 short-circuit: se nada mudou desde o último commit, não reprocessar
          const hasCommit = (project.committedToken || 0) > 0;
          const fpNow = makeToolsFingerprint(project.tools || []);
          const fpCommitted = makeToolsFingerprint(project.committedTools || []);

          if (hasCommit && fpNow === fpCommitted) {
            console.log(
              `[T-03][PROCESS][SKIP] user=${ownerId} project=${req.params.project} token=${project.committedToken}`
            );

            // Notificar frontend imediatamente (não há work para fazer)
            send_msg_client(
              `update-client-process-${uuidv4()}`,
              new Date().toISOString(),
              runnerUserId
            );

            // Mantém o contrato: “process pedido” -> resposta rápida
            return res.sendStatus(201);
          }

          // antes de abrir execução nova
          project.prevCommittedToken = project.committedToken || 0;

          // snapshot do último commit (fallback: tools atuais se nunca houve commit)
          project.prevCommittedTools =
            Array.isArray(project.committedTools) && project.committedTools.length > 0
              ? project.committedTools
              : (project.tools || []);

          // abrir uma execução nova SEMPRE
          project.activeToken = (project.activeToken || 0) + 1;

          // coerência de counters
          if (charged !== project.chargedAdvancedTools) {
            project.chargedAdvancedTools = charged;
          }
          project.pendingAdvancedOps = 0;

          const updated = await Project.updateIfVersion(
            ownerId,
            req.params.project,
            project,
            req.expectedVersion
          );

          if (!updated) {
            const fresh = await Project.getOne(ownerId, req.params.project);
            return res.status(409).jsonp({
              message: "Project version conflict",
              serverVersion: fresh?.version ?? null,
            });
          }

          res.set("X-Project-Version", String(updated.version));

          // token desta execução
          runToken = updated.activeToken;

          await startProcessing();
        } catch (e) {
          console.error("Error starting processing (no advanced tools):", e);
          res.status(500).jsonp("Error processing project");
        }
        return;
      }

      // Caso 2: com advanced tools -> verificar quota no users-ms
      const callerId = getCallerId(req);
      axios
        .get(users_ms + `${callerId}/process/${adv_ops}`, { httpsAgent: httpsAgent })
        .then(async (resp) => {
          const can_process = resp.data;

          if (!can_process) {
            res.status(404).jsonp("No more daily_operations available");
            return;
          }

          try {
            // Marcamos que já pagámos todas as tools avançadas atuais
            // (charged + newTools === totalAdv)
            project.chargedAdvancedTools = charged + newTools;
            project.pendingAdvancedOps = adv_ops;

            project.prevCommittedToken = project.committedToken || 0;

            // abrir uma execução nova
            project.activeToken = (project.activeToken || 0) + 1;

            const updated = await Project.updateIfVersion(
              ownerId,
              req.params.project,
              project,
              req.expectedVersion
            );

            if (!updated) {
              const fresh = await Project.getOne(ownerId, req.params.project);
              return res.status(409).jsonp({
                message: "Project version conflict",
                serverVersion: fresh?.version ?? null,
              });
            }

            res.set("X-Project-Version", String(updated.version));

            runToken = updated.activeToken; // token desta execução

            await startProcessing();
          } catch (e) {
            console.error("Error starting processing (advanced tools):", e);
            res.status(500).jsonp("Error processing project");
          }
        })
        .catch((err) => {
          console.error("Error calling users-ms /process:", {
            message: err.message,
            status: err.response?.status,
            data: err.response?.data,
            url: users_ms + `${callerId}/process/${adv_ops}`,
            callerId,
            adv_ops,
          });

          if (err.response) {
            const status = err.response.status || 500;
            const data = err.response.data || "Error checking if can process";
            return res.status(status).jsonp(data);
          }

          return res.status(500).jsonp("Error checking if can process");
        });
    })
    .catch((_) => res.status(501).jsonp(`Error acquiring user's project`));
});

// Update a specific project
router.put(
  "/:user/:project",
  checkSharePermission,
  requireEditPermission,
  enforcePresenceLimit,
  requireProjectVersion,
  (req, res) => {
    Project.getOne(req.params.user, req.params.project)
      .then(async (project) => {
        project.name = req.body.name || project.name;

        const updated = await Project.updateIfVersion(
          req.params.user,
          req.params.project,
          project,
          req.expectedVersion
        );

        if (!updated) {
          const fresh = await Project.getOne(req.params.user, req.params.project);
          return res.status(409).jsonp({
            message: "Project version conflict",
            serverVersion: fresh?.version ?? null,
          });
        }

        res.set("X-Project-Version", String(updated.version));
        return res.sendStatus(204);
      })
      .catch(() => res.status(501).jsonp(`Error acquiring user's project`));
  }
);

// Update a tool from a specific project
router.put(
  "/:user/:project/tool/:tool",
  checkSharePermission,
  requireEditPermission,
  enforcePresenceLimit,
  requireProjectVersion,
  (req, res) => {
    Project.getOne(req.params.user, req.params.project)
      .then(async (project) => {
        try {
          const tool_pos = project.tools.findIndex((i) => i._id == req.params.tool);
          const prev_tool = project.tools[tool_pos];

          project.tools[tool_pos] = {
            position: prev_tool.position,
            procedure: prev_tool.procedure,
            params: req.body.params,
            _id: prev_tool._id,
          };

          const updated = await Project.updateIfVersion(
            req.params.user,
            req.params.project,
            project,
            req.expectedVersion
          );

          if (!updated) {
            const fresh = await Project.getOne(req.params.user, req.params.project);
            return res.status(409).jsonp({
              message: "Project version conflict",
              serverVersion: fresh?.version ?? null,
            });
          }

          res.set("X-Project-Version", String(updated.version));

          send_msg_project_op({
            projectId: req.params.project,
            ownerId: req.params.user,
            op: {
              opId: req.headers["x-op-id"] || null,
              type: "TOOL_UPDATED",
              actorId: getCallerId(req),
              baseVersion: req.expectedVersion,
              newVersion: updated.version,
              payload: {
                toolId: req.params.tool,
                params: req.body.params,
              },
            },
          });

          return res.sendStatus(204);
        } catch (_) {
          return res.status(599).jsonp(`Error updating tool. Make sure such tool exists`);
        }
      })
      .catch(() => res.status(501).jsonp(`Error acquiring user's project`));
  }
);

// Delete a project
router.delete( "/:user/:project", checkSharePermission, requireEditPermission, enforcePresenceLimit, requireProjectVersion, async (req, res) => {

    const ok = await Project.deleteIfVersion(req.params.user, req.params.project, req.expectedVersion);
    if (!ok) {
      const fresh = await Project.getOne(req.params.user, req.params.project);
      return res.status(409).jsonp({ message: "Project version conflict", serverVersion: fresh?.version ?? null });
    }
    return res.sendStatus(204);
  }
);


// Delete ALL projects from a user (used when deleting an account)
router.delete("/:user", async (req, res, next) => {
  const userId = req.params.user;

  try {
    const projects = await Project.getAll(userId);

    for (const p of projects) {
      await deleteProjectAndResources(userId, p._id);
    }

    return res.sendStatus(204);
  } catch (err) {
    console.error("Error deleting all projects from user:", err);
    return res.status(504).jsonp(`Error deleting user's projects`);
  }
});


// Delete an image from a project
router.delete("/:user/:project/img/:img", checkSharePermission, requireEditPermission, enforcePresenceLimit, requireProjectVersion, (req, res, next) => {
  // Get project and delete specified image
  Project.getOne(req.params.user, req.params.project)
    .then(async (project) => {
      try {
        const img = project["imgs"].filter((i) => i._id == req.params.img)[0];

        await delete_image(
          req.params.user,
          req.params.project,
          "src",
          img.og_img_key
        );
        project["imgs"].remove(img);

        const results = await Result.getOne(
          req.params.user,
          req.params.project,
          img._id
        );

        const previews = await Preview.getOne(
          req.params.user,
          req.params.project,
          img._id
        );

        if (results !== null && results !== undefined) {
          await delete_image(
            req.params.user,
            req.params.project,
            "out",
            results.img_key
          );
          await Result.delete(
            results.user_id,
            results.project_id,
            results.img_id
          );
        }

        if (previews !== null && previews !== undefined) {
          await delete_image(
            req.params.user,
            req.params.project,
            "preview",
            previews.img_key
          );
          await Preview.delete(
            previews.user_id,
            previews.project_id,
            previews.img_id
          );
        }

        const updated = await Project.updateIfVersion(
          req.params.user,
          req.params.project,
          project,
          req.expectedVersion
        );

        if (!updated) {
          const fresh = await Project.getOne(req.params.user, req.params.project);
          return res.status(409).jsonp({
            message: "Project version conflict",
            serverVersion: fresh?.version ?? null,
          });
        }

        res.set("X-Project-Version", String(updated.version));
        return res.sendStatus(204);

      } catch (_) {
        res.status(400).jsonp(`Error deleting image information.`);
      }
    })
    .catch((_) => res.status(501).jsonp(`Error acquiring user's project`));
});

// Delete a tool from a project
router.delete(
  "/:user/:project/tool/:tool",
  checkSharePermission,
  requireEditPermission,
  enforcePresenceLimit,
  requireProjectVersion,
  async (req, res) => {
    try {
      const project = await Project.getOne(req.params.user, req.params.project);
      if (!project) return res.status(404).jsonp("Project not found");

      try {
        const tool = project.tools.find((i) => String(i._id) === String(req.params.tool));
        if (!tool) return res.status(404).jsonp("Tool not found");

        // Guardar token atual (antes do undo) para sabermos o que apagar
        const oldTok = project.committedToken ?? 0;

        // Remover tool do array
        project.tools.remove(tool);

        // Recalcular positions
        for (let i = 0; i < project.tools.length; i++) {
          if (project.tools[i].position > tool.position) project.tools[i].position--;
        }

        // Persistir com controlo de versão
        const updated = await Project.updateIfVersion(
          req.params.user,
          req.params.project,
          project,
          req.expectedVersion
        );

        if (!updated) {
          const fresh = await Project.getOne(req.params.user, req.params.project);
          return res.status(409).jsonp({
            message: "Project version conflict",
            serverVersion: fresh?.version ?? null,
          });
        }

        // ----------------------------
        // (rollback de results)
        // ----------------------------
        const canRollback =
          typeof updated.prevCommittedToken === "number" &&
          Array.isArray(updated.prevCommittedTools);

        // Se o estado atual (tools após undo) == prevCommittedTools,
        // então voltamos ao token anterior imediatamente.
        if (canRollback && toolsEqual(updated.tools, updated.prevCommittedTools)) {
          const rollbackTok = updated.prevCommittedToken;

          updated.committedToken = rollbackTok;
          updated.resultsToken = rollbackTok;
          updated.committedTools = updated.prevCommittedTools;

          // opcional (mas normalmente boa ideia): como já voltaste ao "commit anterior",
          // podes limpar o prevCommitted* para evitar encadear rollbacks errados
          // updated.prevCommittedToken = 0;
          // updated.prevCommittedTools = [];

          await updated.save();
        }

        res.set("X-Project-Version", String(updated.version));

        // Invalidar execução / outputs atuais
        // 1) apagar processos em curso para evitar resultados "tardios"
        try {
          const processes = await Process.getProject(req.params.user, req.params.project);
          if (processes && processes.length > 0) {
            for (const p of processes) {
              await Process.delete(p.user_id, p.project_id, p._id);
            }
          }
        } catch (err) {
          console.error("Error clearing processes on tool delete:", err);
        }

        // 2) apagar previews (faz sentido sempre — preview depende das tools atuais)
        try {
          const previews = await Preview.getAll(req.params.user, req.params.project);
          for (const p of previews) {
            try {
              await delete_image(req.params.user, req.params.project, "preview", p.img_key);
            } catch (_) {}
            await Preview.delete(p.user_id, p.project_id, p.img_id);
          }
        } catch (err) {
          console.error("Error clearing previews on tool delete:", err);
        }

        // 3)  apagar apenas outputs do token "mais recente" (oldTok),
        // para não destruir o token para onde fizemos rollback.
        try {
          // results por token (como no cancel):
          const resultsOld = await Result.getAllByToken(req.params.user, req.params.project, oldTok);
          for (const r of resultsOld) {
            try {
              await delete_image(req.params.user, req.params.project, "out", r.img_key);
            } catch (_) {}
          }
          await Result.deleteByToken(req.params.user, req.params.project, oldTok);

          console.log(`[UNDO-ROLLBACK][RESULTS-CLEAN] token=${oldTok} deleted=${resultsOld.length}`);
        } catch (err) {
          console.error("Error clearing token results on tool delete:", err);
        }

        // broadcast granular op
        send_msg_project_op({
          projectId: req.params.project,
          ownerId: req.params.user,
          op: {
            opId: req.headers["x-op-id"] || null,
            type: "TOOL_REMOVED",
            actorId: getCallerId(req),
            baseVersion: req.expectedVersion,
            newVersion: updated.version,
            payload: { toolId: req.params.tool },
          },
        });

        return res.sendStatus(204);
      } catch (err) {
        console.error(err);
        return res.status(400).jsonp(`Error deleting tool's information`);
      }
    } catch (err) {
      console.error(err);
      return res.status(501).jsonp(`Error acquiring user's project`);
    }
  }
);


// Limpar tools + resultados + previews + counters
router.post(
  "/:user/:project/clear",
  checkSharePermission,
  requireEditPermission,
  enforcePresenceLimit,
  requireProjectVersion,
  async (req, res) => {
    const ownerId = req.params.user;
    const projectId = req.params.project;

    try {
      const project = await Project.getOne(ownerId, projectId);
      if (!project) return res.status(404).jsonp("Project not found");

      // 1) apagar resultados (DB + object storage out)
      const prev_results = await Result.getAll(ownerId, projectId);
      for (const r of prev_results) {
        await delete_image(ownerId, projectId, "out", r.img_key);
        await Result.delete(r.user_id, r.project_id, r.img_id);
      }

      // 2) apagar previews (DB + object storage preview)
      const prev_preview = await Preview.getAll(ownerId, projectId);
      for (const p of prev_preview) {
        await delete_image(ownerId, projectId, "preview", p.img_key);
        await Preview.delete(p.user_id, p.project_id, p.img_id);
      }

      // limpar diretórios locais tmp
      // para evitar lixo em disco caso exista
      try {
        const basePath = path.join(__dirname, `/../images/users/${ownerId}/projects/${projectId}`);
        for (const dir of ["out", "preview"]) {
          const full = path.join(basePath, dir);
          if (fs.existsSync(full)) fs.rmSync(full, { recursive: true, force: true });
        }
      } catch (_) {}

      // 3) limpar tools + coerência advanced counters
      project.tools = [];
      project.pendingAdvancedOps = 0;
      project.chargedAdvancedTools = 0;

      const updated = await Project.updateIfVersion(
        ownerId,
        projectId,
        project,
        req.expectedVersion
      );

      if (!updated) {
        const fresh = await Project.getOne(ownerId, projectId);
        return res.status(409).jsonp({
          message: "Project version conflict",
          serverVersion: fresh?.version ?? null,
        });
      }

      res.set("X-Project-Version", String(updated.version));

      send_msg_project_op({
        projectId: req.params.project,
        ownerId: req.params.user,
        op: {
          opId: req.headers["x-op-id"] || null,
          type: "PROJECT_CLEARED",
          actorId: getCallerId(req),
          baseVersion: req.expectedVersion,
          newVersion: updated.version,
          payload: {},
        },
      });

      return res.sendStatus(204);
    } catch (err) {
      console.error("Error clearing project:", err);
      return res.status(500).jsonp("Error clearing project");
    }
  }
);

// Cancelar processamento de um projeto
router.delete(
  "/:user/:project/process",
  checkSharePermission,
  requireEditPermission,
  enforcePresenceLimit,
  requireProjectVersion,
  async (req, res) => {
    try {
      const ownerId = req.params.user;
      const projectId = req.params.project;

      const project = await Project.getOne(ownerId, projectId);
      if (!project) return res.status(404).jsonp("Project not found");

      const callerId = getCallerId(req);
      const adv_ops = project.pendingAdvancedOps || 0;

      const cancelTok = project.activeToken || 0;

      // invalidar sempre execução atual
      project.activeToken = (project.activeToken || 0) + 1;

      // reset pending
      project.pendingAdvancedOps = 0;

      // rollback committed antes de persistir 
      const prev = project.prevCommittedToken ?? (project.committedToken || 0);
      const prevTools = project.prevCommittedTools ?? project.tools;

      if ((project.committedToken || 0) === cancelTok) {
        project.committedToken = prev;
        project.resultsToken = prev;

          // rollback tools para o último estado “consistente”
          project.tools = Array.isArray(prevTools) ? prevTools : [];
  
          // opcional: manter committedTools coerente com o rollback
          project.committedTools = Array.isArray(prevTools) ? prevTools : [];
      }

      // refund se necessário
      if (adv_ops > 0) {
        try {
          await axios.post(
            users_ms + `${callerId}/process/refund/${adv_ops}`,
            {},
            { httpsAgent }
          );
        } catch (err) {
          console.error("Error refunding operations on cancel:", err);
        }
      }

      // persistir alterações (inclui committedToken rollback)
      const updated = await Project.updateIfVersion(
        ownerId,
        projectId,
        project,
        req.expectedVersion
      );

      if (!updated) {
        const fresh = await Project.getOne(ownerId, projectId);
        return res.status(409).jsonp({
          message: "Project version conflict",
          serverVersion: fresh?.version ?? null,
        });
      }

      // apagar apenas resultados da execução cancelada
      try {
        const toDelete = await Result.getAllByToken(ownerId, projectId, cancelTok);
        for (const r of toDelete) {
          try { await delete_image(ownerId, projectId, "out", r.img_key); } catch (_) {}
        }
        await Result.deleteByToken(ownerId, projectId, cancelTok);

        console.log(`[CANCEL][RESULTS-CLEAN] token=${cancelTok} deleted=${toDelete.length}`);
      } catch (err) {
        console.error("Error deleting cancelled run results:", err);
      }

      res.set("X-Project-Version", String(updated.version));

      // limpar processos em curso
      const processes = await Process.getProject(ownerId, projectId);
      for (const p of (processes || [])) {
        await Process.delete(p.user_id, p.project_id, p._id);
      }

      // limpar dirs temporários (opcional)
      const basePath = `/../images/users/${ownerId}/projects/${projectId}`;
      for (const dir of ["src", "preview"]) {
        const full = path.join(__dirname, `${basePath}/${dir}`);
        if (fs.existsSync(full)) fs.rmSync(full, { recursive: true, force: true });
      }

      return res.sendStatus(204);
    } catch (err) {
      console.error("Error cancelling project processing:", err);
      return res.status(500).jsonp("Error cancelling project processing");
    }
  }
);

// ================== AI ASSISTANT (SUGGEST) ==================

function normalizeText(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function buildSuggestions(message, currentTools, features) {
  const txt = normalizeText(message);

  // helpers
  const has = (...words) => words.some((w) => txt.includes(normalizeText(w)));

  // features (fallbacks seguros)
  const mean = typeof features?.meanBrightness === "number" ? features.meanBrightness : 128; // 0..255
  const ctr = typeof features?.contrast === "number" ? features.contrast : 25;              // ~0..100

  // intensidades adaptativas
  const brighten = clamp(mean < 90 ? 1.25 : mean < 115 ? 1.18 : mean < 140 ? 1.10 : 1.06, 1.05, 1.30);
  const darken   = clamp(mean > 185 ? 0.78 : mean > 165 ? 0.84 : mean > 145 ? 0.90 : 0.94, 0.70, 0.98);

  // se a imagem já tiver muito contraste (ctr alto) não puxar tanto
  const boostContrast = clamp(ctr < 18 ? 1.28 : ctr < 26 ? 1.18 : ctr < 34 ? 1.12 : 1.06, 1.05, 1.35);

  const S = [];

  // 1) Preto & Branco
  if (has("preto", "branco", "pb", "p&b", "black and white", "monocrom")) {
    S.push({
      name: "Preto & Branco",
      description: "Remove cor e aumenta contraste para um look clássico (ajustado à imagem).",
      tools: [
        { procedure: "saturation", params: { saturationFactor: 0 } },
        { procedure: "contrast", params: { contrastFactor: clamp(boostContrast, 1.10, 1.35) } },
        { procedure: "brightness", params: { brightness: mean < 110 ? 1.10 : 1.04 } },
      ],
    });
  }

  // 2) Vintage
  if (has("vintage", "retro", "filme", "analog", "nostalg")) {
    S.push({
      name: "Vintage Suave",
      description: "Contraste suave, leve dessaturação e brilho calibrado ao estado atual.",
      tools: [
        { procedure: "contrast", params: { contrastFactor: clamp(boostContrast - 0.06, 1.06, 1.20) } },
        { procedure: "saturation", params: { saturationFactor: 0.88 } },
        { procedure: "brightness", params: { brightness: mean < 115 ? 1.10 : 1.04 } },
      ],
    });
  }

  // 3) Pop / Mais cor
  if (has("pop", "mais cor", "vibrante", "satur", "vivo")) {
    S.push({
      name: "Pop (Mais cor)",
      description: "Aumenta saturação e contraste sem rebentar highlights (ajustado à imagem).",
      tools: [
        { procedure: "saturation", params: { saturationFactor: mean > 170 ? 1.35 : 1.45 } },
        { procedure: "contrast", params: { contrastFactor: clamp(boostContrast, 1.10, 1.25) } },
        { procedure: "brightness", params: { brightness: mean < 110 ? 1.08 : 1.02 } },
      ],
    });
  }

  // 4) Mais claro / Mais escuro
  if (has("mais claro", "clarear", "brilho", "mais luz")) {
    S.push({
      name: "Iluminar",
      description: `Aumenta o brilho (calibrado: brilho médio ~${Math.round(mean)}).`,
      tools: [{ procedure: "brightness", params: { brightness: brighten } }],
    });
  }

  if (has("mais escuro", "escurecer", "menos luz")) {
    S.push({
      name: "Escurecer",
      description: `Reduz o brilho (calibrado: brilho médio ~${Math.round(mean)}).`,
      tools: [{ procedure: "brightness", params: { brightness: darken } }],
    });
  }

  // fallback: se não apanhou keywords, devolve sugestões gerais (também adaptadas)
  if (S.length === 0) {
    S.push(
      {
        name: "Contraste Suave",
        description: "Leve aumento de contraste (ajustado à imagem).",
        tools: [{ procedure: "contrast", params: { contrastFactor: clamp(boostContrast - 0.08, 1.06, 1.18) } }],
      },
      {
        name: "Realce de cor",
        description: "Aumenta ligeiramente a saturação.",
        tools: [{ procedure: "saturation", params: { saturationFactor: mean > 170 ? 1.12 : 1.18 } }],
      },
      {
        name: "Luz & Cor",
        description: "Equilíbrio entre brilho, contraste e cor (ajustado à imagem).",
        tools: [
          { procedure: "brightness", params: { brightness: mean < 110 ? 1.10 : 1.06 } },
          { procedure: "contrast", params: { contrastFactor: clamp(boostContrast - 0.10, 1.06, 1.16) } },
          { procedure: "saturation", params: { saturationFactor: mean > 170 ? 1.06 : 1.10 } },
        ],
      },
    );
  }

  // padding para >=2 tools
  for (const sug of S) {
    if (Array.isArray(sug.tools) && sug.tools.length === 1) {
      sug.tools.push({ procedure: "contrast", params: { contrastFactor: 1.05 } });
    }
  }

  // evita devolver sugestão igual ao estado atual
  const currentStr = JSON.stringify(currentTools || []);
  return S.filter((s) => JSON.stringify(s.tools) !== currentStr).slice(0, 5);
}

// ================== AI ASSISTANT PREVIEW (RF61) ==================

// aplica tools não-IA (brightness/contrast/saturation) localmente com sharp
// para conseguir uma imagem preview por sugestão sem mexer em RabbitMQ/pipeline
async function applyToolsPreview(inputBuffer, tools) {
  let img = sharp(inputBuffer, { failOnError: false });

  for (const t of tools || []) {
    const proc = t?.procedure;
    const p = t?.params || {};

    if (proc === "brightness") {
      const b = Number(p.brightness);
      if (Number.isFinite(b)) {
        img = img.modulate({ brightness: b });
      }
    }

    if (proc === "saturation") {
      const s = Number(p.saturationFactor);
      if (Number.isFinite(s)) {
        img = img.modulate({ saturation: s });
      }
    }

    if (proc === "contrast") {
      // sharp não tem "contrastFactor" direto; fazemos linear(a,b):
      // out = a*in + b ; para contrastFactor c, usa b = 128*(1-c)
      const c = Number(p.contrastFactor);
      if (Number.isFinite(c)) {
        const a = c;
        const b = 128 * (1 - c);
        img = img.linear(a, b);
      }
    }
  }

  return await img.png().toBuffer();
}

async function uploadAssistantPreview(ownerId, projectId, outBuffer) {
  const data = new FormData();
  const fname = `assistant-preview-${uuidv4()}.png`;
  data.append("file", outBuffer, {
    filename: fname,
    contentType: "image/png",
  });

  // reusa o bucket "preview" já existente
  const resp = await post_image(ownerId, projectId, "preview", data);
  const keyParts = resp.data.data.imageKey.split("/");
  const img_key = keyParts[keyParts.length - 1];

  const urlResp = await get_image_public_url(ownerId, projectId, "preview", img_key);
  return { img_key, url: urlResp.data.url, file_name: fname };
}


router.post(
  "/:user/:project/assistant/suggest",
  checkSharePermission,
  requireEditPermission,
  enforcePresenceLimit,
  requireProjectVersion,
  async (req, res) => {
    try {
      const ownerId = req.params.user;

      const { message, currentTools, imgId } = req.body || {};
      if (!message || String(message).trim().length < 2) {
        return res.status(400).jsonp("Message is required");
      }

      const project = await Project.getOne(ownerId, req.params.project);
      if (!project) return res.status(404).jsonp("Project not found");
      if (!project.imgs || project.imgs.length === 0) {
        return res.status(400).jsonp("Project has no images");
      }

      // 1) escolher imagem “corrente”
      const img =
        (imgId && project.imgs.find((i) => String(i._id) === String(imgId))) ||
        project.imgs[0];

      // 2) obter url do image storage e fazer download para buffer
      const resp = await get_image_internal_url(ownerId, req.params.project, "src", img.og_img_key);
      const url = resp.data.url;

      const imgResp = await axios.get(url, { responseType: "arraybuffer" });
      const buffer = Buffer.from(imgResp.data);

      // 3) extrair features
      const features = await extractImageFeatures(buffer);

      // 4) sugestões agora dependem do conteúdo da imagem
      const suggestions = buildSuggestions(message, currentTools, features);

      
      // 5) RF61: gerar preview visual por sugestão (localmente, tools não-IA)
      const suggestionsWithPreview = [];
      for (const s of suggestions) {
        try {
          const out = await applyToolsPreview(buffer, s.tools);
          const up = await uploadAssistantPreview(ownerId, req.params.project, out);
          suggestionsWithPreview.push({
            ...s,
            previewUrl: up.url,
            previewKey: up.img_key, // útil se depois quiseres limpar
          });
        } catch (e) {
          // se falhar, não bloqueia a sugestão; devolve sem preview
          suggestionsWithPreview.push({ ...s, previewUrl: null, previewKey: null });
        }
      }
      return res.status(200).jsonp({ suggestions: suggestionsWithPreview, features });
    } catch (err) {
      console.error("assistant/suggest error:", err);
      return res.status(500).jsonp("Error generating suggestions");
    }
  },
);

// ================== FIM AI ASSISTANT ==================

router.post(
  "/:user/:project/presence",
  checkSharePermission,
  requireEditPermission,
  enforcePresenceLimit,
  async (req, res) => {
    try {
      const ownerId = req.params.user;
      const projectId = req.params.project;
      const callerId = getCallerId(req);
      if (!callerId) return res.status(401).jsonp("Authentication required");

      const result = await ensureEditorSlot({ ownerId, projectId, callerId });

      if (!result.ok) {
        return res.status(429).jsonp({
          message: "Too many active editors for this project",
          active: result.active,
          limit: result.limit,
          ownerType: result.ownerType,
        });
      }

      return res.status(200).jsonp({
        ok: true,
        active: result.active,
        limit: result.limit,
        ownerType: result.ownerType,
      });
    } catch (e) {
      return res.status(501).jsonp("Error registering presence");
    }
  }
);

router.delete(
  "/:user/:project/presence",
  checkSharePermission,
  requireEditPermission,
  enforcePresenceLimit,
  async (req, res) => {
    try {
      const ownerId = req.params.user;
      const projectId = req.params.project;
      const callerId = getCallerId(req);
      if (!callerId) return res.status(401).jsonp("Authentication required");

      await releaseEditorSlot({ ownerId, projectId, callerId });
      return res.sendStatus(204);
    } catch (e) {
      return res.status(501).jsonp("Error releasing presence");
    }
  }
);

// heartbeat (cria/refresh presença)
router.post("/:owner/:project/presence", async (req, res) => {
  const ownerId = req.params.owner;
  const projectId = req.params.project;
  const callerId = req.headers["x-caller-id"] || ownerId;

  const result = await ensureEditorSlot({ ownerId, projectId, callerId });

  if (!result.ok) {
    return res.status(429).jsonp({
      message: "Too many active editors for this project",
      active: result.active,
      limit: result.limit,
    });
  }

  return res.sendStatus(204);
});

// libertar presença
router.delete("/:owner/:project/presence", async (req, res) => {
  const ownerId = req.params.owner;
  const projectId = req.params.project;
  const callerId = req.headers["x-caller-id"] || ownerId;

  await releaseEditorSlot({ ownerId, projectId, callerId });
  return res.sendStatus(204);
});

// marcar projeto como dirty/clean (server-side)
router.post(
  "/:user/:project/dirty",
  checkSharePermission,
  requireEditPermission,
  enforcePresenceLimit,
  requireProjectVersion,
  async (req, res) => {
    try {
      const dirty = !!req.body?.dirty;

      const project = await Project.getOne(req.params.user, req.params.project);
      if (!project) return res.status(404).jsonp("Project not found");

      // atualiza flags
      project.dirty = dirty;
      project.dirtyUpdatedAt = new Date();
      project.dirtyBy = getCallerId(req) || project.user_id;

      const updated = await Project.updateIfVersion(
        req.params.user,
        req.params.project,
        project,
        req.expectedVersion
      );

      if (!updated) {
        const fresh = await Project.getOne(req.params.user, req.params.project);
        return res.status(409).jsonp({
          message: "Project version conflict",
          serverVersion: fresh?.version ?? null,
        });
      }

      res.set("X-Project-Version", String(updated.version));
      return res.sendStatus(204);
    } catch (err) {
      console.error("Error setting dirty:", err);
      return res.status(500).jsonp("Error setting dirty flag");
    }
  }
);

module.exports = { router, process_msg };