murmurgrove / editor v0.2
LOCAL-FIRST · PORTABLE · EVIDENCE-FIRST

一、这次更新的功能

1. 新增 Exhibition 后，编辑器会在文字停止输入约 1 秒后自动进行本地扫描，也可点击 Analyze record 立即扫描。
2. 自动对照网站已有的 People、Institutions、Concepts 文件，尝试识别展览标题、地点、正文中的名称与术语。
3. Concepts 支持少量中、日、英文同义术语词表。结果标记为 EXACT MATCH 或 VOCABULARY MATCH；它们都只是“建议”。
4. 每条建议展示摘录、出处（标题、地点或正文）、已有档案的文件 ID。未经人工勾选确认，绝不会写入关系字段。
5. 展示与现有展览共享艺术家、机构或概念 ID 的“可能相关展览”。这只证明档案字段重叠，不证明艺术史上的思想关联。
6. 可选 AI 辅助：点击 Copy AI analysis prompt，把提示词复制到 ChatGPT；将 ChatGPT 返回的 JSON 粘贴回编辑器并点击 Validate proposed AI links。编辑器会拒绝不存在的 ID、没有找到原文依据的建议，以及未在文字中出现的艺术家/机构。通过检查的建议仍需手动勾选。
7. Apply approved relations to form 仅将选中的 ID 写入当前编辑表单。要真正更新本地公开文件，仍需点击 Publish to local Astro files 并自行 GitHub Desktop Commit / Push。

二、Windows 安装和升级

目前正在使用 v0.1 的用户：
1. 先在 GitHub Desktop 保存一次当前工作的源码版本。
2. 将新的 ZIP 解压，得到完整的 murmurgrove-editor 文件夹。
3. 复制其中的新版本程序文件到旧项目的 murmurgrove-editor 目录，覆盖同名的程序文件即可；Windows 选择合并文件夹，不要先删除旧编辑器文件夹。
4. 不要删除或覆盖旧目录下的 .private 文件夹；它储存你此前的私人草稿和备份，新 ZIP 中不包含 .private。
5. 双击原项目 murmurgrove-editor/START-EDITOR.bat。
6. 浏览器访问 http://127.0.0.1:4317 。无需 npm install、无需 API key、无需改动网站构建参数。

首次安装：将 ZIP 内的 murmurgrove-editor 整个文件夹放在现有 Astro 网站项目的内层根目录（与 src、public、package.json 同级）。

三、演示一次分析

1. 选择 Exhibitions → + New record。
2. 输入展览名称、日期、地点、正文。
3. 在 04 / RELATIONSHIP ANALYSIS 等待自动扫描结果，或点击 Analyze record。
4. 阅读建议的引文与证据；对实际有关联的 Person / Institution / Concept 打勾。
5. 点击 Apply approved relations to form，仅修改当前表单。你还可以逐个修改关系。
6. 点击 Save private draft 保存私稿。确认没有私人身份资料后，才点击 Publish to local Astro files；再使用 GitHub Desktop Commit → Push。

四、可选 ChatGPT 深度分析（非全自动）

本版本不含后台在线 AI 请求，也不需要 OpenAI API 密钥。离线模式能做术语扫描和关系比对，却无法独立理解深层理论论证。
如果希望获得更深的思想联系：展开 Optional / Deeper analysis with ChatGPT，点击 Copy AI analysis prompt，将提示词粘贴到 ChatGPT 对话，要求它只返回 JSON。将其回复贴到编辑器并点击 Validate proposed AI links。
注意：提示词包含你当前记录的完整研究文字和现有档案的公开条目列表。不要把未公开的个人信息、商业机密或他人的敏感信息复制到云端 AI。该步骤由用户主动发起，绝不自动上传。
AI 的理由和链接只表示假设，不等同于可验证事实。原文片段校验、存在性检查也不能证明 AI 的解释正确，仍需你审阅。

五、与 v0.1 一致的限制

- 所有操作只监听 127.0.0.1；不会向网络公开后台，不会自动推送到 GitHub。
- 原版 .private 文件夹保存草稿/备份；本版也不建立第二个档案数据库。
- 切勿把 .private 复制到 src 或 public；它在编辑器自己的 .gitignore 中被排除 Git，但工作设备的管理员、备份、同步软件仍可能访问。
- 仅 Exhibitions 提供关系智能扫描；其他四类目前仍使用 v0.1 编辑功能。
- 图片上传尚未集成。新记录不会自动更新首页生命体的快照与历史演化，避免不实改变。
- 新的 People/Institutions/Concepts 应先创建真实条目，扫描才能对照其 ID。
- 原来展览详情页如果硬编码了 2026 年，发布其他年份的记录前仍须先修正站点详情模板。
- 保存 needs-review 的公开文件不等于私稿，真正的私人草稿请用 Save private draft。
- 长篇文章、多语言转写、抽象概念仅用离线匹配时可能漏检，不能当作最终学术结论。

六、迁移至个人电脑

将网站 Git 仓库 Clone 到个人电脑，murmurgrove-editor 程序随源码一起迁移。Node.js 装好后双击启动。私人草稿不会由 GitHub 自动迁移，如需迁移须自行加密备份 .private 文件夹。建议离开公司的电脑前清点、备份和妥善处理本地私人资料。

七、测试（可选）

在 murmurgrove-editor 文件夹运行：
    node --test tests/*.test.mjs

可在 http://127.0.0.1:4317 查阅并操作。若端口 4317 已占用，先关闭旧编辑器的黑色 CMD 窗口，再重启新版。
