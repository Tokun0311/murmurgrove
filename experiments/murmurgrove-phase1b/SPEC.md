# Murmurgrove · Phase 1B 数学状态演化与可验证生命规范

**版本：** Phase 1B.0 · MVO numerical reference implementation  
**日期：** 2026-11-19  
**独立性：** 不修改 TOW ARCHIVE、不生成 3D 渲染、不接入线上 History。  
**输入：** Phase 1A `murmurgrove.event.v1` 事件日志。  
**输出：** 可序列化的三维潜在力学状态与 SHA-256 形态指纹。

> **重要区分：** 这里的 `nodes`、`fibers`、`branches` 是动力学解算的**潜在材料/控制点**，不是建议在网站上画成「发光圆点＋连线」。概念节点只作为不可见方向场的源，关系纤维未来可表现为编织的连续组织；不能把 debug 数据图当作最后的艺术表现。

## 1. 基线兼容

`src/protocol.mjs` 原样复制 Phase 1A。形态引擎在启动时调用该协议的 `replay(events)` 做全日志预检：校验稳定 ID、事件时间单调性、引用存在性、唯一序号、幂等重复和 `effectiveAt === recordedAt`。一份有冲突或回填生命时间的日志会被拒绝，而不是默默修补。

- `archive.record.upsert` 首次录入为模型增加低活性的可用材料，**没有生命脉冲**。`reason: correction` 更新知识，但保留材料的位置、休眠与年轮。
- `archive.link.assert` 只声明经过确认的关系；**不会**凭空生成带张力的活动纤维。
- `life.encounter / life.writing / life.connection / life.reinterpretation` 才能激活其 `recordRefs`，以及其明确 `linkRefs` 对应的有源张力纤维。
- 撤销不正确关联时，当前投影删除其不再成立的纤维，不制造一个“戏剧性的死亡”事件；过去曾经实际呈现的形态仍可按此前 `asOf` 回放。**这种当前投影的删除不等于伦理 Purge。**
- 展览的历史发生日 `occurredOn` 不会被当成生命体的生长触发时刻。缓慢沉积从事件确实被系统确认的 `recordedAt` 开始；真实历史年龄仍作为知识数据保留，未来渲染可用于沉积材质但不能倒写 Lived History。

## 2. 状态结构

```text
MorphologyState
  modelVersion  ·  asOf  ·  morphologyHash
  nodes[]      { id, kind, seed, position, activity, lignification,
                 activeEver, sedimentLayers, sedimentAnchors[], scarFactor, lastActiveAt }
  fibers[]     { id, from, to, points[5], tension, activity, lignification,
                 activatedBy[], fossilLayers[], sedimentLayers, scarFactor }
  branches[]   { id, fromFiber, causedBy, toRecord, bornAt,
                 points[3], angleDegrees, sedimentOf }
  lifeCount    ·  lastLifeEvent
```

`fossilLayers[]` 和 `sedimentAnchors[]` 保存已发生过的局部形态基底。它们是**数值层历史证据**，并非永远需要同时在屏幕中渲染的实体。未来需要压缩和分级持久化。

## 3. 四个独立数学模块

### 3.1 确定性空间起点和 Concept 方向场

对于稳定记录 ID `id`：

\[
\mathbf P_0(id)=2\cdot U(\mathrm{SHA256}(\texttt{murmurgrove:seed:v1:}+id))-1 \in [-1,1]^3
\]

其中 `U` 从哈希的三个非重叠 53 位片段提取各自分量，不使用伪随机数发生器，也不依赖用户设备的时间。

每个被真实生命事件激活过的 Concept，成为一个**不渲染实体的局部方向场**。原型使用由 ID 定义的旋转轴 `a_c`、场源位置 `p_c`、活性 `A_c` 和衰减距离计算：

\[
\mathbf V_c(\mathbf x) \approx
 {\kappa A_c \over (\varepsilon+\|\mathbf x-\mathbf p_c\|^2)^{3/2}}
 \big[0.65\,\widehat{\mathbf a_c\times(\mathbf x-\mathbf p_c)}
 -0.35\,\widehat{\mathbf x-\mathbf p_c}\big]
\]

多个概念场叠加后进行幅度钳制。该混合场包含切向旋流与径向局部收束，既不是静态的节点连线图，也不预设整具身体的头尾。**方向场目前只是最小局部规则；尚未验证宏观涌现性和全局重新定向。**

### 3.2 Writing 激活关系张力与可弯曲纤维

一条经过明确声明的 link `l=(A,B,w)`，在被真实 `life.*` 事件引用后才拥有有效张力：

\[
T_l(t^+) = \min(T_{\max},\, T_l(t^-)+w\,g_{\mathrm{eventType}})
\]

不同事件类别有暂定增益 `g`（例如 Writing/重新解释强于 Encounter），但 `w` **只能来自 Phase 1A 显式确认的 `link.strength`**。Phase 1A 尚无可靠写作深度字段；因此**没有**从文章字数、词频或自动推断的重要性虚构权重。

局部数值松弛使用距离弹簧：

\[
\mathbf F_{A\leftarrow B}\propto {T_l\over 1+T_l}\,\max(0,d_{AB}-d_{rest})\,\widehat{(P_B-P_A)}
\]

受力按材料质量与有限刚度分配。每条已激活真实关系使用 5 个路径控制点；控制点同时受到纤维旧曲率记忆和附近 Concept 方向场影响，因此**初始受力路径不是一条直线**。这个路径是形变骨架，不是未来 UI 的连线样式。

### 3.3 半衰活性和木质化（精确分段时间积分）

无真实研究生命事件注入时，活性指数衰减：

\[
A(t+\Delta)=A(t)e^{-\lambda\Delta},\qquad \lambda=\ln2/\tau_{1/2}
\]

独立且单调的木质化记忆 `L` 使用动力式：

\[
\frac{dL}{dt}=k\,(1-A(t))\,(1-L),\qquad 0\le L<1
\]

这一式有封闭积分形式：

\[
L(t+\Delta)=1-(1-L(t))\exp\left[-k\left(\Delta-\frac{A(t)(1-e^{-\lambda\Delta})}{\lambda}\right)\right]
\]

这样在2037年插入**日期纠错/元数据修改**等维护事件，不会因为多次计算休眠而改变最终结果。`L` **不会**在再激活时清零；活性则可以重新升高。

刚度有上界：

\[
K(L)=1+24L^4 \quad (K\le25)
\]

这是对用户原建议「刚度趋于无穷」的稳定性修改：**绝不真的设置无穷刚度**，否则旧基底不可能参与后来重构，也容易导致病态数值迭代。

### 3.4 旧方向在2036年重新激活

如果曾经真实活动过的 Concept 或纤维木质化程度 `L >= 0.85`：

- 重新激活**不清零 `L`、坐标或之前的形态记忆**；
- 新激活产生 `sedimentLayers += 1` 和 `scarFactor += 0.35`（此为可测试状态量，不是自动施加装饰性伤痕）；
- `sedimentAnchors[]` 或 `fossilLayers[]` 保留再激活之前的**完整数值基底**；
- 如果这次事件引用了一条**新的真实显式关联**，且它连接到一条已木质化的历史纤维，则生成附有事件来源的 `branch`。分叉由旧纤维控制点、当前新记录位置和稳定旋转轴确定，可测量分叉角 `angleDegrees`；
- 仍然没有任何无来源的自动研究关系。分叉不是凭空新增 Archive Link，它是**已有真实关联所触发的材料形变**。

## 4. 时间连续性与可重现性

- 状态 `simulateMorphology(events, {asOf})` 按事件 `seq` 顺序、以 UTC `recordedAt` 推进。`effectiveAt` 由 Phase 1A 确保等于 `recordedAt`。
- 使用 SHA-256 作为 ID 初始条件和状态指纹；所有数组按 ID 排序，数值输出四舍五入到固定小数位。确保**同一输入、同一版本、同一时刻**得到同一 JSON 状态和哈希（在本 Node 参考环境内验证）。
- `microSignal(morphology,id,instant)` 用统一 UTC 时刻和 ID 相位计算不写入生命事件的轻微微循环。它不改变长期形态，也不直接实现任何真实 WebGL 光效。
- 不承诺不同 CPU、GPU、JS 引擎的浮点数**逐比特**一致，后续分布式架构应约定跨端容差、版本锁定和权威计算方式。

## 5. 数值验收：合成 2027 → 2036

样例历史：2027年 Concept 录入；2030年补录2027年的展览并确认一次 Encounter；2036年写作与旧方向建立真实显式联系并被重新解释；2037年仅修正旧展览日期。

使用 `node scripts/dynamics-demo.mjs` 会打印下列状态指标：

- **2027**：只有已知 Concept；无2030年补录的展览、无活跃纤维、无生命事件。
- **2030**：显式 `life.encounter` 激活原有连接；生成具有非零张力和曲率的纤维；Concept 位置受力产生可测偏移。
- **2036年重释之前**：旧纤维 `L > 0.85` 且活性显著下降；其控制点保持历史形态。
- **2036年重释之后**：旧 Concept 活性升高但保留木质化与坐标历史；旧纤维保留 `fossilLayers`；新显式 Writing 关联产生有来源的非零分叉角。
- **2037年事实纠错**：当前 Archive 日期更新，但在同一观察时刻，加入或去掉维护事件得到**相同 `morphologyHash`**，生命事件数也不变。

项目测试覆盖 Phase 1A 合同与 Phase 1B 数值行为：`node --test tests/dynamics.test.mjs tests/protocol.test.mjs`。

## 6. 诚实的技术边界（还不是最终生命）

1. **还没有经用户确认的真实事件转换器。** 当前只是合成数据，不能据此宣称用户的研究确实在2036年发生某次转向。
2. **方向场、弹簧和参数只是参考数学假设**。`stable_id` 哈希种子决定初始位置，却不表达真实语义距离。真正的长期空间拓扑需要继续研究怎样优先用经过确认的关系组织布局。
3. **目前是事件驱动的慢速形变**，非事件期的微循环只输出可复现信号，尚无运动路径整合、能量守恒、全局推进核生成或整个身体的自发重新定向。
4. **未实现临界跃迁、消化缓冲池与不应期。** Phase 1B 的后续子版本需要明确触发条件和跨批量导入平滑策略；不能把每次 link 激活当作一次宏观跃迁。
5. **未实现真实数据迁移与伦理级 Purge。** 伦理删除必须覆盖事件源、静态档案、生成制品、历史快照、可回收备份和可控制缓存。当前可测试的 `archive.record.remove`/`archive.link.retract` 仅是知识投影变更，不是不可逆数据清理。
6. **未实现海量规模优化。** 当前固定次数松弛和遍历全部概念场约为 `O(迭代次数 × (结点 × 概念 + 纤维 × 概念))`；数千记录时应采用空间分区、影响域截断与增量缓存。`fossilLayers` 的记忆需要分级压缩，不能无限维持所有旧几何在内存中。
7. **未实现与旧 History 的生产兼容**。遗留 history-index 和图数据不能自动宣称具备经过 Phase 1B 校验的 Lived History。
8. **未实现视觉原型**。`points` 不能被直接渲染成数据库式圆点连线图；视觉实验必须另行比较三种纤维组织与混合光学实现。

## 7. 接下来做什么

**Phase 1B.1**：用可审计的输入事件和关系强度扩展驱动力，建立多核心的场耦合、阈值检测与生理不应期，并构造「极度偏科」「长期沉默」「新研究裂隙」三种合成压力情境。优先验证系统**允许不美丽但真实**的结构状态。

**Phase 1C**：开发只读真实 Archive 适配器，返回人工审核草案，不回写 Markdown。标记缺失日期、归因不确定的关联和无法可靠溯源的迁移基线。

**Phase 2**：同一份真实档案数据和锁定的动力学输出，进行三组完全独立的视觉材料试验，并进行桌面与移动性能比较。
