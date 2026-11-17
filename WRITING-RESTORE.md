# Writing 暂时隐藏（2026-11-17）

Writing 现已从顶部导航和首页入口移除，路由页面已移出 `src/pages`，因此不会生成 `/writing/` 页面。

保留的内容：
- `future-writing-pages/writing/`：原页面代码（包括文章详情页），未删除
- `src/data/writing/`：原草稿与数据，未删除
- `src/content.config.ts`：原内容集合配置

## 日后恢复
1. 将 `future-writing-pages/writing` 移回 `src/pages/writing`。
2. 在 `src/layouts/Base.astro` 的导航和 `src/pages/index.astro` 的首页列表重新增加 Writing 链接。
3. 确认有正式文章，并将其内容 frontmatter 中 `draft: false`。
4. 运行 `npm run build` 测试。

如果之前已经公开过 /writing/，部署时应考虑旧链接重定向；当前项目只有草稿示例。
