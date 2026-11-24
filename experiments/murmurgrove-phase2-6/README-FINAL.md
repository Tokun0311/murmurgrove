# Murmurgrove · Final Local Research Release
## Phase 4.0 · Attested Evolution / Withdrawal / Evidence-free Public Preview

**状态：经过测试的本地研究原型最终交付版（2026-11-24）。这不是已部署的公开站点，也不是经科学验证的生命模型。**

本版以 Phase 3.3 的真实 TOW ARCHIVE 冻结基线为起点，在完全保留原来祖母绿、极细贝塞尔丝缕、可见的6×定向流动、3种抽象观察角度、65%–2400%指向缩放、主体内部独立节点、桌面/手机聚焦卡片的前提下，封闭证据、撤回、私人与公开视图的技术链路。

### A. 如果你已经安装过 Phase 3.3：只能使用 SAFE UPGRADE

**不要用“Fresh Full Install”直接覆盖已经用来记账的项目。** 完整安装包带有初始空索引，合并时可能覆盖真实事件和历史。

1. 可选但建议先备份整个 `experiments/murmurgrove-phase2-6/public/data/` 文件夹。
2. 将 `Murmurgrove_Phase4_0_Final_Safe_Upgrade.zip` 解压，合并其 `experiments` 文件夹到内层 Git 项目：
   `C:\Users\deng\Desktop\tow-archive\tow-archive\`
3. 双击 `experiments\murmurgrove-phase2-6\MIGRATE-FINAL.cmd`。只在缺失时创建 **两个新的空索引**：`withdrawals/index.json` 与 `source-reviews/index.json`。若它们已存在，则校验后保留，绝不重置。
4. 双击 `VERIFY-FINAL.cmd`（允许已经有私人的已封存事件），确认 integrity PASS。原来的 `VERIFY-THREADS.cmd` 现在也执行这项无破坏的完整性检查。
5. 双击原来的 `OPEN-THREADS.cmd`，访问 `http://127.0.0.1:4186/`。

升级 ZIP **故意不包含任何 `public/data/` 文件**，因此不会覆盖观展来源、真实事件、版本、截图、撤回或已有计算状态。它也不会修改网站根目录 `src/`、`dist/`、Cloudflare 配置或者 Git 提交。

### B. 全新沙盒安装（没有旧数据）

仅在确实需要从零建立新沙盒时使用 `Murmurgrove_Phase4_0_Final_Fresh_Complete.zip`，按相同的内层项目位置解压合并，运行 `VERIFY-FINAL.cmd`，再运行 `OPEN-THREADS.cmd`。首次应有181条来源记录、174个可显示节点、158条原有可见元数据关系、20个当前独立节点、0条本人确认事件、0条真实Writing激活，以及0条历史形态见证。

### C. 已完成的功能

- **研究时间**：57条带有经过核实观展日期的展览记录；日历记录不是入库时刻或生命事件。
- **来源版本**：作者批准并提供经核实的两文件导出后，能封存源数据版本，比较内容和元数据关系，列出尚无经过核实坐标的新节点；不会凭空给它生成位置。
- **光学时刻**：作者主动捕获真实当前画面并封存；与规则重建严格区别。
- **本人研究行为**：`Encounter` / `Reinterpretation` 草稿导出、作者再次批准、本地封存、确定性规则演算和有来源的计算快照。不能靠观看网页自动产生真实研究事件。
- **事件撤回（新增）**：`WITHDRAW-LIVED-ACT.cmd` 需要作者填写真实事件 ID 并再次授权。撤回后该事件从当前形态计算、History 和卡片视觉活动中消失；含撤回事件的旧规则快照被隐藏。之后的新事件仍可正常封存新状态，并显式记录当时排除过哪些事件。
- **Writing/关系证据审查（新增）**：`scripts/review-source-claim.mjs` 仅能核验来源版本中已有的、非隔离的真实记录；Writing 必须存在真实 Markdown 文件并且字节哈希相符，关系审查的两端与边也必须已存在于核实的来源数据中。审查记录不自动生成新连线、Writing 根系、作者生命事件或成熟推进核。
- **公开预览净化（新增）**：`BUILD-PUBLIC-PREVIEW.cmd` 只复制经过核验的初始公开基线与必要模块，生成 `dist-public/`。所有本人行为、撤回日志、光学截图、规则快照、审查记录以及其他私人来源版本均不进入该目录。`OPEN-PUBLIC-PREVIEW.cmd` 可在 `http://127.0.0.1:4190/` 查看净化版本，**不会**上传到互联网。
- **完整性检查（新增）**：`VERIFY-FINAL.cmd` 校验来源文件、六种证据索引、历史记录的字节哈希及连续性，既适用于空白安装，也适用于已有私人真实资料的安装。

### D. 撤回不是物理删除

这是关系到作者伦理的重要区分：

1. “撤回”即时影响**当前界面与演算**，不再把撤回的行为当作继续有效的生命输入。
2. 为保证来源历史可审计，私人沙盒仍保留原始封存 JSON；本地服务器如被其他人访问，仍可能读到原文件，因此本地沙盒**只监听 127.0.0.1**，不能以它作为公开部署目录。
3. 如果此前把私人文件提交到 Git、Cloudflare、外部备份或分享给别人，不能靠一个按钮实现彻底删除。彻底清除必须单独制定仓库历史、托管平台与备份清理计划，并经本人授权。本工具不会自作主张删除任何不可逆的来源。
4. 生成的 `dist-public/` 是**另一套文件**，不包含私人文件目录；仍需作者审查其他公开内容的版权、研究伦理及第三方许可。

### E. 真正的 Writing 与新研究关系

当前已冻结基线没有任何真实的 Writing 记录，且元数据关联均非生命激活。因此**不允许**用虚构文章、模拟 Writing 或自动猜测研究关系来制造视觉效果。

未来当你在真实 TOW ARCHIVE 中新增写作或核实关系时：

1. 在网站 `src/data/` 中完成真实记录（包括需要的来源、日期与关系声明），通过原有网站构建及结构核验流程产生新的 `known-data-baseline.v1.json` 与 `navigation.json` 导出。
2. 作者核对差异后，使用 `CAPTURE-ARCHIVE-VERSION.cmd` 记录来源版本。这一步不会自动改变 T₀ 坐标或伪造历史生命体。
3. 可以通过下列示例在**作者明确批准后**进行来源声明审查。无效 Writing 或不存在的关系会被程序拒绝。审查本身依旧不是生理激活：

```powershell
node scripts/review-source-claim.mjs --kind relation --from "concept:EXISTING-ID" --to "institution:EXISTING-ID" --note "Describe the real source relationship reviewed by the author." --author-approved
node scripts/review-source-claim.mjs --kind writing --record "writing:REAL-RECORD-ID" --note "Describe the verified, personally authored real writing source." --author-approved
```

4. **写作激活阈值、生命机制和从元数据升级为真实机械关系仍未通过真实来源协议，故维持关闭。** 这是一项证据限制，不是代码缺失导致的自动授权。

### F. 技术测试与性能边界

- 测试从 Phase 3.3 的104项扩展到 **112项**，包含针对撤回、二次封存、证据篡改、非破坏迁移、关系审查和净化输出的新增测试。旧回归测试是针对空白研究基线的测试，**已有私人研究事件时应运行 `VERIFY-FINAL.cmd`，不要用冻结基线回归测试判断私人工作区是否损坏**。只有干净测试副本才运行 `VERIFY-DEVELOPMENT-TESTS.cmd`。
- 浏览器模拟（Chromium 注入受信本地模块）检验桌面1220×810与手机390×844的初始加载、History、事件撤回基线、三个显示视角、缩放和无 JS 错误。运行环境屏蔽普通浏览器 URL 访问，因此这**不等于**实体手机、真实线上 CDN 或屏幕阅读器完整测试。
- 公开预览在真实本地 HTTP 服务器上返回正常，私人事件路径和管理脚本返回404。
- 支持 `prefers-reduced-motion`。浏览器 Canvas 使用 DPR 上限1.5，但并未对所有设备保证60 FPS。
- 原始 `T0.json`、`known-data-baseline.v1.json`、`navigation.json` 和 `manifest.json` 的校验摘要与最初冻结版一致。

### G. 能自行运行的事项与必须由本人决定的事项

**自动化/技术流程可自行运行：** 渲染、既有档案索引、哈希完整性验证、模型演算、净化预览、已有来源版本比较、测试、非破坏迁移。

**必须由本人明确决定：** 将某次个人研究行为标记为真实发生；确认写作归属及研究关系；撤回具体记录；是否披露私人笔记、关联证据或任何个人信息；对外正式发布。此项目未自动进行 Git 提交、Cloudflare 部署或历史删除。

### H. 项目是否已经完成？

**作为“可以本地探索、有来源约束、可以安全地开始累积真实历史、可以输出去私人证据的公开预览”的研究原型，Phase 4.0 是最后一个规划中的技术交付阶段。**

**作为“与未来真实 TOW ARCHIVE 更新无缝同步、十年演化、能够证明历史生理形态，并且可以正式公开”的完整长期生命系统，还不能宣称完成。** 真正的生命史需要未来实际发生并由作者确认的行为、Writing 和关系，以及真实日后累积的版本与外部运行验收。这个限制不能由软件或助手自行跳过。
