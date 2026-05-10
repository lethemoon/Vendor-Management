# 知识库与引用管理 MVP版本 PRD

> 版本：1.0.0  
> 日期：2026-05-10  
> 负责人：ProductAgent  
> 状态：待批准

---

## 1. 功能概述

### 1.1 功能定位

知识库与引用管理是智论平台P0核心功能，定位为**面向中文学术场景的一站式文献管理与引用生成工具**。该功能独立于已完成的论文降重和AIGC检测功能，专注于解决用户在学术写作过程中的文献整理、元数据管理和引用格式化问题。

**核心定位差异（vs 已有功能）：**
- 论文降重：解决与已有文献的重复率问题
- AIGC检测/降痕：解决AI生成文本的识别和优化问题
- **知识库与引用管理（本功能）：解决文献信息管理和引用格式规范问题**
- 三者互补且可联动，用户在写作过程中可能同时使用三项服务

### 1.2 目标用户

| 用户群体 | 核心需求 | 使用频率 | 付费意愿 |
|---------|---------|---------|---------|
| 本科毕业生 | 毕业论文参考文献管理+GB/T 7714格式引用 | 高（毕业季） | 中 |
| 硕士研究生 | 学位论文多文献管理+APA格式引用 | 中高 | 高 |
| 博士研究生 | 大量文献库维护+多格式切换 | 高 | 高 |
| 高校教师 | 课程论文批改时的引用规范性检查 | 低 | 低 |
| 学术期刊作者 | 投稿时快速生成符合期刊要求的引用 | 中 | 中 |

**典型用户画像：**
- 李同学，22岁，大四学生，正在撰写毕业论文，手头有30多篇需要引用的文献，不知道如何按照学校要求的GB/T 7714格式正确排列引用顺序
- 张博士，27岁，研二学生，需要投稿一篇SCI期刊（要求APA格式），同时导师又要求用中文写综述（需要GB/T格式），希望能一键切换引用格式
- 王教授，45岁，高校教师，指导10名本科生毕业论文，希望学生能自动生成规范的引用列表，减少格式错误导致的返工

### 1.3 核心价值主张

**解决的痛点：**
1. **文献散乱**：用户从多个渠道收集的文献信息分散在浏览器书签、Word文档、Excel表格中，难以统一管理
2. **手动录入繁琐**：每次添加新文献都需要手动输入标题、作者、期刊、年份等十几个字段，耗时且容易出错
3. **引用格式混乱**：不同场景需要不同的引用格式（毕业论文用GB/T 7714，英文期刊用APA），手动调整极易出错
4. **文献类型多样**：期刊文章、学位论文、书籍、会议论文、网页、专利等不同类型有不同的引用规则，用户难以记忆
5. **引用一致性差**：同一篇文献在论文中的多次引用可能格式不一致，导致被退稿或扣分

**带来的价值：**
1. **集中式文献库**：所有文献信息统一存储，支持搜索、排序、筛选，随时查找
2. **DOI智能填充**：输入DOI号即可自动检索并填充完整元数据，节省90%的录入时间
3. **一键格式转换**：支持GB/T 7714、APA、MLA三种主流格式，一键切换，零错误率
4. **智能引用插入**：在论文编辑器中直接选择已管理的文献插入引用，自动编号
5. **类型自适应**：根据文献类型自动应用对应的引用模板，无需用户记忆规则

---

## 2. 用户故事

### 2.1 主用户故事

**作为** 一名正在撰写学术论文的高校学生，

**我希望** 能够建立一个个人文献库来统一管理我所引用的所有文献资料，并通过输入DOI或手动录入的方式添加文献信息，然后在写作过程中选择合适的引用格式（如GB/T 7714、APA等）自动生成规范的引用字符串，

**以便于** 我能够高效地完成学术论文的参考文献部分，确保引用格式的准确性和一致性，顺利通过学校的格式审查或期刊的投稿要求。

**验收标准 (AC)：**

- **AC-1: 文献库创建与管理**
  - Given 用户已登录系统
  - When 用户访问知识库管理页面 `/library`
  - Then 系统应展示用户的个人文献库，支持文献的增删改查操作

- **AC-2: DOI智能检索**
  - Given 用户在添加文献页面输入了一个有效的DOI号（如 `10.1038/nature12373`）
  - When 用户点击"检索"按钮或按回车键
  - Then 系统应在3秒内返回该文献的完整元数据（标题、作者、期刊、年份、卷期页码等）并自动填充到表单中

- **AC-3: 多格式引用生成**
  - Given 用户已成功添加了一篇期刊文章类型的文献到文献库
  - When 用户选择该文献并指定输出格式为 GB/T 7714 / APA / MLA
  - Then 系统应立即返回符合对应格式规范的完整引用字符串

- **AC-4: 与论文编辑器关联**
  - Given 用户正在论文编辑器中编辑一篇论文
  - When 用户点击"插入引用"按钮并在弹出的文献选择器中选择了一篇已管理的文献
  - Then 系统应在光标位置插入格式正确的引用标记（如 `[1]` 或 `(Smith, 2023)`），并在文末自动更新参考文献列表

- **AC-5: 文献列表操作**
  - Given 用户的文献库中有50篇文献
  - When 用户使用搜索框输入关键词、按时间排序、或进行批量删除操作
  - Then 系统应在1秒内响应并展示结果，支持分页显示（每页20条）

### 2.2 子用户故事（按优先级排序）

#### 故事1：文献管理 CRUD

- **优先级**：P0-Must have
- **故事内容**：

**As a** 已注册用户，
**I want** 能够手动添加、编辑、查看和删除文献记录，
**So that** 我可以建立一个完整的个人文献库来管理我的学术参考资料。

**验收标准：**

- **Given** 用户进入"添加文献"页面
- **When** 用户填写完整的文献信息表单（包括标题、作者、期刊、年份等必填字段）
- **And** 点击"保存"按钮
- **Then** 系统应：
  - 验证所有必填字段不为空
  - 验证年份为合理的四位数字（1900-当前年份+1）
  - 验证DOI格式（如果填写）符合标准格式（`10.xxxx/xxxxx`）
  - 成功保存后跳转到文献详情页或返回列表页并显示成功提示
  - 新增的文献出现在用户的文献库列表中

- **Given** 用户在文献列表页点击某篇文献的"编辑"按钮
- **When** 用户修改了文献的部分字段（如修正作者姓名拼写）
- **And** 点击"保存修改"
- **Then** 系统应：
  - 更新该文献的记录
  - 记录修改时间戳
  - 列表中显示更新后的信息

- **Given** 用户在文献列表页选中了一篇或多篇文献
- **When** 用户点击"删除"按钮
- **And** 在确认对话框中确认删除
- **Then** 系统应：
  - 执行软删除（标记deletedAt时间戳而非物理删除）
  - 从列表中移除该文献
  - 显示删除成功的提示消息
  - 如果该文献已被某篇论文引用，提示"该文献已被X篇论文引用，删除后相关引用将失效"

- **Given** 用户点击某篇文献的标题或"查看详情"
- **When** 进入文献详情页面
- **Then** 页面应展示：
  - 完整的元数据信息（以结构化的卡片形式展示）
  - 该文献的所有可用引用格式预览（GB/T 7714 / APA / MLA）
  - "复制引用"按钮（点击复制到剪贴板）
  - "编辑"和"删除"操作按钮
  - 创建时间和最后更新时间

#### 故事2：DOI 智能检索

- **优先级**：P0-Must have
- **故事内容**：

**As a** 正在添加新文献的用户，
**I want** 通过输入文献的DOI号来自动检索并填充元数据，
**So that** 我可以避免手动逐字段录入的繁琐工作，提高效率并减少录入错误。

**验收标准：**

- **Given** 用户在添加文献页面看到DOI输入框
- **When** 用户输入一个有效的DOI号 `10.1126/science.169.3946.635`
- **And** 点击"通过DOI检索"按钮或按下回车键
- **Then** 系统应：
  - 显示加载动画（旋转图标 + "正在检索文献信息..."提示）
  - 在3秒内完成检索（MVP使用模拟数据，后续对接真实API）
  - 自动填充以下字段到表单中：
    - title: 文献标题
    - authors: 作者列表（格式化为字符串）
    - journal: 期刊名称
    - year: 出版年份
    - volume: 卷号
    - issue: 期号
    - pages: 起止页码
    - doi: DOI号（回填到输入框）
  - 填充后的字段变为只读状态（可手动解锁编辑）
  - 显示"✓ 检索成功，已自动填充N个字段"的成功提示

- **Given** 用户输入了一个无效或不存在的DOI号
- **When** 点击检索按钮
- **Then** 系统应：
  - 在2秒内返回错误响应
  - 显示"未找到匹配的文献，请检查DOI是否正确或手动输入"的错误提示
  - 表单保持空白状态，允许用户手动填写

- **Given** 用户输入的DOI号格式不正确（如缺少前缀、包含非法字符）
- **When** 点击检索按钮或在输入框失去焦点时
- **Then** 系统应：
  - 进行前端格式校验
  - 如果格式明显错误（如不以`10.`开头），立即显示"DOI格式不正确，正确格式示例：10.xxxx/xxxxx"
  - 阻止无效请求发送到后端

- **Given** 用户已经通过DOI检索填充了一篇文献
- **When** 用户想要修改某个自动填充的字段
- **Then** 系统应提供：
  - 每个字段旁的"解锁编辑"图标（🔓）
  - 点击后该字段变为可编辑状态
  - 修改后字段旁显示"已手动修改"标签，区分原始数据和人工修正

**MVP阶段技术实现说明：**

由于MVP阶段不接入真实的Crossref/CNKI API，采用**模拟数据服务**方案：

```typescript
// DOI模拟数据库（内置约50条常见文献数据）
const MOCK_DOI_DATABASE: Record<string, DocumentMetadata> = {
  '10.1126/science.169.3946.635': {
    title: 'The Structure of Ordinary Water [Disc 1800]',
    authors: ['Henniker, J.C.', 'Kamb, B.'],
    journal: 'Science',
    year: 1970,
    volume: '169',
    issue: '3946',
    pages: '635-637',
    doi: '10.1126/science.169.3946.635',
    type: 'journal_article'
  },
  // ... 更多模拟数据
  // 支持模糊匹配：如果精确匹配不到，尝试匹配DOI前缀
};
```

**模拟数据覆盖范围：**
- 期刊文章：30条（涵盖计算机科学、物理学、生物学、化学等领域）
- 学位论文：5条
- 书籍：5条
- 会议论文：5条
- 网页：3条
- 专利：2条

#### 故事3：多格式引用生成

- **优先级**：P0-Must have
- **故事内容**：

**As a** 已有文献库的用户，
**I want** 选择一种引用格式（GB/T 7714、APA、MLA）后，系统能自动生成该文献的规范化引用字符串，
**So that** 我可以直接复制使用，无需记忆复杂的引用格式规则。

**验收标准：**

- **Given** 用户有一篇期刊文章类型的文献，元数据如下：
  ```
  标题: Deep learning for natural language processing
  作者: Young, T., Hazarika, D., Poria, S., & Cambria, E.
  期刊: IEEE Transactions on Pattern Analysis and Machine Intelligence
  年份: 2023
  卷: 45
  期: 3
  页码: 1234-1267
  ```
- **When** 用户选择 GB/T 7714 格式
- **Then** 系统生成的引用应为：
  ```
  YOUNG T, HAZARIKA D, PORIA S, et al. Deep learning for natural language processing[J]. IEEE Transactions on Pattern Analysis and Machine Intelligence, 2023, 45(3): 1234-1267.
  ```

- **When** 用户选择 APA 格式（第7版）
- **Then** 系统生成的引用应为：
  ```
  Young, T., Hazarika, D., Poria, S., & Cambria, E. (2023). Deep learning for natural language processing. IEEE Transactions on Pattern Analysis and Machine Intelligence, 45(3), 1234–1267. https://doi.org/10.xxxx/xxxxx
  ```

- **When** 用户选择 MLA 格式（第9版）
- **Then** 系统生成的引用应为：
  ```
  Young, Tom, et al. "Deep Learning for Natural Language Processing." IEEE Transactions on Pattern Analysis and Machine Intelligence, vol. 45, no. 3, 2023, pp. 1234-67.
  ```

- **Given** 用户选择了一篇学位论文类型的文献
- **When** 用户分别查看三种格式的引用
- **Then** 系统应根据文献类型应用不同的模板：
  - GB/T 7714 学位论文格式：`[作者]. 论文题目[D]. 保存地点: 保存单位, 年份.`
  - APA 学位论文格式：`Author, A. A. (Year). Title of dissertation/thesis (Doctoral dissertation or Master's thesis). Institution Name.`
  - MLA 学位论文格式：`Author. Title of Thesis. Diss. Institution, Year.`

- **Given** 用户生成了引用字符串
- **When** 用户点击"复制引用"按钮
- **Then** 系统应：
  - 将引用字符串复制到系统剪贴板
  - 显示"✓ 已复制到剪贴板"的Toast提示（持续2秒）
  - 按钮文字临时变为"已复制"（持续1秒后恢复）

#### 故事4：引用类型支持

- **优先级**：P0-Must have
- **故事内容**：

**As a** 需要引用多种类型文献的用户，
**I want** 系统能够支持至少6种常见文献类型（期刊文章、学位论文、书籍、会议论文、网页、专利），
**So that** 无论我引用什么类型的参考资料，都能生成符合规范的引用格式。

**验收标准：**

- **Given** 用户在添加文献页面
- **When** 用户看到"文献类型"下拉选择框
- **Then** 选择框应包含以下选项：
  - 📄 期刊文章 (Journal Article)
  - 🎓 学位论文 (Thesis/Dissertation)
  - 📚 书籍 (Book)
  - 📢 会议论文 (Conference Paper)
  - 🌐 网页 (Web Page)
  - 💡 专利 (Patent)

- **Given** 用户选择了不同的文献类型
- **When** 表单根据类型动态调整
- **Then** 系统应：
  - **期刊文章**：显示 journal, volume, issue, pages 字段
  - **学位论文**：显示 university, degreeType (学士/硕士/博士), year 字段
  - **书籍**：显示 publisher, isbn, edition, location 字段
  - **会议论文**：显示 conferenceName, conferenceLocation, pages, editor 字段
  - **网页**：显示 url, accessDate, websiteName, publishDate 字段
  - **专利**：显示 patentNumber, inventor, filingDate, issuingAuthority 字段

- **Given** 用户添加了一篇书籍类型的文献
- **When** 生成引用时
- **Then** 各格式应正确处理书籍特有的字段：
  - GB/T 7714: `[作者]. 书名[M]. 版次. 出版地: 出版社, 出版年: 引用页码.`
  - APA: `Author, A. A. (Year). *Title of work* (xth ed.). Publisher.`
  - MLA: `Author. *Title of Book*. xth ed., Publisher, Year.`

- **Given** 用户添加了一篇网页类型的文献
- **When** 生成引用时
- **Then** 各格式应正确包含URL和访问日期：
  - GB/T 7714: `[作者]. 标题[EB/OL]. (发布日期)[引用日期]. URL.`
  - APA: `Author, A. A. (Year, Month Day). *Title of page*. Site Name. https://www.example.com`
  - MLA: `Author. "Title of Web Page." *Website Name*, Day Month Year, www.example.com/url.`

#### 故事5：文献列表页

- **优先级**：P0-Must have
- **故事内容**：

**As a** 拥有大量文献的用户，
**I want** 一个功能完善的文献列表页面，支持分页、搜索、排序和批量操作，
**So that** 我能够高效地浏览和管理我的文献库。

**验收标准：**

- **Given** 用户访问文献列表页 `/library`
- **When** 页面加载完成
- **Then** 系统应展示：
  - 顶部统计栏："共 N 篇文献" + "本月新增 M 篇"
  - 搜索框（支持按标题、作者、关键词、DOI搜索）
  - 工具栏：排序下拉框 + 类型筛选器 + 视图切换（列表/网格） + 批量操作按钮
  - 文献列表区域（默认每页显示20条，支持10/20/50切换）
  - 底部分页组件

- **Given** 用户在搜索框中输入关键词 "machine learning"
- **When** 按下回车或点击搜索按钮
- **Then** 系统应在500ms内返回结果：
  - 匹配逻辑：标题包含关键词 OR 作者包含关键词 OR 关键词字段包含关键词（模糊匹配）
  - 结果高亮显示匹配的文字片段
  - 显示"找到 N 条匹配结果"

- **Given** 用户点击排序下拉框
- **When** 选择排序选项
- **Then** 系统支持的排序维度：
  - 创建时间（降序/升序）
  - 更新时间（降序/升序）
  - 标题（A-Z/Z-A）
  - 作者（A-Z/Z-A）
  - 年份（新→旧/旧→新）
  - 文献类型分组
  - 排序后列表即时刷新，无需整页刷新

- **Given** 用户勾选了多篇文献的复选框
- **When** 用户点击"批量操作"下拉菜单
- **Then** 可用的批量操作包括：
  - 批量导出引用（选择格式后导出所有选中文献的引用列表）
  - 批量添加到论文（将选中文献批量关联到某篇论文）
  - 批量删除（需二次确认）
  - 批量修改类型（重新分类）

- **Given** 用户的文献库有100条记录
- **When** 用户翻页到第5页
- **Then** 分页组件应显示：
  - 当前页码和总页数（第5页/共5页）
  - 上一页/下一页按钮（边界状态禁用）
  - 快速跳转输入框（输入页码后回车跳转）
  - 每条记录显示序号（全局序号，非页内序号）

#### 故事6：与论文编辑器关联

- **优先级**：P0-Must have
- **故事内容**：

**As a** 正在论文编辑器中写作的用户，
**I want** 直接从我的文献库中选择文献并插入引用标记，
**So that** 我可以在写作过程中无缝地添加引用，而无需切换窗口去复制粘贴。

**验收标准：**

- **Given** 用户正在论文编辑器页面 `/paper/editor/:id`
- **When** 用户点击工具栏中的"引用"按钮（或使用快捷键 Ctrl+Shift+R）
- **Then** 系统应弹出"文献选择器"对话框/侧边面板：
  - 展示用户文献库中的所有文献（支持搜索过滤）
  - 显示每篇文献的简要信息（标题、作者、年份）
  - 支持单选或多选文献
  - 底部显示"插入引用"按钮

- **Given** 用户在文献选择器中选择了一篇文献
- **When** 用户点击"插入引用"按钮
- **Then** 系统应：
  - 在编辑器光标位置插入引用标记
  - 引用标记格式取决于用户选择的引用风格：
    - 数字编号制：`[1]`、`[2]` 等（按插入顺序自动编号）
    - 作者-年份制：(Smith, 2023) 等
  - 自动在该论文的引用列表中注册此引用关系
  - 更新文末的"参考文献"区域（实时渲染）

- **Given** 用户已在论文中插入了5个引用
- **When** 用户查看论文末尾的"参考文献"区域
- **Then** 系统应：
  - 按照引用出现的顺序（数字编号制）或作者字母序（作者-年份制）排列
  - 展示每篇被引用文献的完整引用字符串（使用论文设置的默认格式）
  - 支持一键复制整个参考文献列表

- **Given** 用户在编辑器中删除了一个引用标记
- **When** 引用被删除
- **Then** 系统应：
  - 从引用列表中移除该引用（如果其他地方没有引用同一文献）
  - 重新编号剩余的引用（数字编号制）
  - 更新文末参考文献列表

---

## 3. P0功能范围（MVP必需）

### 3.1 核心功能清单

| 功能模块 | 功能点 | 描述 | 优先级 |
|---------|-------|------|-------|
| 文献管理 | 手动添加文献 | 支持完整元数据表单录入（含6种文献类型） | P0 |
| 文献管理 | 编辑文献 | 支持修改已有文献的全部字段 | P0 |
| 文献管理 | 删除文献 | 软删除，支持单个和批量删除 | P0 |
| 文献管理 | 查看文献详情 | 结构化展示完整元数据和多格式引用预览 | P0 |
| DOI检索 | DOI输入校验 | 前端格式验证 + 后端二次校验 | P0 |
| DOI检索 | 元数据自动填充 | 输入DOI后自动检索并填充表单（MVP用模拟数据） | P0 |
| DOI检索 | 检索结果编辑 | 支持对自动填充的数据进行人工修正 | P0 |
| 引用生成 | GB/T 7714格式 | 完整实现中国国家标准引用格式 | P0 |
| 引用生成 | APA格式（第7版） | 实现美国心理学会引用格式 | P0 |
| 引用生成 | MLA格式（第9版） | 实现美国现代语言协会引用格式 | P0 |
| 引用生成 | 一键复制 | 复制引用字符串到剪贴板 | P0 |
| 文献类型 | 期刊文章模板 | 期刊文章专用引用模板 | P0 |
| 文献类型 | 学位论文模板 | 学位论文专用引用模板 | P0 |
| 文献类型 | 书籍模板 | 书籍专用引用模板 | P0 |
| 文献类型 | 会议论文模板 | 会议论文专用引用模板 | P0 |
| 文献类型 | 网页模板 | 网页资源专用引用模板 | P0 |
| 文献类型 | 专利模板 | 专利文献专用引用模板 | P0 |
| 文献列表 | 分页展示 | 支持分页浏览（默认20条/页） | P0 |
| 文献列表 | 全文搜索 | 支持按标题/作者/关键词/DOI搜索 | P0 |
| 文献列表 | 多维排序 | 支持按时间/标题/作者/年份/类型排序 | P0 |
| 文献列表 | 批量操作 | 批量导出/删除/关联论文 | P0 |
| 编辑器集成 | 引用插入器 | 在论文编辑器中选择文献插入引用 | P0 |
| 编辑器集成 | 引用列表同步 | 文末参考文献区域实时更新 | P0 |
| 编辑器集成 | 引用编号管理 | 自动编号/重编号机制 | P0 |

### 3.2 功能详细说明

#### 3.2.1 文献管理 CRUD 流程

**用户操作步骤：**

```
Step 1: 进入知识库
  └─ 用户导航至 /library 或从侧边栏"我的文献库"进入
  
Step 2: 添加新文献
  ├─ 方式A：点击"+ 添加文献"按钮 → 进入手动录入表单
  ├─ 方式B：点击"DOI导入"按钮 → 进入DOI检索界面
  └─ 方式C：从论文编辑器的引用选择器中添加（快捷入口）
  
Step 3a: 手动录入流程
  ├─ Step 3.1: 选择文献类型（决定表单字段）
  ├─ Step 3.2: 填写必填字段（标题、作者、年份等）
  ├─ Step 3.3: 填写可选字段（DOI、URL、摘要、关键词等）
  ├─ Step 3.4: 表单校验（前端 + 后端双重校验）
  └─ Step 3.5: 点击"保存" → 成功后跳转详情页
  
Step 3b: DOI检索流程
  ├─ Step 3.1: 输入DOI号
  ├─ Step 3.2: 点击检索 → 等待结果（≤3秒）
  ├─ Step 3.3: 自动填充表单 → 用户确认/修正
  └─ Step 3.4: 点击"保存到文献库"
  
Step 4: 查看和管理
  ├─ 返回文献列表 → 查看/搜索/排序/筛选
  ├─ 点击某篇文献 → 进入详情页
  │   ├─ 查看完整元数据
  │   ├─ 预览三种引用格式
  │   ├─ 复制任意格式的引用
  │   └─ 编辑/删除操作
  └─ 批量操作 → 多选 → 导出/删除/关联
```

**表单字段详细规格：**

**通用字段（所有类型共用）：**

| 字段 | 类型 | 必填 | 约束 | 说明 |
|-----|------|------|------|------|
| type | enum | 是 | 6选1 | 文献类型 |
| title | string | 是 | 1-500字符 | 文献标题 |
| authors | string | 是 | 1-1000字符 | 作者列表（分隔符连接） |
| year | int | 否 | 1900-2030 | 出版/发表年份 |
| doi | string | 否 | 符合DOI格式 | 数字对象标识符 |
| url | string | 否 | 有效URL | 在线访问地址 |
| abstract | text | 否 | ≤10000字 | 摘要内容 |
| keywords | string[] | 否 | 每个≤50字符 | 关键词数组 |
| notes | text |否 | ≤5000字 | 用户个人备注 |

**期刊文章特有字段：**

| 字段 | 类型 | 必填 | 约束 | 说明 |
|-----|------|------|------|------|
| journal | string | 是 | 1-300字符 | 期刊名称 |
| volume | string | 否 | 1-50字符 | 卷号 |
| issue | string | 否 | 1-50字符 | 期号 |
| pages | string | 否 | 如"123-156" | 起止页码 |

**学位论文特有字段：**

| 字段 | 类型 | 必填 | 约束 | 说明 |
|-----|------|------|------|------|
| university | string | 是 | 1-300字符 | 授予学位的院校 |
| degree_type | enum | 是 | bachelor/master/doctor | 学位类型 |

**书籍特有字段：**

| 字段 | 类型 | 必填 | 约束 | 说明 |
|-----|------|------|------|------|
| publisher | string | 是 | 1-300字符 | 出版社 |
| edition | string | 否 | 如"第3版" | 版次 |
| isbn | string | 否 | ISBN-10或ISBN-13 | 国际标准书号 |
| location | string | 否 | 1-200字符 | 出版地 |

**会议论文特有字段：**

| 字段 | 类型 | 必填 | 约束 | 说明 |
|-----|------|------|------|------|
| conference_name | string | 是 | 1-300字符 | 会议名称 |
| conference_location | string | 否 | 1-200字符 | 会议举办地 |
| pages | string | 否 | 如"45-52" | 起止页码 |
| editors | string | 否 | 1-500字符 | 会议论文集编者 |

**网页特有字段：**

| 字段 | 类型 | 必填 | 约束 | 说明 |
|-----|------|------|------|------|
| website_name | string | 是 | 1-300字符 | 网站名称 |
| url | string | 是 | 有效URL | 网页地址 |
| access_date | date | 是 | ≤当天 | 用户访问日期 |
| publish_date | date | 否 | 合理日期 | 网页发布日期 |

**专利特有字段：**

| 字段 | 类型 | 必填 | 约束 | 说明 |
|-----|------|------|------|------|
| patent_number | string | 是 | 1-100字符 | 专利号 |
| inventors | string | 是 | 1-1000字符 | 发明人列表 |
| filing_date | date | 是 | 合理日期 | 申请日期 |
| issuing_authority | string | 是 | 1-200字符 | 专利授权机构 |

#### 3.2.2 DOI 智能检索机制

**检索流程图：**

```
┌──────────────────────────────────────────────────────┐
│                  DOI检索流程                           │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  用户输入DOI     │
              │  10.xxxx/xxxxx  │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  前端格式校验    │
              │  正则表达式验证  │
              └────────┬────────┘
                       │
              ┌────────┴────────┐
              │                 │
         格式正确            格式错误
              │                 │
              ▼                 ▼
     ┌────────────────┐  ┌──────────────┐
     │ 发送API请求    │  │ 显示错误提示  │
     │ POST /doi/lookup│  │ "格式不正确"  │
     └────────┬────────┘  └──────────────┘
              │
              ▼
     ┌─────────────────┐
     │  后端查询服务    │
     │  (MVP: 模拟DB)  │
     └────────┬────────┘
              │
     ┌────────┴────────┐
     │                 │
   找到匹配          未找到
     │                 │
     ▼                 ▼
┌──────────────┐  ┌──────────────┐
│ 返回元数据   │  │ 返回404      │
│ + 填充表单   │  │ "未找到文献" │
└──────────────┘  └──────────────┘
```

**DOI格式校验规则：**

```javascript
// DOI格式正则表达式（严格模式）
const DOI_REGEX = /^10\.\d{4,}\/[^\s]+$/;

// 校验示例
const validDOIs = [
  '10.1126/science.169.3946.635',
  '10.1038/nature12373',
  '10.1145/3319535.3353716',
];

const invalidDOIs = [
  'doi:10.xxx',           // 错误：不应有doi:前缀
  'https://doi.org/...',  // 错误：不应包含URL包装
  '10.abc/def',           // 错误：数字部分太短
  '',                     // 错误：空值
];
```

**模拟数据服务设计（MVP）：**

```typescript
interface DOIMockRecord {
  doi: string;
  metadata: {
    type: DocumentType;
    title: string;
    authors: string[];
  };
}

class DOIMockService {
  private database: Map<string, DOIMockRecord>;
  
  constructor() {
    this.database = this.loadMockData();
  }
  
  async lookup(doi: string): Promise<DOIMockRecord | null> {
    // 1. 精确匹配
    if (this.database.has(doi)) {
      return this.database.get(doi)!;
    }
    
    // 2. 去除尾部空格后再试
    const trimmed = doi.trim();
    if (this.database.has(trimmed)) {
      return this.database.get(trimmed)!;
    }
    
    // 3. 模糊匹配（前缀匹配，用于演示目的）
    const prefix = doi.split('/').slice(0, 2).join('/');
    for (const [key, value] of this.database) {
      if (key.startsWith(prefix)) {
        return value;
      }
    }
    
    return null;
  }
}
```

**模拟延迟配置：**

为了模拟真实API体验，MVP阶段引入可控的模拟延迟：

| 场景 | 模拟延迟 | 说明 |
|-----|---------|------|
| 成功检索 | 800ms-1500ms | 随机波动，模拟网络延迟 |
| 未找到 | 500ms-800ms | 较短，快速反馈失败 |
| 网络错误（测试用） | 超时3s | 用于测试超时UI状态 |

#### 3.2.3 引用格式引擎架构设计

**三层架构总览：**

```
┌─────────────────────────────────────────────────────────────┐
│                     渲染层 (Render Layer)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ GB/T 7714   │  │    APA 7th  │  │   MLA 9th   │         │
│  │  Renderer   │  │  Renderer   │  │  Renderer   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                     规则层 (Rule Layer)                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │               FormatRuleEngine                       │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │   │
│  │  │ Author  │ │  Date   │ │ Title   │ │ Source  │  │   │
│  │  │ Rules   │ │ Rules   │ │ Rules   │ │ Rules   │  │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                     数据层 (Data Layer)                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              DocumentMetadata                         │   │
│  │  { type, title, authors, journal, year, ... }        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**第一层：数据层 (Data Layer)**

职责：接收原始Document对象，标准化为统一的中间数据结构。

```typescript
interface NormalizedMetadata {
  type: DocumentType;
  title: string;
  authors: AuthorInfo[];
  year?: number;
  date?: Date;
  containerTitle?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  publisher?: string;
  edition?: string;
  extras: Record<string, any>;
}

interface AuthorInfo {
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  isCorporate?: boolean;
  role?: string;
}
```

**第二层：规则层 (Rule Layer)**

职责：定义每种引用格式规则，可配置、可扩展。

```typescript
interface FormatRules {
  formatId: 'gbt7714' | 'apa7' | 'mla9';
  displayName: string;
  
  authorRules: {
    allAuthorsStyle: 'full' | 'lastName_first' | 'et_al_after_n';
    etAlThreshold: number;
    etAlString: string;
    authorSeparator: string;
    lastAuthorSeparator: string;
    firstNameFormat: 'initials' | 'full' | 'none';
    lastNameFirst: boolean;
    corporateAuthorHandling: 'as_is' | 'italicize' | 'abbreviate';
  };
  
  dateRules: {
    yearOnly: boolean;
    yearPosition: 'after_authors' | 'after_title' | 'in_parentheses';
    yearParentheses: boolean;
    dateFormat?: string;
  };
  
  titleRules: {
    capitalization: 'sentence_case' | 'title_case' | 'as_is';
    italicize: boolean;
    quotationMarks: boolean;
    subtitleSeparator: string;
    articleLanguageHandling: 'translate' | 'original' | 'both';
  };
  
  sourceRules: {
    containerItalicize: boolean;
    volumeFormat: string;
    issueFormat: string;
    pagesFormat: string;
    includeDoi: boolean;
    doiUrlPrefix: string;
    includeUrl: boolean;
    accessDateFormat: string;
  };
  
  structureRules: {
    fieldOrder: string[];
    fieldSeparators: Record<string, string>;
    endingPunctuation: string;
    maxAuthorsBeforeEtAl: number;
  };
  
  typeOverrides: Partial<Record<DocumentType, Partial<FormatRules>>>;
}
```

**第三层：渲染层 (Render Layer)**

职责：根据规则层的配置，将标准化数据渲染为最终的引用字符串。

```typescript
abstract class CitationRenderer {
  abstract render(metadata: NormalizedMetadata, rules: FormatRules): string;
  
  protected formatAuthors(authors: AuthorInfo[], rules: FormatRules): string;
  protected formatDate(dateInfo: DateInfo, rules: FormatRules): string;
  protected formatTitle(title: string, rules: FormatRules): string;
  protected formatSource(sourceInfo: SourceInfo, rules: FormatRules): string;
}

class GBT7714Renderer extends CitationRenderer {
  render(metadata: NormalizedMetadata, rules: FormatRules): string {
    const parts: string[] = [];
    parts.push(this.formatAuthors(metadata.authors, rules));
    parts.push(this.formatTitle(metadata.title, rules));
    parts.push(this.getTypeIdentifier(metadata.type));
    if (metadata.containerTitle) {
      parts.push(this.formatSourceContainer(metadata, rules));
    }
    if (metadata.year) {
      parts.push(String(metadata.year));
    }
    if (metadata.pages) {
      parts.push(metadata.pages);
    }
    return this.assemble(parts, rules);
  }
}

class APA7Renderer extends CitationRenderer { /* ... */ }
class MLA9Renderer extends CitationRenderer { /* ... */ }

class CitationEngine {
  private renderers: Map<string, CitationRenderer>;
  private ruleRegistry: Map<string, FormatRules>;
  
  generate(document: Document, formatId: string): string {
    const normalized = this.normalize(document);
    const rules = this.ruleRegistry.get(formatId);
    const mergedRules = this.mergeTypeOverrides(rules, normalized.type);
    const renderer = this.renderers.get(formatId);
    return renderer.render(normalized, mergedRules);
  }
}
```

#### 3.2.4 各格式引用生成算法详解

**GB/T 7714-2015 格式细节：**

**期刊文章：**
```
格式：[作者]. 题名[J]. 刊名, 年, 卷(期): 起止页码.

示例1（单作者）：
张三. 深度学习在自然语言处理中的应用研究[J]. 计算机学报, 2023, 46(3): 456-470.

示例2（双作者）：
张三, 李四. 基于Transformer的文本分类方法[J]. 软件学报, 2023, 34(2): 123-135.

示例3（三作者）：
张三, 李四, 王五. 大语言模型综述[J]. 中国科学: 信息科学, 2023, 53(1): 1-25.

示例4（四作者及以上）：
张三, 李四, 王五, 等. 图神经网络在推荐系统中的应用[J]. 自动化学报, 2023, 49(5): 890-905.

示例5（英文文献）：
SMITH J R, JOHNSON A B. Deep learning for NLP[J]. IEEE TPAMI, 2023, 45(3): 1234-1267.
```

**特殊处理规则：**

| 场景 | 处理方式 |
|-----|---------|
| 作者超过3人 | 前3人 + ", 等" |
| 作者名缩写 | 姓全大写 + 名取首字母大写加点（如 ZHANG San → ZHANG S） |
| 缺少年份 | 使用"[s.n.]"表示 |
| 缺少页码 | 省略页码部分 |
| 电子期刊 | 在结尾加上获取和访问路径 |
| DOI包含 | 可选择性包含在方括号注释中 |

**APA 第7版 格式细节：**

**期刊文章：**
```
格式：Author, A. A., & Author, B. B. (Year). Title of article. *Title of Periodical, xx*(x), pp–pp. https://doi.org/xxxxx

示例1（单作者）：
Smith, J. R. (2023). Deep learning approaches for natural language understanding. *Journal of Artificial Intelligence Research, 78*, 145–178. https://doi.org/10.1613/jair.1234

示例2（双作者）：
Smith, J. R., & Johnson, A. B. (2023). Transformer architectures: A comprehensive survey. *Neural Computation, 35*(4), 892–945.

示例3（三至二十作者）：
Smith, J. R., Johnson, A. B., & Williams, C. D. (2023). ...

示例4（21+作者）：
Smith, J. R., Johnson, A. B., Williams, C. D., Brown, E. F., Davis, G. H., Miller, I. J., Wilson, K. L., Moore, L. M., Taylor, M. N., Anderson, N. O., Thomas, O. P., Jackson, Q. R., White, S. T., Harris, U. V., Martin, W. X Thompson, Y. A., Garcia, Z. B., Martinez, A. C., Robinson, D. E., Clark, F. S., ... Lewis, G. T. (2023). ...
```

**APA 特殊规则：**

| 场景 | 处理方式 |
|-----|---------|
| 作者数量 | 1-20人全部列出；21+人列前19 + ... + 最后1人 |
| 作者名格式 | 姓, 名首字母.(如 Smith, J. R.) |
| "&"符号 | 最后一位作者前用", &" |
| 年份位置 | 作者后括号内 (Year) |
| 文章标题 | 句首大写（sentence case），不加引号，不斜体 |
| 期刊名称 | 标题大小写（title case），**斜体** |
| 卷号 | **斜体**，无"Vol."前缀 |
| 期号 | 括号包裹，不斜体 (No.) |
| 页码 | 只用数字范围，无"p./pp."前缀 |
| DOI | 必须包含，格式为 https://doi.org/xxxxx |
| 无DOI但有URL | 包含URL |
| 无页码（提前出版） | 用"Advance online publication"替代 |

**MLA 第9版 格式细节：**

**期刊文章：**
```
格式：Author(s). "Title of Article." *Title of Journal*, vol. x, no. y, Date, pp. xx-xx.

示例1（单作者）：
Smith, John R. "Deep Learning in Natural Language Processing." *Journal of Computational Linguistics*, vol. 48, no. 2, Mar. 2023, pp. 234-56.

示例2（双作者）：
Smith, John R., and Amy B. Johnson. "Transformers in Computer Vision." *AI Review*, vol. 15, no. 4, Summer 2023, pp. 78-94.

示例3（三作者及以上）：
Smith, John R., Amy B. Johnson, and Chris D. Williams. "Large Language Models: A Survey." *Machine Learning Today*, vol. 30, no. 1, Jan. 2023, pp. 12-45.
```

**MLA 特殊规则：**

| 场景 | 处理方式 |
|-----|---------|
| 作者数量 | 列出所有作者（MLA倾向于完整列出） |
| 作者名格式 | 姓, 全名 (如 Smith, John R.) |
| "and"连接 | 最后一位作者前用", and" |
| 文章标题 | 标题大小写，**双引号**包裹 |
| 期刊/书名 | 标题大小写，**斜体** |
| 卷号 | "vol. x"（小写，斜体） |
| 期号 | "no. y"（小写） |
| 日期 | 日 月 年 格式（如 15 Mar. 2023） |
| 页码 | "pp. xx-xx"格式 |
| URL | 可选，放在句末 |
| DOI | 通常不需要（MLA倾向用URL） |

**各文献类型的格式差异矩阵：**

| 文献类型 | GB/T 7714 标识 | APA 特点 | MLA 特点 |
|---------|---------------|----------|---------|
| 期刊文章 | `[J]` | 期刊名斜体，卷号斜体 | 期刊名斜体，文章名加引号 |
| 学位论文 | `[D]` | 标注"(Doctoral dissertation)" | 标注"Diss." |
| 书籍 | `[M]` | 书名斜体，标注版次 | 书名斜体 |
| 会议论文 | `[C]/[A]/[N]` | 会议名作为容器 | 会议论文集名斜体 |
| 网页 | `[EB/OL]` | 含访问日期 | 含访问日期 |
| 专利 | `[P]` | 含专利号 | 含专利号 |

#### 3.2.5 与论文编辑器集成机制

**引用插入流程：**

当用户在论文编辑器中插入引用时，系统创建以下关联记录：

```typescript
interface CitationInstance {
  id: string;
  paperId: string;
  documentId: string;
  citationNumber: int;
  position: number;
  citationText: string;
  format: CitationFormat;
  createdAt: DateTime;
}

interface PaperReferenceList {
  paperId: string;
  references: ReferenceEntry[];
  format: CitationFormat;
  lastUpdated: DateTime;
}
```

**自动编号算法：**

```typescript
function renumberCitations(citations: CitationInstance[]): CitationInstance[] {
  const sorted = [...citations].sort((a, b) => a.position - b.position);
  return sorted.map((citation, index) => ({
    ...citation,
    citationNumber: index + 1,
    citationText: `[${index + 1}]`
  }));
}
```

---

## 4. 用户界面设计

### 4.1 页面结构

#### 页面1：文献库主页 (`/library`)

**页面布局：顶部统计 + 工具栏 + 列表区 + 分页**

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo] 智论AI    我的文献库    [用户头像] [文献数: 128]         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ══════════════════════════════════════════════════════════    │
│                     统计概览区                                   │
│  ══════════════════════════════════════════════════════════    │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  📚 128  │  │  📄 85%  │  │  📅 本月  │  │  🔬 6种  │        │
│  │  总文献数 │  │  期刊文章 │  │  +12篇   │  │  文献类型 │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                 │
│  ══════════════════════════════════════════════════════════    │
│                     工具栏区                                     │
│  ══════════════════════════════════════════════════════════    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🔍 搜索文献 (标题/作者/DOI/关键词)...     [🔽 高级筛选] │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ 排序: [创建时间 ▼]  类型: [全部 ▼]  视图: [☷列表][⊞网格]│   │
│  │ [+ 添加文献]  [📥 DOI导入]  [📤 批量导出]  [🗑️ 批量删除]│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ══════════════════════════════════════════════════════════    │
│                     文献列表区                                   │
│  ══════════════════════════════════════════════════════════    │
│                                                                 │
│  ☐  │  标题                          │ 作者        │ 年 │ 类型│
│  ────┼───────────────────────────────┼────────────┼────┼─────│
│  ☐  │  📄 深度学习在NLP中的应用      │ 张三, 李四  │2023│ 📄  │
│  ☐  │  📄 基于Transformer的文本分类  │ 王五        │2023│ 📄  │
│  ☐  │  🎓 大语言模型技术报告         │ Smith JR   │2023│ 🎓  │
│  ☐  │  📚 机器学习实战指南           │ 赵六        │2022│ 📚  │
│  ☐  │  📢 NeurIPS 2023论文集        │ AAAI       │2023│ 📢  │
│  ☐  │  🌐 OpenAI官方技术博客         │ OpenAI团队 │2023│ 🌐  │
│  ☐  │  💡 一种新型神经网络结构       │ 孙七        │2023│ 💡  │
│  │  ...                                                        │
│                                                                 │
│  ══════════════════════════════════════════════════════════    │
│  显示 1-20 / 共 128 条    [< 上一页] [1] [2] ... [7] [下一页 >]│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**核心组件：**

| 组件 | 类型 | 说明 |
|-----|------|------|
| StatCard | 统计卡片 | 显示总数/类型分布/趋势 |
| SearchBar | 搜索框 | 支持模糊搜索，防抖300ms |
| FilterBar | 筛选工具栏 | 排序/类型/视图切换 |
| ActionToolbar | 操作按钮组 | 添加/导入/导出/删除 |
| DataTable | 数据表格 | 文献列表，支持排序/选择 |
| Pagination | 分页组件 | 页码导航，支持跳转 |

#### 页面2：添加/编辑文献页 (`/library/new` 和 `/library/:id/edit`)

**页面布局：左右分栏（表单 + 预览）**

```
┌─────────────────────────────────────────────────────────────────┐
│  [< 返回文献库]  添加新文献                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────┬───────────────────────────────┐│
│  │       📝 文献信息录入       │      👁️ 引用格式预览           ││
│  │                            │                               ││
│  │  文献类型:                 │  ┌─────────────────────────┐  ││
│  │  [📄 期刊文章 ▼]          │  │ GB/T 7714:              │  ││
│  │                            │  │ ______________________  │  ││
│  │  ─────────────────────     │  │ (实时生成预览...)        │  ││
│  │                            │  │                         │  ││
│  │  标题 *:                   │  │ [📋 复制]               │  ││
│  │  ┌──────────────────────┐  │  └─────────────────────────┘  ││
│  │  │                      │  │                               ││
│  │  └──────────────────────┘  │  ┌─────────────────────────┐  ││
│  │                            │  │ APA 7th:                │  ││
│  │  作者 *:                   │  │ ______________________  │  ││
│  │  ┌──────────────────────┐  │  │ (实时生成预览...)        │  ││
│  │  │ 张三, 李四, 王五      │  │  │                         │  ││
│  │  └──────────────────────┘  │  │ [📋 复制]               │  ││
│  │                            │  └─────────────────────────┘  ││
│  │  DOI:                      │                               ││
│  │  ┌──────────────────────┐  │  ┌─────────────────────────┐  ││
│  │  │ 10.xxxx/xxxxx        │  │  │ MLA 9th:                │  ││
│  │  └──────────────────────┘  │  │ ______________________  │  ││
│  │  [🔍 通过DOI检索]          │  │ (实时生成预览...)        │  ││
│  │                            │  │                         │  ││
│  │  期刊 *:                   │  │ [📋 复制]               │  ││
│  │  ┌──────────────────────┐  │  └─────────────────────────┘  ││
│  │  │ 计算机学报            │  │                               ││
│  │  └──────────────────────┘  │                               ││
│  │                            │                               ││
│  │  年份:    卷:    期:       │                               ││
│  │  [2023 ]  [45 ]   [3 ]     │                               ││
│  │                            │                               ││
│  │  页码:                     │                               ││
│  │  [1234-1267              ] │                               ││
│  │                            │                               ││
│  │  ─────────────────────     │                               ││
│  │                            │                               ││
│  │  摘要 (可选):              │                               ││
│  │  ┌──────────────────────┐  │                               ││
│  │  │                      │  │                               ││
│  │  │ (多行文本区域)        │  │                               ││
│  │  └──────────────────────┘  │                               ││
│  │                            │                               ││
│  │  关键词 (可选):            │                               ││
│  │  [深度学习] [NLP] [+添加]  │                               ││
│  │                            │                               ││
│  │                            │                               ││
│  │  [💾 保存文献]  [取消]     │                               ││
│  └────────────────────────────┴───────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**动态表单行为：**

| 用户选择的类型 | 显示的特有字段 | 隐藏的字段 |
|--------------|--------------|-----------|
| 期刊文章 | journal, volume, issue, pages | university, publisher, conference_name, ... |
| 学位论文 | university, degree_type | journal, volume, issue, publisher, ... |
| 书籍 | publisher, edition, isbn, location | journal, volume, issue, university, ... |
| 会议论文 | conference_name, conference_location, pages, editors | journal, volume, issue, publisher, ... |
| 网页 | website_name, url, access_date, publish_date | journal, volume, issue, publisher, ... |
| 专利 | patent_number, inventors, filing_date, issuing_authority | journal, volume, issue, publisher, ... |

#### 页面3：文献详情页 (`/library/:id`)

**页面布局：上下分区（基本信息 + 操作区）**

```
┌─────────────────────────────────────────────────────────────────┐
│  [< 返回文献库]  深度学习在NLP中的应用    [✏️ 编辑] [🗑️ 删除]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ══════════════════════════════════════════════════════════    │
│                     文献基本信息                                  │
│  ══════════════════════════════════════════════════════════    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  📄 期刊文章                                           │   │
│  │                                                         │   │
│  │  ## 深度学习在自然语言处理中的应用研究                    │   │
│  │                                                         │   │
│  │  **作者**: 张三, 李四, 王五                              │   │
│  │  **期刊**: 计算机学报                                    │   │
│  │  **年份**: 2023                                         │   │
│  │  **卷期**: 第45卷 第3期                                  │   │
│  │  **页码**: 1234-1267                                    │   │
│  │  **DOI**: [10.1234/cj.2023.0456](https://doi.org/...)   │   │
│  │                                                         │   │
│  │  ---                                                    │   │
│  │                                                         │   │
│  │  ### 摘要                                               │   │
│  │  本文综述了深度学习技术在自然语言处理领域的最新进展...     │   │
│  │                                                         │   │
│  │  **关键词**: #深度学习 #NLP #Transformer #BERT          │   │
│  │                                                         │   │
│  │  **备注**: 这篇文章对我的毕业论文第三章很有帮助           │   │
│  │                                                         │   │
│  │  **创建时间**: 2026-05-10 14:30:00                      │   │
│  │  **最后更新**: 2026-05-10 16:45:00                      │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ══════════════════════════════════════════════════════════    │
│                     引用格式生成                                   │
│  ══════════════════════════════════════════════════════════    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐                   │   │
│  │  │GB/T 7714│ │  APA 7  │ │  MLA 9  │                   │   │
│  │  │  ★默认  │ │         │ │         │                   │   │
│  │  └─────────┘ └─────────┘ └─────────┘                   │   │
│  │                                                         │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │                                                 │   │   │
│  │  │  张三, 李四, 王五. 深度学习在自然语言处理中的    │   │   │
│  │  │  应用研究[J]. 计算机学报, 2023, 45(3): 1234-1267.│   │   │
│  │  │                                                 │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │                                                         │   │
│  │  [📋 复制引用]  [📋 复制纯文本]                          │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ══════════════════════════════════════════════════════════    │
│                     关联论文                                     │
│  ══════════════════════════════════════════════════════════    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  该文献已被以下论文引用：                                 │   │
│  │                                                         │   │
│  │  📄 本科毕业论文 - 最终稿        引用次数: 2    [查看]   │   │
│  │  📄 深度学习综述论文              引用次数: 1    [查看]   │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 页面4：DOI导入界面（Modal弹窗）

**触发方式**：从文献库主页点击"📥 DOI导入"按钮

```
┌───────────────────────────────────────────────────────────────┐
│  📥 DOI智能导入                              [✕ 关闭]        │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  输入文献的DOI号，我们将自动检索并填充文献信息                  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  10.                                                  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  示例: 10.1126/science.169.3946.635                          │
│        10.1038/nature12373                                    │
│        10.1145/3319535.3353716                                │
│                                                               │
│  ┌────────────────────────────────────┐  ┌─────────────────┐ │
│  │  🔍 开始检索                       │  │ 取消            │ │
│  └────────────────────────────────────┘  └─────────────────┘ │
│                                                               │
│  ─────────────────────────────────────────────────────────── │
│  检索历史（最近5次）：                                          │
│  ✓ 10.1038/nature12373  → 检索成功  今天14:20                │
│  ✗ 10.abc/invalid         → 未找到    今天14:18                │
│  ✓ 10.1145/3319535.3353716 → 检索成功  昨天09:15              │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

#### 页面5：引用格式选择器（在论文编辑器中触发）

**触发方式**：在论文编辑器中点击工具栏"引用"按钮或快捷键 Ctrl+Shift+R

```
┌───────────────────────────────────────────────────────────────┐
│  📎 插入引用                                    [✕ 关闭]     │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  🔍 搜索文献...                                               │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ ● 深度学习在NLP中的应用 (张三, 2023) [期刊]              │ │
│  │ ○ 基于Transformer的文本分类 (王五, 2023) [期刊]          │ │
│  │ ○ 大语言模型技术报告 (Smith, 2023) [学位论文]            │ │
│  │ ○ 机器学习实战指南 (赵六, 2022) [书籍]                   │ │
│  │ ○ NeurIPS 2023最佳论文 (AAAI, 2023) [会议]               │ │
│  │ ○ OpenAI GPT-4技术报告 (OpenAI, 2023) [网页]             │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  引用格式: [继承论文设置 (GB/T 7714) ▼]                        │
│  插入方式: [引用标记 [1] ▼]                                    │
│                                                               │
│  已选择 1 篇文献                                              │
│                                                               │
│  [取消]                     [✓ 插入引用]                      │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### 4.2 关键交互细节

#### 搜索与筛选

**搜索框行为：**
- 用户输入 → 防抖300ms → 发送请求
- 搜索范围：title OR authors_string OR keywords_array OR doi
- 匹配方式：PostgreSQL ILIKE（不区分大小写的模糊匹配）
- 结果高亮：<mark>标签包裹匹配文字
- 清空条件：ESC键 或 点击✕图标

**高级筛选（展开面板）：**
- 文献类型：多选checkbox
- 年份范围：滑块选择 [1990 - 2026]
- 是否有DOI：是/否/全部
- 是否已被引用：是/否/全部
- 创建时间范围：日期选择器

**排序选项详解：**

| 排序方式 | 正序 | 倒序 | 说明 |
|---------|------|------|------|
| 创建时间 | 最旧→最新 | 最新→最旧 | 默认倒序 |
| 更新时间 | 最旧→最新 | 最新→最旧 | 基于updatedAt |
| 标题 | A→Z | Z→A | 按首字母排序（中文按拼音） |
| 作者 | A→Z | Z→A | 按第一作者姓排序 |
| 年份 | 远→近 | 近→远 | 无年份的排最后 |
| 类型 | 自定义顺序 | 反向 | 期刊>学位论文>书籍>会议>网页>专利 |

#### 批量操作

**批量选择机制：**
1. 顶部全选checkbox → 选中当前页所有项
2. 行级checkbox → 单独选择/取消
3. 选中计数实时显示："已选择 N 项"
4. 批量操作按钮仅在选中≥1项时激活
5. 跨页选择：支持"选择所有匹配结果"（需二次确认）

**批量操作清单：**
- 📋 导出引用 (GB/T 7714)
- 📋 导出引用 (APA 7)
- 📋 导出引用 (MLA 9)
- 📎 关联到论文...
- 🏷️ 修改类型...
- 🗑️ 删除所选 (N项)

#### 引用复制交互

**复制成功反馈序列：**
- T=0ms: 按钮 [📋 复制引用] 正常状态
- T=0ms: 按钮变为 [✓ 已复制!] 绿色背景
- T=1000ms: Toast通知出现在右下角："✓ 引用已复制到剪贴板"
- T=2000ms: Toast自动消失
- T=2500ms: 按钮恢复为 [📋 复制引用]

---

## 5. 非功能性需求

### 5.1 性能要求

| 场景 | 响应时间 | 吞吐量 | 并发支持 | 备注 |
|-----|---------|--------|---------|------|
| 文献列表查询（20条/页） | <500ms | 200 req/s | 100并发 | 含搜索/排序/筛选 |
| 文献详情查询 | <300ms | 300 req/s | 150并发 | 单条记录读取 |
| 创建文献（手动录入） | <800ms | 100 req/s | 50并发 | 含校验和写入 |
| DOI检索（模拟数据） | <1500ms | 50 req/s | 30并发 | MVP模拟延迟 |
| 引用生成（单条） | <200ms | 500 req/s | 200并发 | 纯CPU计算，无IO |
| 引用生成（批量50条） | <1000ms | 100 req/s | 50并发 | 批量接口 |
| 批量删除（10条） | <1000ms | 50 req/s | 30并发 | 事务批量更新 |
| 文献搜索（全文检索） | <1000ms | 100 req/s | 50并发 | ILIKE查询 |

### 5.2 准确性要求

| 指标 | MVP目标 | 测量方法 |
|-----|---------|---------|
| GB/T 7714格式准确率 | ≥98% | 对比国家标准范例，人工抽检100条 |
| APA 7格式准确率 | ≥95% | 对比官方手册范例，人工抽检100条 |
| MLA 9格式准确率 | ≥95% | 对比官方手册范例，人工抽检100条 |
| 作者名解析准确率 | ≥92% | 各种姓名格式的解析测试 |
| DOI检索成功率（有效DOI） | ≥100%（模拟数据范围内） | 内置数据全覆盖测试 |
| 引用编号连续性 | 100% | 自动编号算法单元测试 |

### 5.3 安全与隐私

**数据安全：**
- 传输加密：HTTPS/TLS 1.3 强制
- 访问控制：JWT认证 + 用户数据隔离（userId强制过滤）
- SQL注入防护：Prisma ORM参数化查询
- XSS防护：React自动转义 + 引用内容sanitization
- CSRF防护：SameSite Cookie + Token验证
- 操作审计：关键操作日志（增删改）记录

**隐私保护：**
- 数据所有权：文献数据完全属于用户，可随时导出或删除
- 数据最小化：仅收集必要的元数据，不存储文献全文（除摘要外）
- 不用于训练：用户文献数据绝不用于训练任何AI模型
- 删除权：支持用户彻底删除所有文献数据（硬删除选项）

**配额与限制：**
- 单用户最大文献数：10,000篇
- 单次批量操作：100篇
- DOI检索频率：60次/分钟/IP
- 引用生成频率：300次/分钟/IP
- 单条文献标题长度：500字符
- 作者字段长度：1000字符

---

## 6. 数据需求

### 6.1 存储数据模型（扩展现有Schema）

**方案：扩展 Document 模型 + 新增 Citation 引擎相关类型定义**

```prisma
model Document {
  id                    String            @id @default(uuid())
  userId                String
  
  type                  DocumentType      @default(JOURNAL_ARTICLE)
  title                 String
  authors               string
  
  year                  Int?
  doi                   String?           @unique
  url                   String?
  abstract              String?           @db.Text
  keywords              String[]
  content               String?           @db.Text
  filePath              String?
  embedding             Float[]
  notes                 String?           @db.Text
  
  journal               String?
  volume                String?
  issue                 String?
  pages                 String?
  
  university            String?
  degreeType            DegreeType?
  
  publisher             String?
  edition               String?
  isbn                  String?
  location              String?
  
  conferenceName        String?
  conferenceLocation    String?
  editors               String?
  
  websiteName           String?
  accessDate            DateTime?
  publishDate           DateTime?
  
  patentNumber          String?
  inventors             String?
  filingDate            DateTime?
  issuingAuthority      String?
  
  citationCount         Int               @default(0)
  deletedAt             DateTime?
  
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt
  
  user                  User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  paperCitations        PaperCitation[]
  
  @@map("documents")
  @@index([userId, createdAt])
  @@index([userId, type])
  @@index([userId, deletedAt])
}

enum DocumentType {
  JOURNAL_ARTICLE
  THESIS
  BOOK
  CONFERENCE_PAPER
  WEBPAGE
  PATENT
}

enum DegreeType {
  BACHELOR
  MASTER
  DOCTOR
}

model PaperCitation {
  id                    String            @id @default(uuid())
  paperId               String
  documentId            String
  citationNumber        Int
  citationText          String
  format                CitationFormat    @default(GBT7714)
  position              Int?
  
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt
  
  paper                 Paper             @relation(fields: [paperId], references: [id], onDelete: Cascade)
  document              Document          @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  @@map("paper_citations")
  @@index([paperId, citationNumber])
  @@index([documentId])
}

enum CitationFormat {
  GBT7714
  APA7
  MLA9
}
```

### 6.2 API接口清单

| 接口 | 方法 | 功能 | 认证 | 优先级 |
|-----|------|------|------|--------|
| `/api/v1/library/documents` | GET | 获取文献列表（分页/搜索/排序） | JWT | P0 |
| `/api/v1/library/documents` | POST | 创建新文献（手动录入） | JWT | P0 |
| `/api/v1/library/documents/:id` | GET | 获取文献详情 | JWT | P0 |
| `/api/v1/library/documents/:id` | PUT | 更新文献信息 | JWT | P0 |
| `/api/v1/library/documents/:id` | DELETE | 删除文献（软删除） | JWT | P0 |
| `/api/v1/library/documents/batch-delete` | POST | 批量删除文献 | JWT | P0 |
| `/api/v1/library/doi/lookup` | POST | DOI智能检索 | JWT | P0 |
| `/api/v1/library/citations/generate` | POST | 生成引用（单条/批量） | JWT | P0 |
| `/api/v1/library/export` | POST | 批量导出引用列表 | JWT | P0 |
| `/api/v1/papers/:paperId/citations` | GET | 获取论文的引用列表 | JWT | P0 |
| `/api/v1/papers/:paperId/citations` | POST | 向论文插入引用 | JWT | P0 |
| `/api/v1/papers/:paperId/citations/:id` | DELETE | 从论文移除引用 | JWT | P0 |

**GET /api/v1/library/documents 主要参数：**
- page, pageSize, search, sortBy, sortOrder, type, hasDoi, yearFrom, yearTo

**POST /api/v1/library/documents 请求体：**
- type, title, authors (必填) + 类型特定字段 (条件必填)

**POST /api/v1/library/doi/lookup 请求体：**
- { doi: string } → 返回 { found: boolean, metadata: object|null }

**POST /api/v1/library/citations/generate 请求体：**
- { documentIds: string[], format: "GBT7714"|"APA7"|"MLA9" } → 返回引用字符串数组

**POST /api/v1/papers/:paperId/citations 请求体：**
- { documentIds: string[], format?, position? } → 返回引用实例 + 更新的参考文献列表

---

## 7. MVP排除项（明确不做）

### 7.1 功能排除清单

| 序号 | 排除功能 | 原因 | 计划迭代 |
|-----|---------|------|---------|
| 1 | PDF/Word文件自动解析导入 | 需要文件解析库，增加复杂度 | P1阶段 |
| 2 | RAG向量语义检索（pgvector） | 需要PostgreSQL扩展+embedding服务 | P2阶段 |
| 3 | Crossref/CNKI真实API对接 | 商业API有限流和费用，MVP先用模拟数据 | P1阶段 |
| 4 | BibTeX/RIS格式导出 | 属于高级导出功能，MVP先支持纯文本复制 | P1阶段 |
| 5 | 文件夹/标签分类管理 | 需要额外分类体系设计和UI | P1阶段 |
| 6 | 引用一致性校验 | 需要解析论文全文并与引用列表比对 | P2阶段 |
| 7 | 浏览器插件（Chrome Extension） | 需要额外分发和维护成本 | P2阶段 |
| 8 | 移动端原生App或适配 | MVP仅Web端H5响应式设计 | P2阶段 |
| 9 | 协作共享文献库 | 需要权限系统和协作基础设施 | P2阶段 |
| 10 | 文献去重合并 | 需要相似度算法 | P1阶段 |
| 11 | 自动抓取网页元数据 | 需要爬虫服务，涉及法律风险 | P2阶段 |
| 12 | Google Scholar/知网导入 | 需要爬虫或官方API对接 | P2阶段 |
| 13 | 引用样式自定义 | 需要可视化规则编辑器 | 远期规划 |
| 14 | 多语言引用支持（日文/俄文等） | 引用规则因语言差异巨大 | P2阶段 |
| 15 | 文献影响因子/引用次数显示 | 需要外部数据源 | P1阶段 |

### 7.2 技术债务 knowingly incurred

| 技术债务 | MVP做法 | 后续改进 | 风险等级 |
|---------|--------|---------|---------|
| DOI数据源 | 内置50条模拟数据 | 对接Crossref API | 低 |
| 搜索引擎 | PostgreSQL ILIKE模糊匹配 | 升级为全文检索或Elasticsearch | 低 |
| 引用缓存 | 内存缓存（Map） | Redis分布式缓存 | 低 |
| 作者名解析 | 基础正则解析 | 集成专业NLP库 | 中 |
| 批量操作 | 循环单条执行 | 数据库批量UPSERT | 低 |
| 前端状态管理 | 组件本地state | 引入Zustand/Pinia全局状态 | 低 |

---

## 8. 成功指标

### 8.1 技术指标

| 指标 | 目标值 | 最低可接受 | 测量方法 |
|-----|--------|-----------|---------|
| API成功率 | ≥99% | ≥97% | 日志分析 |
| API响应时间P50 | <400ms | <800ms | APM监控 |
| API响应时间P99 | <1200ms | <2000ms | APM监控 |
| 引用生成准确率（GB/T） | ≥98% | ≥95% | CI/CD测试套件 |
| 引用生成准确率（APA） | ≥95% | ≥90% | CI/CD测试套件 |
| 引用生成准确率（MLA） | ≥95% | ≥90% | CI/CD测试套件 |
| DOI检索成功率 | 100% | 100% | 单元测试 |
| 系统可用性 | ≥99% | ≥97% | 运维监控 |

### 8.2 业务指标

| 指标 | 目标值 | 最低可接受 | 测量方法 |
|-----|--------|-----------|---------|
| 人均文献库规模 | ≥20篇/用户 | ≥10篇/用户 | 按月统计 |
| DOI导入使用率 | ≥60% | ≥40% | 按周统计 |
| 引用生成使用率 | ≥80% | ≥60% | 按周统计 |
| 文献库周留存率 | ≥50% | ≥30% | Cohort分析 |
| 编辑器引用插入使用率 | ≥40% | ≥20% | 按周统计 |
| 平均每论文引用数 | ≥5篇 | ≥3篇 | 按月统计 |

### 8.3 用户体验指标

| 指标 | 目标值 | 最低可接受 | 测量方法 |
|-----|--------|-----------|---------|
| 首次添加文献完成时间 | <3分钟 | <5分钟 | 埋点统计 |
| DOI导入完成时间 | <30秒 | <60秒 | 埋点统计 |
| 引用生成到复制时间 | <10秒 | <20秒 | 埋点统计 |
| 核心流程操作步数 | ≤5步 | ≤8步 | 用户旅程分析 |
| 用户满意度(NPS) | ≥40 | ≥20 | 问卷调研 |
| 引用格式满意度 | ≥4.2/5.0 | ≥3.5/5.0 | 可用性测试 |

---

## 9. 风险与依赖

### 9.1 技术风险

| 编号 | 风险描述 | 可能性 | 影响 | 等级 | 缓解措施 |
|-----|---------|-------|------|------|---------|
| R01 | 引用格式规则复杂，边界case众多 | 高 | 中 | 🟡 | 完善测试用例库+参考开源实现+反馈通道 |
| R02 | 作者名字解析对中西混合姓名不准确 | 中 | 中 | 🟡 | 先支持简单格式+收集实际数据迭代 |
| R03 | 大量文献时列表查询性能下降 | 中 | 低 | 🟢 | 合理索引+分页限制+虚拟滚动 |
| R04 | 模拟DOI数据无法满足真实需求 | 中 | 中 | 🟡 | 覆盖主要领域+明确标注MVP模式 |
| R05 | 三层架构过度设计 | 低 | 中 | 🟡 | MVP简化实现+预留接口 |
| R06 | 编辑器集成引用编号同步复杂 | 中 | 高 | 🔴 | 清晰状态机+服务端强制一致+充分测试 |

### 9.2 业务风险

| 编号 | 风险描述 | 可能性 | 影响 | 等级 | 缓解措施 |
|-----|---------|-------|------|------|---------|
| B01 | 用户对引用格式准确性要求极高 | 中 | 中 | 🟡 | 标注仅供参考+提供官方手册链接+快速响应 |
| B02 | 竞品（Zotero/EndNote）成熟度高 | 高 | 高 | 🔴 | 差异化定位（编辑器集成）+免费易用策略 |
| B03 | 不同学校/期刊格式变体需求 | 中 | 中 | 🟡 | 覆盖最通用的标准格式+收集高频变体 |
| B04 | 用户不理解文献类型分类 | 中 | 中 | 🟡 | UI示例说明+智能推荐+允许手动修改 |

### 9.3 外部依赖

| 依赖项 | 用途 | SLA要求 | 备选方案 |
|-------|------|---------|---------|
| PostgreSQL | 数据持久化 | ≥99.9% | SQLite（开发环境） |
| Redis | 缓存+限流 | ≥99.5% | 本地缓存兜底 |
| Crossref API (P1) | DOI真实数据源 | ≥95% | DataCite/Semantic Scholar |

---

## 10. 里程碑计划

### Phase 0: 准备阶段（当前）

**时间**：Day 1-2  
**产出物**：PRD文档 + 技术规格 + Migration脚本 + API契约 + 引用格式规则库初稿

### Phase 1: 后端核心开发

**时间**：Day 3-8（6个工作日）

| 天 | 任务 | 交付物 |
|---|------|--------|
| Day 3 | Schema扩展 + Migration | Prisma migration文件 |
| Day 4 | 文献CRUD API（6个接口） | RESTful API |
| Day 5 | 引用格式引擎 - 数据层+规则层 | NormalizedMetadata + FormatRules |
| Day 6 | 引用格式引擎 - 渲染层（三种格式） | 3个Renderer + 测试套件 |
| Day 7 | 引用生成API + DOI模拟服务 | Generate + Lookup API |
| Day 8 | 论文编辑器集成API | PaperCitation CRUD |

### Phase 2: 前端界面开发

**时间**：Day 4-10（与Phase 1并行）

| 天 | 任务 | 交付物 |
|---|------|--------|
| Day 4 | 文献库主页UI | 列表+搜索+分页 |
| Day 5 | 添加/编辑文献页 | 动态表单+实时预览 |
| Day 6 | DOI导入Modal | 检索动画+结果填充 |
| Day 7 | 文献详情页 | 元数据+引用预览+复制 |
| Day 8 | 批量操作UI | 多选+批量功能 |
| Day 9-10 | 编辑器引用集成 | 选择器+插入+列表同步 |

### Phase 3: 集成测试与修复

**时间**：Day 11-12（2个工作日）

**重点测试：**
- 引用格式准确率：3格式×6类型×10场景 = 180用例，覆盖率≥90%
- API接口：13个端点全部Pass
- E2E流程：添加→生成→插入论文完整流程Pass
- 性能基准：达到第5章指标

### Phase 4: 部署与上线

**时间**：Day 13（1个工作日）

**上线检查清单：**
- 所有P0功能可用且符合PRD验收标准
- 三种引用格式（GB/T 7714 / APA 7 / MLA 9）均可用
- 六种文献类型均可正确添加和生成引用
- DOI检索功能可用（模拟数据模式）
- 性能指标达到最低可接受值
- 安全扫描无高危漏洞
- 回滚方案就绪

---

## 附录

### A. 术语表

| 术语 | 英文 | 定义 |
|-----|------|------|
| 文献库 | Library | 用户个人管理的学术文献集合 |
| 元数据 | Metadata | 描述文献属性的数据（标题、作者等） |
| DOI | Digital Object Identifier | 数字对象标识符，文献的唯一永久标识符 |
| 引用格式 | Citation Style | 参考文献的排版规范（如GB/T 7714、APA、MLA） |
| 引用引擎 | Citation Engine | 根据规则自动生成引用字符串的程序模块 |
| 渲染层 | Render Layer | 引用引擎三层架构的最外层，负责最终字符串输出 |
| 规则层 | Rule Layer | 引用引擎三层架构的中间层，定义格式化规则配置 |
| 数据层 | Data Layer | 引用引擎三层架构的最底层，负责数据标准化 |
| 软删除 | Soft Delete | 标记删除而非物理删除，保留数据可恢复 |
| et al. | et alii |拉丁文"等人"，用于省略多余作者 |

### B. 参考文档

| 文档 | 关联章节 |
|-----|---------|
| 产品方案总纲 | 整体功能规划 |
| PRD-AIGC检测-MVP.md | 格式风格参考 |
| PRD-论文降重-MVP.md | 格式风格参考 |
| 现有Prisma Schema | Document模型基础 |
| GB/T 7714-2015 信息与文献 参考文献著录规则 | GB/T格式权威依据 |
| Publication Manual of the American Psychological Association, 7th Ed. | APA格式权威依据 |
| MLA Handbook, 9th Edition | MLA格式权威依据 |

### C. 引用格式速查卡

**GB/T 7714-2015 常用文献类型标识：**

| 类型 | 标识符 | 示例 |
|-----|--------|------|
| 期刊文章 | [J] | [J] |
| 专著（图书） | [M] | [M] |
| 学位论文 | [D] | [D] |
| 会议论文集 | [C] | [C] |
| 报纸文章 | [N] | [N] |
| 标准 | [S] | [S] |
| 专利 | [P] | [P] |
| 电子公告（网页） | [EB/OL] | [EB/OL] |

**APA 7 vs MLA 9 快速对比：**

| 维度 | APA 7 | MLA 9 |
|-----|-------|-------|
| 作者分隔 | `, ` + 最后`, &` | `, ` + 最后`, and` |
| 名字格式 | 首字母缩写 | 全名 |
| 年份位置 | 作者后括号内 | 容器信息后 |
| 文章标题 | 句首大写，不加引号 | 标题大写，双引号 |
| 期刊名 | 斜体 | 斜体 |
| 卷号 | 斜体 | vol. x 斜体 |
| DOI | 必须包含 | 通常不含 |

---

*ProductAgent PRD输出完成*

**下一步行动：**
1. 请总监（用户）审阅本PRD并提出修改意见
2. 批准后移交ArchitectAgent输出技术规格文档
3. 同时启动BackendAgent和FrontendAgent的准备工作

**预计MVP交付时间**：13个工作日内（约2.5周）

**预计人力投入：**
- ProductAgent: 2人天（PRD+验收）
- ArchitectAgent: 2人天（技术规格+DB设计）
- BackendAgent: 6人天（API+引擎开发）
- FrontendAgent: 6人天（UI开发）
- TestAgent: 2人天（测试）
- DevOpsAgent: 1人天（部署）
- **总计：19人天**
