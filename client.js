window.__ModuleLoader__.load({
  id: '@local/dsh-plugin-inspector',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useRef, useCallback } = React;

    const API = '/api/dsh-plugin-inspector';
    const DEFAULT_LANG = 'zh';

    // 常见插件的中文对照：悬停翻译气泡里显示。其余插件回退到通用说明。
    const TRANSLATIONS = {
      '@deepseek-ai/dsh-base': { name: 'DSH 核心基础', desc: '共享的 DeepSeek Harness 核心，提供智能体、会话、工具、文件系统、沙箱、权限等所有底层能力。' },
      '@deepseek-ai/dsh-web-app': { name: 'DSH 网页应用', desc: '浏览器界面层：面板布局、会话、侧边栏、设置、对话渲染、主题与插件管理等前端插件。' },
      'plugin-manager': { name: '插件管理器', desc: '管理当前配置的插件与插件包：安装、启用、禁用、重试、查看版本豁免。' },
      'tool-plugin-manager': { name: '插件管理工具', desc: '让智能体通过工具管理插件：列出、安装、开关插件与插件包。' },
      'cordis:include': { name: 'Cordis 组合包含', desc: '按 YAML 组合加载一组插件条目，是配置文件里组织插件的基础机制。' },
      'timer': { name: '定时器', desc: '为 Cordis 上下文提供可释放的 timeout / interval / 节流 / 防抖工具。' },
      'hmr': { name: '热更新', desc: '协调模块与配置的热重载，改插件代码后无需重启即可生效。' },
      'llm': { name: '大模型接口', desc: '与模型无关的 LLM 服务接口，供各适配器实现。' },
      'session': { name: '会话存储', desc: '基于事件溯源的会话存储：所有对话以不可变事件记录，支持分叉与重放。' },
      'working-directory': { name: '工作目录', desc: '管理每个会话的有效工作目录，含可被模型看到的持久化变更。' },
      'tools': { name: '工具注册表', desc: '工具注册与执行管线：注册、限制、守卫、执行所有智能体工具。' },
      'system-prompt': { name: '系统提示词', desc: '每次模型调用前的提示词组装注册表：段落、上下文、工具、变量。' },
      'agent': { name: '智能体', desc: '智能体接口、注册表与发起者作用域，以及事件词汇表。' },
      'agent-loop': { name: '智能体循环', desc: '具体的智能体驱动循环，负责一步步调用模型与工具直到完成。' },
      'goal': { name: '目标', desc: '基于会话日志的同一会话目标状态与生命周期服务。' },
      'skills-inspector': { name: '技能与提示词查看器', desc: '本插件：在侧边栏查看所有已安装技能及系统提示词，支持悬停中文翻译。' },
      'dsh-plugin-inspector': { name: 'DSH 插件查看器', desc: '本插件：在侧边栏查看所有已安装 DSH 插件与插件包，支持悬停中文翻译。' },
      'skill': { name: '技能注册表', desc: '智能体技能提供者注册表：分层管理用户与项目技能。' },
      'skill-filesystem': { name: '本地技能提供者', desc: '从本地文件系统扫描 SKILL.md，把目录里的技能注册进来。' },
      'commands': { name: '命令注册表', desc: '人类可读的斜杠命令注册表，供界面与智能体共用。' },
      'subagent': { name: '子智能体', desc: '子智能体服务：派生、分叉、消息传递与等待子任务完成。' },
      'web-search-deepseek': { name: '联网搜索', desc: 'DeepSeek 联网搜索提供者，为智能体提供实时网页检索。' },
      'web-fetch-http': { name: '网页抓取', desc: '匿名 HTTP(S) 网页抓取提供者。' },
      'storage': { name: '存储中心', desc: '命名后端注册表与数据域设施：KV、JSON、SQLite 等存储。' },
      'workspace': { name: '工作区注册表', desc: '工作区实体注册：持久化的工作区记录与会话归属。' },
      'locale': { name: '语言与本地化', desc: '语言偏好与多语言字典注册表，负责界面文案的中英文切换。' },
      'ui-theme': { name: '主题', desc: '明暗主题状态与 --dsw-* 主题变量，管理界面配色。' },
      'ui-conversation': { name: '对话界面', desc: '与目标无关的对话组装：外壳、输入框、队列与视图导航。' },
      'ui-skill': { name: '技能界面', desc: '网页端技能引用与专用技能工具行。' },
      'ui-plugin-manager': { name: '插件管理界面', desc: '网页端插件管理：侧边栏插件面板，安装、启用、禁用、重试插件。' },
      'ui-sidebar': { name: '侧边栏', desc: '左侧栏会话树、搜索、分组与状态点。' },
      'ui-layout': { name: '布局外壳', desc: '三栏应用框架、拖拽分隔条与面板导航状态。' },
      'ui-settings': { name: '设置界面', desc: '设置域基础插件：共享配置表单与设置槽位契约。' },
      'ui-renderer': { name: '界面渲染器', desc: '浏览器 React 槽位绑定、渲染上下文与应用根节点组装。' },
      'connection': { name: '连接传输', desc: '带认证的连接 RPC 传输与代际生命周期。' },
      'modules': { name: '客户端模块系统', desc: '网页插件模块表：扫描 dsh.client、组装启动图、按包提供客户端代码。' },
      'Xsdsh-purge': { name: '指令权威性清洗', desc: '对提示词层、代码默认值与引擎审批/沙箱绕过做权威性清洗的插件包。' },
      'dsh-qwen-studio': { name: '千问创作工作室', desc: '集成 Qwen 生图与 MiniMax H3 视频的 NSFW 内容创作插件包。' },
    };

    const GENERIC_ZH = {
      '@deepseek-ai/': 'DeepSeek Harness 官方插件',
      'dsh-': 'DeepSeek Harness 功能插件',
      'ui-': '界面相关插件',
      'tool-': '提供给智能体的工具插件',
    };

    function translate(name) {
      if (TRANSLATIONS[name]) return TRANSLATIONS[name];
      const key = Object.keys(GENERIC_ZH).find((k) => name && name.indexOf(k) >= 0);
      return key
        ? { name: name, desc: GENERIC_ZH[key] + '（' + name + '）。英文原名见标题，完整配置见本面板。' }
        : { name: name, desc: 'DeepSeek Harness 插件或插件包。英文原名见标题。' };
    }

    // 「怎么用」栏目：常见插件/插件包的大白话说明（系统内置插件一般由 AI 自动调用，用户无需手动操作）
    const HOWTO = {
      'plugin-manager': { what: '管插件的：装插件、开/关插件、装插件包都走它。', steps: ['你在界面上点「插件」就能开关', '或让 AI 用插件管理工具装', '改完即时生效，不用重启'], script: '帮我在设置里装/启用/禁用这个插件：<插件名>。' },
      'tool-plugin-manager': { what: '给 AI 用的插件管理工具，让 AI 能帮你装和开关插件。', steps: ['直接跟我说要装什么插件', 'AI 调用它去装', '装好告诉你'], script: '用插件管理工具帮我装这个插件：<插件名>。' },
      'dsh-base': { what: '整个软件的核心底座，管会话、工具、文件、权限，一般不用你手动碰。', steps: ['这是内置核心，自动运行', '你平时感觉不到它', '出问题才需要看它'], script: '' },
      'dsh-web-app': { what: '网页界面层：侧边栏、设置、对话渲染、主题都靠它显示。', steps: ['内置界面插件，自动加载', '你在界面上的操作都经过它', '无需手动操作'], script: '' },
      'session': { what: '会话存储：把你和 AI 的每次对话都记下来，支持分叉和回看。', steps: ['你每次聊天它自动记', '点侧边栏历史能翻旧会话', '可以分叉接着聊'], script: '帮我从这条会话分叉出一个新会话。' },
      'working-directory': { what: '管工作目录：AI 在你指定的文件夹里干活。', steps: ['当前工作区就是它管的', '说"切到XX目录"能换', 'AI 读写文件都在这'], script: '把当前工作目录切换到 <路径>。' },
      'tools': { what: '工具总管：AI 能用的所有工具（读文件、搜索、跑命令）都在这注册。', steps: ['内置，自动运行', 'AI 调工具都经过它', '无需手动操作'], script: '' },
      'system-prompt': { what: '系统提示词组装器：每次问 AI 前，把规则、工具说明拼成提示词。', steps: ['内置，自动运行', '你在「技能与提示词」里能看到结果', '无需手动操作'], script: '' },
      'agent-loop': { what: 'AI 的驱动循环：一步步调用模型和工具，直到把活干完。', steps: ['你把任务发给 AI', '它循环调用模型/工具', '做完给你结果'], script: '' },
      'goal': { what: '目标功能：给 AI 设一个长期目标，跨多轮持续推进。', steps: ['说"目标是XX"', 'AI 记住并持续推进', '完成自动收尾'], script: '设一个目标：<你的目标>，持续推进直到完成。' },
      'skill': { what: '技能注册表：管理所有已安装的技能（就是你现在看的这个列表的数据源）。', steps: ['你用技能时它负责加载', '在「技能与提示词」里能看到', '装新技能走 find-skills'], script: '' },
      'find-skills': { what: '找技能装技能：不知道用哪个技能时让 AI 帮你找。', steps: ['说"有没有能做XX的技能"', 'AI 搜索并推荐', '确认后装上'], script: '用 find-skills 帮我找个能<需求>的技能并装上。' },
      'commands': { what: '斜杠命令：输入框打 / 触发的命令（如 /compact）。', steps: ['在输入框打 /', '选命令', '回车执行'], script: '' },
      'subagent': { what: '子智能体：派小弟去并行干活，做完汇总给你。', steps: ['说"派个子任务去做XX"', 'AI 派生子智能体', '结果汇总回来'], script: '派一个子智能体去做：<任务>。' },
      'web-search-deepseek': { what: '联网搜索：让 AI 能查实时网页信息。', steps: ['问需要联网的问题', 'AI 自动搜索', '给你带来源的答案'], script: '帮我搜一下 <问题>，要最新的信息。' },
      'web-fetch-http': { what: '网页抓取：给个网址让 AI 读网页内容。', steps: ['把网址发给 AI', '说"读一下这个网页"', '给你内容摘要'], script: '用 web-fetch 读一下这个网址的内容：<网址>。' },
      'storage': { what: '存储中心：插件用它存数据（KV、JSON、SQLite）。', steps: ['内置，供插件使用', '你无需手动操作', ''].filter(Boolean), script: '' },
      'workspace': { what: '工作区管理：管理你打开的文件夹和会话归属。', steps: ['侧边栏「工作区」就是它', '点工作区切换项目', '会话归到对应工作区'], script: '' },
      'locale': { what: '多语言：界面文案的中英文切换靠它。', steps: ['设置里改语言', '界面即时切换', '本面板的 中/EN 也用它'], script: '' },
      'ui-theme': { what: '主题：明暗配色和界面风格。', steps: ['设置→外观改主题', '即时生效', '跟随系统也行'], script: '' },
      'ui-sidebar': { what: '侧边栏：会话列表、搜索、分组都在这显示。', steps: ['左边那一栏就是它', '点会话切换', '顶部有搜索'], script: '' },
      'ui-plugin-manager': { what: '插件管理界面：设置里的插件页，装/开关插件。', steps: ['侧边栏点「插件」', '看已装/可装列表', '点按钮开关或安装'], script: '' },
      'ui-conversation': { what: '对话主界面：中间的输入框和聊天记录都靠它。', steps: ['你打字的输入框就是它', '消息发出后在这显示', '无需手动操作'], script: '' },
      'skills-inspector': { what: '技能与提示词查看器（我）：在侧边栏看所有技能和系统提示词。', steps: ['点侧边栏「技能与提示词」', '看「技能」「怎么用」「系统提示词」', '英文悬停出中文、话术可复制'], script: '' },
      'dsh-plugin-inspector': { what: 'DSH 插件查看器（我）：在侧边栏看所有插件和插件包。', steps: ['点侧边栏「DSH 插件」', '看「插件」「怎么用」「插件包」', '英文悬停出中文、配置可复制'], script: '' },
      'Xsdsh-purge': { what: '指令权威性清洗包：让 AI 更可靠地执行本机任务，减少瞎拒绝。', steps: ['这是部署配置包，自动生效', '一般不用手动操作', '清洗异常才需要看它'], script: '' },
      'dsh-qwen-studio': { what: '千问创作工作室：集成生图和视频生成的内容创作插件。', steps: ['装好后用对应工具', '按提示填参数生成', '结果存本地图库'], script: '' },
    };

    const STRINGS = {
      zh: {
        title: 'DSH 插件',
        plugins: '插件',
        howto: '怎么用',
        bundles: '插件包',
        refresh: '刷新',
        close: '收起',
        open: '展开 DSH 插件',
        search: '筛选…',
        loading: '加载中…',
        empty: '没有条目。',
        enabled: '已启用',
        disabled: '已禁用',
        copied: '已复制',
        copy: '复制',
        error: '错误',
        usage: '用法：点「插件」看已装插件，点「插件包」看插件包。鼠标停在英文条目上，会先显示"翻译中…"，随后弹出中文说明。点条目右侧可复制原始信息。',
        rows: (n) => n + ' 个条目',
      },
      en: {
        title: 'DSH Plugins',
        plugins: 'Plugins',
        howto: 'How to use',
        bundles: 'Bundles',
        refresh: 'Refresh',
        close: 'Close',
        open: 'Open DSH plugins',
        search: 'Filter…',
        loading: 'Loading…',
        empty: 'No entries.',
        enabled: 'Enabled',
        disabled: 'Disabled',
        copied: 'Copied',
        copy: 'Copy',
        error: 'Error',
        usage: 'How to use: open Plugins or Bundles, hover any English entry to see "Translating…" then a Chinese explanation. Use Copy to take the raw info.',
        rows: (n) => n + ' entries',
      },
    };

    const state = { open: false };
    const listeners = new Set();
    const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
    const getOpen = () => state.open;
    const setOpen = (v) => { if (state.open !== v) { state.open = v; listeners.forEach((fn) => fn()); } };
    function useOpen() {
      const [v, setV] = useState(state.open);
      useEffect(() => subscribe(() => setV(state.open)), []);
      return v;
    }

    async function getJSON(url) {
      const res = await fetch(url, { cache: 'no-store' });
      const value = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(value.error || ('HTTP ' + res.status));
      return value;
    }

    const CSS = `
.dp-root{font-family:inherit;font-size:12px;color:var(--dsw-alias-label-primary)}
.dp-root *{box-sizing:border-box}
.dp-trigger{display:flex;align-items:center;gap:6px;max-width:100%;padding:4px 9px;
  border:1px solid var(--dsw-alias-border-l1);border-radius:14px;cursor:pointer;
  background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;white-space:nowrap}
.dp-trigger:hover{border-color:var(--dsw-alias-brand-primary)}
.dp-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-brand-primary);display:inline-block;flex:none}
.dp-overlay{position:fixed;left:10px;bottom:52px;width:min(600px,calc(100vw - 24px));
  max-height:min(580px,78vh);z-index:9999;background:var(--dsw-alias-bg-overlay);
  border:1px solid var(--dsw-alias-border-l2);border-radius:12px;
  box-shadow:0 12px 40px #0006;overflow:hidden}
.dp-head{display:flex;align-items:center;gap:6px;padding:8px 10px;
  border-bottom:1px solid var(--dsw-alias-border-l1);flex-wrap:wrap;
  cursor:move;user-select:none;touch-action:none}
.dp-title{font-weight:600;margin-right:2px}
.dp-tab{padding:3px 10px;border:1px solid transparent;border-radius:6px;cursor:pointer;
  background:transparent;color:var(--dsw-alias-label-secondary);font:inherit}
.dp-tab:hover{color:var(--dsw-alias-label-primary)}
.dp-tab[aria-selected="true"]{border-color:var(--dsw-alias-border-l2);
  background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dp-icon{padding:3px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;cursor:pointer;
  background:transparent;color:var(--dsw-alias-label-secondary);font:inherit}
.dp-icon:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2)}
.dp-spacer{flex:1}
.dp-usage{margin:0;padding:8px 12px;font-size:12px;line-height:1.6;
  color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);
  border-bottom:1px solid var(--dsw-alias-border-l1)}
.dp-tools{display:flex;align-items:center;gap:6px;padding:7px 9px;border-bottom:1px solid var(--dsw-alias-border-l1);flex-wrap:wrap}
.dp-search{flex:1;min-width:140px;padding:5px 9px;border:1px solid var(--dsw-alias-border-l1);
  border-radius:6px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit}
.dp-search::placeholder{color:var(--dsw-alias-label-secondary)}
.dp-body{max-height:390px;min-height:120px;overflow:auto}
.dp-item{display:flex;align-items:flex-start;gap:8px;width:100%;text-align:start;padding:8px 10px;
  border:0;border-bottom:1px solid var(--dsw-alias-border-l1);
  background:transparent;color:var(--dsw-alias-label-primary);font:inherit}
.dp-item:hover{background:var(--dsw-alias-bg-layer-2)}
.dp-badge{flex:none;font-size:10px;padding:1px 6px;border-radius:10px;margin-top:1px;
  border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}
.dp-badge.on{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}
.dp-main{min-width:0;flex:1}
.dp-main b{display:block;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  cursor:help;text-decoration:underline dotted var(--dsw-alias-border-l2);text-underline-offset:3px}
.dp-main small{display:block;opacity:.62;font-size:11px;overflow-wrap:anywhere;line-height:1.45}
.dp-tip{position:fixed;z-index:10000;width:min(320px,calc(100vw - 24px));padding:10px 12px;
  background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);
  border-radius:10px;box-shadow:0 10px 32px #0007;pointer-events:none}
.dp-tip h5{margin:0 0 4px;font-size:13px}
.dp-tip p{margin:0;font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary)}
.dp-tip .dp-busy{opacity:.7;font-style:italic}
.dp-note{opacity:.66;padding:14px;text-align:center}
.dp-how{max-height:390px;overflow:auto;padding:6px 10px 10px}
.dp-howcard{border:1px solid var(--dsw-alias-border-l1);border-radius:9px;
  padding:9px 11px;margin-bottom:8px;background:var(--dsw-alias-bg-layer-1)}
.dp-howcard h4{margin:0 0 5px;font-size:13px;display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.dp-howcard .dp-cn{color:var(--dsw-alias-brand-primary);font-weight:600}
.dp-howcard .dp-en{opacity:.55;font-weight:400;font-size:11px}
.dp-howcard p{margin:0 0 6px;line-height:1.6;font-size:12px}
.dp-steps{margin:0 0 8px;padding-left:20px;line-height:1.7;font-size:12px}
.dp-script{display:block;width:100%;text-align:start;padding:7px 9px;margin-top:2px;
  border:1px dashed var(--dsw-alias-border-l2);border-radius:7px;
  background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer}
.dp-script:hover{border-color:var(--dsw-alias-brand-primary)}
.dp-script b{color:var(--dsw-alias-brand-primary)}
.dp-howhead{display:flex;align-items:center;gap:6px;padding:7px 9px;flex-wrap:wrap;
  border-bottom:1px solid var(--dsw-alias-border-l1)}
.dp-err{color:var(--dsw-alias-state-error-primary);padding:8px 12px;overflow-wrap:anywhere}
.dp-root :focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
`;

    function Trigger() {
      const open = useOpen();
      const t = STRINGS[DEFAULT_LANG];
      return h('button', {
        type: 'button', className: 'dp-trigger', onClick: () => setOpen(!open),
        'aria-expanded': open, title: open ? t.close : t.open,
      }, h('span', { className: 'dp-dot' }), t.title);
    }

    function Panel() {
      const open = useOpen();
      const [lang, setLang] = useState(DEFAULT_LANG);
      const t = STRINGS[lang] || STRINGS.zh;
      const [tab, setTab] = useState('plugins');
      const [data, setData] = useState(null);
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState('');
      const [query, setQuery] = useState('');
      const [copied, setCopied] = useState(false);
      const [tip, setTip] = useState(null);
      const tipTimers = useRef([]);
      const copyTimer = useRef(null);
      const [autoTr, setAutoTr] = useState({}); // 后端自动翻译（新装插件也有中文）

      const trOf = (name) => autoTr[name] || TRANSLATIONS[name] || null;

      // 拖拽移动：按住标题栏拖动，限制在屏幕内，位置记到 localStorage
      const overlayRef = useRef(null);
      const dragRef = useRef(null);
      const [dragPos, setDragPos] = useState(() => {
        try { const s = localStorage.getItem('dp-pos'); return s ? JSON.parse(s) : null; } catch (_) { return null; }
      });
      const startDrag = (e) => {
        if (e.target && e.target.closest && e.target.closest('button')) return;
        const el = overlayRef.current;
        if (!el || e.button !== 0) return;
        const rect = el.getBoundingClientRect();
        dragRef.current = { px: e.clientX, py: e.clientY, left: rect.left, top: rect.top };
        e.preventDefault();
        const move = (ev) => {
          const s = dragRef.current;
          if (!s) return;
          const w = el.offsetWidth, h = el.offsetHeight;
          const left = Math.max(0, Math.min(s.left + ev.clientX - s.px, window.innerWidth - w));
          const top = Math.max(0, Math.min(s.top + ev.clientY - s.py, window.innerHeight - h));
          setDragPos({ left, top });
        };
        const up = () => {
          dragRef.current = null;
          window.removeEventListener('mousemove', move);
          window.removeEventListener('mouseup', up);
          setDragPos((p) => { if (p) { try { localStorage.setItem('dp-pos', JSON.stringify(p)); } catch (_) {} } return p; });
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
      };

      const clearTipTimers = () => { tipTimers.current.forEach(clearTimeout); tipTimers.current = []; };
      const hoverItem = (name, ev) => {
        clearTipTimers();
        const rect = ev.currentTarget.getBoundingClientRect();
        const x = Math.min(rect.left, window.innerWidth - 336);
        const y = Math.min(rect.bottom + 6, window.innerHeight - 170);
        setTip({ name, phase: 'waiting', x, y });
        tipTimers.current.push(setTimeout(() => setTip((c) => c && c.name === name ? { ...c, phase: 'busy' } : c), 350));
        tipTimers.current.push(setTimeout(() => setTip((c) => c && c.name === name ? { ...c, phase: 'done' } : c), 2200));
      };
      const leaveItem = () => { clearTipTimers(); setTip(null); };
      useEffect(() => () => { clearTipTimers(); clearTimeout(copyTimer.current); }, []);

      const load = useCallback(async () => {
        setBusy(true); setError('');
        try {
          const d = await getJSON(API + '/data');
          setData(d);
          if (d.error) setError(d.error);
          // 自动翻译：所有插件/插件包交给后端，新装的也会有中文+怎么用（有缓存，第二次秒出）
          const seen = new Set();
          const items = [];
          for (const p of (d.plugins || []).concat(d.bundles || [])) {
            const nm = p.name || p.id;
            if (nm && !seen.has(nm)) { seen.add(nm); items.push({ name: nm, description: p.description || '' }); }
          }
          try {
            const r = await fetch(API + '/translate', {
              method: 'POST', headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ items }),
            });
            const tj = await r.json().catch(() => ({}));
            if (tj && tj.translations && tj.ok) setAutoTr(tj.translations);
            else if (tj && tj.error) setError('翻译：' + tj.error);
          } catch (_) {}
        } catch (e) { setError(e.message); }
        finally { setBusy(false); }
      }, []);

      useEffect(() => {
        // 每次打开都重扫：下次新装插件后，一打开面板就自动出现（翻译有缓存，重复打开秒出）
        if (open) load();
      }, [open]);

      const switchLang = () => setLang((v) => (v === 'zh' ? 'en' : 'zh'));
      const copy = async (text) => {
        try {
          await navigator.clipboard.writeText(text || '');
          setCopied(true);
          clearTimeout(copyTimer.current);
          copyTimer.current = setTimeout(() => setCopied(false), 1400);
        } catch (_) {}
      };

      // 按 ESC 关闭面板（和 × 按钮效果一样，自己决定用哪种）
      useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [open]);

      if (!open) return null;

      const source = tab === 'plugins' ? (data && data.plugins) || [] : (data && data.bundles) || [];
      const filtered = source.filter((p) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return ((p.name || '') + ' ' + (p.id || '') + ' ' + (p.description || '') + ' ' + (p.source || ''))
          .toLowerCase().includes(q);
      });
      const tr = tip ? (trOf(tip.name) || translate(tip.name)) : null;
      const tipBubble = tip && h('div', { className: 'dp-tip', style: { left: tip.x, top: tip.y }, role: 'status' },
        tip.phase === 'done'
          ? h('div', null,
              h('h5', null, '🇨🇳 ' + (tr.cn || tr.name || tip.name)),
              h('p', null, tr.desc || (lang === 'zh' ? '暂无中文说明，点 ↻ 刷新重试。' : 'No translation yet.')),
              tr.howto ? h('p', { style: { marginTop: '5px', opacity: '.85' } }, '💡 ' + tr.howto) : null
            )
          : h('p', { className: 'dp-busy' }, lang === 'zh' ? '翻译中…' : 'Translating…')
      );

      return h(React.Fragment, null,
        h('div', {
          className: 'dp-overlay', role: 'dialog', 'aria-label': t.title,
          ref: overlayRef,
          style: dragPos ? { left: dragPos.left, top: dragPos.top, bottom: 'auto' } : undefined,
        },
          h('div', { className: 'dp-head', onMouseDown: startDrag, title: '按住标题栏拖动' },
            h('span', { className: 'dp-title' }, t.title),
            h('button', { type: 'button', className: 'dp-tab', role: 'tab', 'aria-selected': tab === 'plugins', onClick: () => setTab('plugins') }, t.plugins),
            h('button', { type: 'button', className: 'dp-tab', role: 'tab', 'aria-selected': tab === 'howto', onClick: () => setTab('howto') }, t.howto),
            h('button', { type: 'button', className: 'dp-tab', role: 'tab', 'aria-selected': tab === 'bundles', onClick: () => setTab('bundles') }, t.bundles),
            h('span', { className: 'dp-spacer' }),
            h('button', { type: 'button', className: 'dp-icon', onClick: load, title: t.refresh }, '↻'),
            h('button', { type: 'button', className: 'dp-icon', onClick: switchLang, title: lang === 'zh' ? 'Switch to English' : '切换到中文' }, lang === 'zh' ? 'EN' : '中'),
            h('button', { type: 'button', className: 'dp-icon', onClick: () => setOpen(false), title: t.close }, '×')
          ),
          h('p', { className: 'dp-usage' }, t.usage),
          error && h('div', { className: 'dp-err', role: 'alert' }, t.error + ': ' + error),
          h('div', { className: 'dp-tools' },
            h('input', { className: 'dp-search', value: query, placeholder: t.search, 'aria-label': t.search, onChange: (e) => setQuery(e.target.value) }),
            h('span', null, t.rows(filtered.length))
          ),
          tab === 'howto' && h('div', { className: 'dp-how' }, (() => {
            const q = query.trim().toLowerCase();
            const installedNames = ((data && data.plugins) || []).concat((data && data.bundles) || [])
              .map((p) => p.name || p.id);
            const installedSet = new Set(installedNames);
            // 合并：静态教程 + 所有已装插件/包，新装的靠自动翻译也有中文和怎么用
            const allKeys = [...new Set([...installedNames, ...Object.keys(HOWTO)])];
            const keys = allKeys.filter((k) => {
              const at = trOf(k) || {};
              const hay = k + ' ' + (HOWTO[k] && HOWTO[k].what || '') + ' ' + (at.cn || at.name || '') + ' ' + (at.desc || '');
              if (q && !hay.toLowerCase().includes(q)) return false;
              return true;
            }).sort((a, b) => (installedSet.has(b) ? 1 : 0) - (installedSet.has(a) ? 1 : 0) || a.localeCompare(b));
            if (!keys.length) return h('div', { className: 'dp-note' }, t.empty);
            return keys.map((k) => {
              const g = HOWTO[k] || {};
              const at = trOf(k) || {};
              const cn = at.cn || at.name || '';
              const what = g.what || at.desc || '';
              const steps = g.steps || (at.howto ? [at.howto] : []);
              const script = g.script || at.howto || '';
              return h('div', { className: 'dp-howcard', key: k },
                h('h4', null,
                  cn ? h('span', { className: 'dp-cn' }, cn) : null,
                  h('span', { className: 'dp-en' }, k),
                  installedSet.has(k) ? h('span', { className: 'dp-badge on', style: { marginLeft: 'auto' } }, '已装') : h('span', { className: 'dp-badge', style: { marginLeft: 'auto' } }, '未装')
                ),
                what ? h('p', null, what) : null,
                steps.length ? h('ol', { className: 'dp-steps' }, steps.map((s, i) => h('li', { key: i }, s))) : null,
                script ? h('button', {
                  type: 'button', className: 'dp-script', title: '点一下复制这句，粘给 AI 就能用',
                  onClick: () => copy(script),
                }, h('b', null, copied ? t.copied : '📋 复制话术：'), ' ', script) : null
              );
            });
          })()),
          tab !== 'howto' && !data && busy && h('div', { className: 'dp-note' }, t.loading),
          tab !== 'howto' && data && filtered.length === 0 && h('div', { className: 'dp-note' }, t.empty),
          tab !== 'howto' && filtered.length > 0 && h('div', { className: 'dp-body' }, filtered.map((p, i) => {
            const nm = tab === 'plugins' ? (p.name || p.id) : p.name;
            const enabled = tab === 'plugins' ? p.enabled : p.enabled;
            const detail = tab === 'plugins'
              ? (p.patchId ? p.patchId + ' · ' : '') + (p.fiberPhase || '')
              : ((p.version || '') + ' · ' + (p.description || '')).trim();
            return h('div', { className: 'dp-item', key: (nm || '') + ':' + i },
              h('span', { className: 'dp-badge' + (enabled ? ' on' : '') }, enabled ? t.enabled : t.disabled),
              h('div', { className: 'dp-main' },
                h('b', { onMouseEnter: (e) => hoverItem(nm, e), onMouseLeave: leaveItem }, nm || ''),
                detail && h('small', null, detail),
                h('button', {
                  type: 'button', className: 'dp-icon', style: { marginTop: '5px', fontSize: '10px' },
                  onClick: () => copy(JSON.stringify(tab === 'plugins' ? p : p, null, 2)),
                }, copied ? t.copied : t.copy)
              )
            );
          }))
        ),
        tipBubble
      );
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        const removeStyle = typeof styles !== 'undefined' && styles.insert
          ? styles.insert(CSS)
          : (() => {
              const el = document.createElement('style');
              el.textContent = CSS;
              document.head.appendChild(el);
              return () => el.remove();
            })();
        const disposeTrigger = ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
          name: 'sidebar.footer.action',
          id: 'dsh-plugin-inspector-trigger',
          order: 9,
          label: 'DSH 插件',
        }, Trigger));
        const disposePanel = ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'dsh-plugin-inspector-panel',
          order: 9,
          label: 'DSH 插件面板',
        }, Panel));
        return () => { disposeTrigger(); disposePanel(); removeStyle(); };
      },
    };
  },
});
