/**
 * Host half of @local/dsh-plugin-inspector.
 *
 * Routes:
 *   GET  /api/dsh-plugin-inspector/data      -> { plugins, bundles, scannedAt, error }
 *   POST /api/dsh-plugin-inspector/translate -> { ok, translations, error }
 *
 * Translation uses the profile's own configured LLM (no extra key), cached to disk.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { homedir } from 'node:os';

export const inject = ['webServer', 'pluginManager', 'llm', 'agentDefaultModel'];

const API = '/api/dsh-plugin-inspector';
const CACHE_FILE = path.join(process.env.DSH_HOME || path.join(homedir(), '.dsh'), 'inspector-plugin-translations.json');

function json(res, status, value) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(value));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 200000) { reject(Error('request too large')); req.destroy(); }
    });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

function normalizePlugin(p) {
  if (!p || typeof p !== 'object') return null;
  return {
    id: p.entryId || p.id || p.rowId || '',
    name: p.moduleName || p.name || p.packageName || p.id || '',
    enabled: p.enabled === true,
    fiberPhase: p.fiberPhase || '',
    patchId: p.patchId || '',
    readOnlyReason: p.readOnlyReason || '',
    raw: p,
  };
}

function normalizeBundle(b) {
  if (!b || typeof b !== 'object') return null;
  return {
    name: b.name || '',
    version: b.version || '',
    enabled: b.enabled === true,
    installed: b.installed === true,
    official: b.official === true,
    availability: b.availability || '',
    description: b.description || '',
    source: b.source || '',
    rows: Array.isArray(b.rows) ? b.rows.length : 0,
    overrides: Array.isArray(b.overrides) ? b.overrides.length : 0,
    error: b.error || null,
    raw: b,
  };
}

async function collect(ctx) {
  const out = { plugins: [], bundles: [], scannedAt: new Date().toISOString(), error: '' };
  try {
    const pm = ctx.pluginManager;
    if (!pm || typeof pm.listPlugins !== 'function') {
      out.error = 'pluginManager service is not mounted in this profile.';
      return out;
    }
    try {
      const plugins = await pm.listPlugins();
      out.plugins = (Array.isArray(plugins) ? plugins : []).map(normalizePlugin).filter(Boolean);
    } catch (e) {
      out.error = 'listPlugins failed: ' + String((e && e.message) || e);
    }
    try {
      const bundles = typeof pm.listBundles === 'function' ? await pm.listBundles() : [];
      out.bundles = (Array.isArray(bundles) ? bundles : []).map(normalizeBundle).filter(Boolean);
    } catch (e) {
      out.error += (out.error ? ' | ' : '') + 'listBundles failed: ' + String((e && e.message) || e);
    }
  } catch (e) {
    out.error = String((e && e.stack) || e);
  }
  return out;
}

/* ---------- automatic translation via the profile's configured LLM ---------- */

const cache = { data: null, loaded: false };
let inflight = null;

async function loadCache() {
  if (cache.loaded) return;
  cache.loaded = true;
  try { cache.data = JSON.parse(await readFile(CACHE_FILE, 'utf8')) || {}; }
  catch { cache.data = {}; }
}
async function saveCache() {
  try {
    await mkdir(path.dirname(CACHE_FILE), { recursive: true });
    await writeFile(CACHE_FILE, JSON.stringify(cache.data, null, 2), 'utf8');
  } catch (_) {}
}

function resolveModel(ctx) {
  try {
    const sel = ctx.agentDefaultModel && typeof ctx.agentDefaultModel.currentSelection === 'function'
      ? ctx.agentDefaultModel.currentSelection() : null;
    if (sel) {
      const provider = sel.provider || sel.providerId || sel.providerName;
      const model = sel.model || sel.modelId || sel.modelName;
      if (provider && model) return { provider, model };
      if (typeof sel === 'string') return sel;
    }
  } catch (_) {}
  return null;
}

function extractJSON(text) {
  if (!text) return null;
  const cleaned = String(text).replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { return null; }
}

async function callLlm(ctx, items) {
  const route = resolveModel(ctx);
  if (!route) throw new Error('没有可用的默认模型（agentDefaultModel 未配置）。');
  const provider = typeof route === 'string' ? undefined : route.provider;
  const model = typeof route === 'string' ? route : route.model;
  const brief = items.map((it) => ({ name: it.name, description: (it.description || '').slice(0, 500) }));
  const prompt = [
    '你是中文技术文档翻译助手。下面是一批 DSH 插件/插件包的英文名和说明，请为每个生成中文信息。',
    '对每个输出：cn=简短中文名(4-12字)，desc=一句中文说明(40字内)，howto=一句话告诉小白怎么用它(说清在什么场景触发/怎么用，40字内)。',
    '系统内置、自动运行的插件，howto 写"内置自动运行，一般无需手动操作"。',
    '只输出一个 JSON 对象：key 是英文名，value 是 {cn,desc,howto}。不要 markdown，不要解释。',
    '输入：' + JSON.stringify(brief),
  ].join('\n');
  let text = '';
  const opts = {
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
    maxTokens: 4000,
  };
  if (provider) opts.provider = provider;
  if (model) opts.model = model;
  for await (const chunk of ctx.llm.stream(opts)) {
    if (!chunk) continue;
    const kind = chunk.type || chunk.kind;
    if (kind === 'text-delta' || kind === 'text') text += (chunk.text || chunk.delta || '');
    else if (kind === 'error' || kind === 'aborted') {
      const f = chunk.failure || chunk.error;
      throw new Error((f && (f.message || f.code)) || 'LLM stream error');
    } else if (kind === 'finish' && chunk.failure) {
      throw new Error((chunk.failure.message || chunk.failure.code) || 'LLM finish error');
    }
  }
  const parsed = extractJSON(text);
  if (!parsed) throw new Error('模型返回无法解析（收到 ' + text.length + ' 字符）：' + text.slice(0, 160));
  return parsed;
}

async function translateItems(ctx, items) {
  await loadCache();
  const result = {};
  const todo = [];
  for (const it of items) {
    if (!it.name) continue;
    if (cache.data[it.name]) result[it.name] = cache.data[it.name];
    else todo.push(it);
  }
  const unique = [...new Map(todo.map((i) => [i.name, i])).values()];
  if (unique.length) {
    // 分批，每批最多 25 个，控制单次输出
    for (let i = 0; i < unique.length; i += 25) {
      const batch = unique.slice(i, i + 25);
      try {
        const parsed = await callLlm(ctx, batch);
        for (const [k, v] of Object.entries(parsed)) {
          if (v && typeof v === 'object') cache.data[k] = { cn: v.cn || '', desc: v.desc || '', howto: v.howto || '' };
        }
        saveCache();
        for (const it of batch) if (cache.data[it.name]) result[it.name] = cache.data[it.name];
      } catch (e) {
        return { ok: false, translations: result, error: String((e && e.message) || e) };
      }
    }
  }
  return { ok: true, translations: result, error: '' };
}

export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact', path: `${API}/data`,
    handler: async (_req, res) => {
      try { json(res, 200, await collect(ctx)); }
      catch (err) { json(res, 500, { error: String((err && err.message) || err) }); }
    },
  }), 'dsh-plugin-inspector: data route');

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact', path: `${API}/translate`,
    handler: async (req, res) => {
      try {
        const body = await readBody(req);
        const items = Array.isArray(body.items) ? body.items : [];
        json(res, 200, await translateItems(ctx, items));
      } catch (err) {
        json(res, 200, { ok: false, translations: {}, error: String((err && err.message) || err) });
      }
    },
  }), 'dsh-plugin-inspector: translate route');
}
