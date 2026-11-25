murmurgrove editor / integrated research workspace v1.0
2026-11-25 · 仅本地运行 · 可转移电脑 · 公开档案与私人 Word 原稿分离

这是什么
──────────────
原有 v0.3 的编辑、自动词汇匹配、人物／机构／概念草稿与审核功能全部保留。新增：
1. 从 Word (.docx) 导入正文，并保留原始 Word 二进制文件在 .private/originals，记录 SHA-256。
2. 研究问答：只搜索已经发布的档案；展示原文摘录，点 Read complete source here 可以本地展开全文；点 Open published page 跳到线上文章。
3. 研究深度综合：可以复制引用编号 [S1] 的检索资料到 ChatGPT；如个人电脑本地安装并运行 Ollama + 模型，可点击 Generate local research analysis。本地模型是“可选”，不是默认安装，也不保证每句推理准确。
4. 关系审核：在已经发布的记录之间，区分 documented / interpretive / comparison / revision。必须指定真实来源的连续原文引文和理由，用户确认后写入追加式、哈希链事件记录。
5. 旧知识的新分类：经审核的新关系会进入当前研究层，对已存在的旧记录产生新的读取关系，不暗中修改旧 Markdown 文本。撤回也记录于事件历史。
6. Concept memory：Definition、Interpretation、Development 独立维护；Provisional / Mature 状态；多语言别名；每次编辑保留不可覆盖的旧/新版本副本。检测已知别名冲突。
7. 每次正式发布源文件及经审核的关系后，派生 public/murmurgrove/research/current.json 和历史版本，保留来源摘要、内容 hash、关系类型与证据。不会覆盖 T0、原始生命快照或拟造过去发生的生命事件。
8. 选装网站整合：为各栏目旧记录加入 Reviewed research connections；为 Concepts 页面展示三层研究文本；修复 Exhibitions 参观日期硬编码 2026 年；增加 /research/ 页和（仅在原站缺少时）Writing 阅读页；首页仅添加非常轻的当前研究关系视觉效果，不改变原有 T0 校验与交互。

必须理解的边界
──────────────
• Word 只是原稿；导入不会自动发布。对于 .doc/.pdf/图片格式，不承诺读取；请先另存为 .docx（有文本的 Word）。
• 编辑器的私有 .private 目录只在本机，受到该电脑管理员、企业备份和本机恶意软件的访问风险。个人资料应在个人电脑上处理；不要把私人 Word 文件置入 Git 项目里的公开路径。
• 'needs-review' 是资料核实状态，不是私密性状态。只有 Save private draft 才是不公开；Publish to local Astro files 才写入公开目录，GitHub Commit → Push 后才上线。
• 当前研究层 !== 已经发生的生命历史，视觉上的粒子响应不代表存在真实的历史纤维。
• 不自动上传 Word、不过问浏览器外的私人文件、不自动调用云端 AI；无后台账号/API key；不自动推送 Github。
• 不自动将一个模糊概念合并到另一个概念；即使别名相似，也应经人工核查。暂时不提供自动永久删除、自动改写旧文章或自动生成整段不经审查的生物形态历史。

安装/升级（Windows）
──────────────
1. 先在 GitHub Desktop 保存目前网站状态。关闭旧版编辑器 CMD。
2. 解压 ZIP，得到 murmurgrove-editor 文件夹。复制到网站根目录（和 src、public、package.json 同级），覆盖同名编辑器程序，但【不要删除】旧文件夹。尤其不要删除旧 .private。
3. 双击 murmurgrove-editor/START-EDITOR.bat；浏览器打开 http://127.0.0.1:4317。
4. 如果想让新旧档案关联显示在【公开网站页面】并启用当前研究光学层，双击 INSTALL-RESEARCH-LAYER.bat；先预览修改范围，输入 INSTALL 进行本地安装。它只做加法和小范围代码插入，不覆盖整个网站。
5. 在项目根目录运行 npm run build，并检查 GitHub Desktop 的实际改动。确认无误后 Commit → Push。
6. 删除旧项目或 Cloudflare 的设置不需要再调整。新的 /research/ 页面可在 https://murmurgrove.pages.dev/research/ 打开（只有成功部署后）。
7. 如果你尚未安装网站整合层，编辑器仍可本地运行，但新的公开研究索引/动态关系页面功能需先安装。

实际使用工作流
──────────────
A. 你先在本地 Word 写私有笔记，保留原 Word。完稿后到编辑器选择集合、Import Word text，文字被复制到研究笔记输入框，原 Word 保存另一个只在本地的备份副本。
B. 选 Exhibition / Person / Institution / Concept / Writing，填写标题日期，Analyze record 确认新增人物/机构/概念建议，必要时创建新私有草稿。保存为 Save private draft。
C. 核实事实与引用，检查隐私，再单独发布公开记录。系统更新派生研究索引；你在 GitHub Desktop 检查 diff 决定是否 Push。
D. Ask the archive：随时问一个问题。结果显示与当前公开档案真正匹配的记录、原文片段、旧记录连接与可点击源文。需要自然语言论证可复制带 [S1] 引用的提示词到 ChatGPT，或自行启动个人电脑 Ollama 本地模型。
E. 发现新内容影响旧内容：进入 Review a research relationship，选择已发布的来源和目标记录，附上原文中真实的连续引文与解释。点击 Check evidence，确认后 Approve relationship。新关系添加“当下研究阅读层”，保留以前的原始 Markdown。
F. Concept memory：给概念维护定义、你的解释、思考变化和多语言别名。你可以在这里标注待发展/较成熟，源文件不会被无声覆盖。旧观点版本保存在 src/data/murmurgrove-relations/concept-history。
G. 在 /research/ 浏览公开记录索引以及已审核的跨条目关系。首页 Whole 模式的光学关系层只在当前观看时提供轻微反应；历史版本查看不叠加新研究层。

关闭 / 更换电脑
──────────────
关闭 CMD 即停止本地编辑器。换电脑：安装 Node.js，Git Clone 公开项目，复制编辑器文件夹。用户原始 Word 文件和 .private 不会随 Git 自动迁移；务必使用个人加密备份。源代码和 Git 历史仍可能泄露身份，公开匿名性需要单独审计。

开发与验证
──────────────
  cd murmurgrove-editor
  node --test tests/*.test.mjs
  node install-site.mjs                  （只预览）
  node install-site.mjs --apply          （本地安装）
  node verify-install.mjs                （核验）
  npm run build                          （在网站根目录）

开放问题与限制
──────────────
- 词汇匹配是确定性检索，不是全面的跨语言语义理解。多语言别名列表只覆盖审核后填入的别名与已有词表。
- 公开研究层中可以看到新记录和旧记录的当前关系，但新节点不会强行塞进 2026-11-20 的固定 T0 历史坐标；它们需要后续专门的真实“当前形态”布局/身份认证机制。历史 T0 保持只读。
- 并未完成用户实际 Windows、Cloudflare 生产构建和手机触摸端对新层的真实上线验证。正式发布之前先用本机测试。
- Ollama 模型的 GPU/RAM 要求取决于机器；本安装包不附带模型、不自动安装或访问外部服务。
- 目前电影观影、阅读、演出可标为 Exhibitions 下的具体 kind（screening、film-viewing、lecture、reading 等），但完整 Encounter / Work 独立模型尚未正式分离。不应假称《Possible Love》已自动获得独立 Film 页面。

【v1.0 追加说明：Concept 合并与回退】
──────────────
• 已实现人工合并两个已发布的概念；旧概念与相关文章不删除，旧文件不被篡改，当前研究索引把其关系归到指定 Concept；合并操作另存原因和前后状态。
• 已合并的旧 Concept 不再允许通过普通编辑将其误恢复为独立分类；如要推翻合并，请做有证据的后续修订并保留前一决定，而非删除旧资料。
• Concept Memory 已保存的三个研究层次会作为独立的当前解释状态展示，不会改写原始 Word 文稿或旧 Markdown。

【v1.0 质量验证】
──────────────
• 19/19 Node.js 回归测试通过；Word 原件、草稿隔离、引文检验、相关性审核/撤回、新 Concept/合并、当前索引历史。
• 网站副本：180 条已发布记录、183 条源关系；T0.json、manifest.json、viewer.mjs SHA256 均与原始输入相同。
• 可视模拟：1380px/390px/320px，离线模拟页面资料检索和原文展开，没有运行错误或横向溢出。
• 仍未验证正式 Astro 的 npm run build、Cloudflare 发布，以及你本人的 Windows 电脑和真实 Word 文件。若本机 build 失败，请不要 Push。
• 别名冲突、概念合并、关系强度属于审核机制，不保证 AI 对事实或理论理解正确。全面的工作文献检索与 OCR、跨语言语义分析仍需人工或可选本地模型辅助。

• Word 导入只抽取可读的正文文本，可能不保留图片、批注、复杂表格和样式；原 .docx 二进制始终单独保存。
