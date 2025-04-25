# RootData MCP 服务器

[English](./README.md) | 简体中文

一个全面的模型上下文协议（MCP）服务器，提供对 RootData 加密资产数据平台 API 的访问，使加密项目、投资者和市场数据能够无缝集成到 AI 应用程序中。

## 功能特性

- 🔍 **实体搜索**：搜索加密领域的项目、风投机构和个人
- 📊 **详细分析**：获取项目、投资者和个人的全面信息
- 📈 **市场趋势**：追踪热门项目、融资轮次和社交指标
- 🔄 **跨功能分析**：结合多个 API 端点获取全面洞察
- 💰 **融资数据**：访问详细的融资轮次信息
- 🌐 **生态系统映射**：探索项目与生态系统之间的关系
- 👥 **社交指标**：追踪 X（推特）的参与度和影响力排名

## 安装

```bash
# 克隆仓库
git clone https://github.com/your-username/rootdata-mcp

# 安装依赖
npm install

# 建立测试程序
npm run build

# 创建 .env 文件
cp .env.example .env

# 在 .env 中添加您的 RootData API 密钥
ROOTDATA_API_KEY=your_api_key_here
```

## 配置

1. 从 [RootData](https://www.rootdata.com/Api) 获取 API 密钥
2. 在根目录创建 `.env` 文件：

```env
ROOTDATA_API_KEY=your_api_key_here
```

3. 将服务器添加到您的 Claude Desktop 配置中：

```json
{
  "mcpServers": {
    "rootdata": {
      "command": "node",
      "args": ["path/to/rootdata-mcp/build/index.js"], //组装文件路径
      "env": {
        "ROOTDATA_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## 可用工具

### 1. 核心 API 功能

#### `searchEntities`

通过关键词搜索项目、风投机构或个人。

```typescript
{
  query: string;         // 搜索关键词
  preciseXSearch?: boolean; // 通过 X 用户名搜索（@...）
}
```

#### `getProject`

获取详细的项目信息。

```typescript
{
  projectId: number;     // 项目 ID
  includeTeam?: boolean; // 包含团队成员
  includeInvestors?: boolean; // 包含投资者
}
```

#### `getOrg`

获取详细的风投/机构信息。

```typescript
{
  orgId: number;         // 机构 ID
  includeTeam?: boolean; // 包含团队成员
  includeInvestments?: boolean; // 包含投资项目
}
```

### 2. 高级分析工具

#### `analyzeComprehensive`

结合多个 RootData 端点的综合分析。

```typescript
{
  query: string;        // 自然语言查询
  analysisType?: 'project' | 'investor' | 'ecosystem' | 'trends' | 'fundraising' | 'comprehensive';
  timeframe?: string;   // 分析时间段
  depth?: 'basic' | 'detailed' | 'full';
  includeRelated?: boolean; // 包含相关实体
}
```

#### `investigateEntity`

深入研究特定实体及其所有相关信息。

```typescript
{
  entityName: string;   // 项目、投资者或个人的名称
  entityType?: 'project' | 'investor' | 'person' | 'auto';
  investigationScope?: 'basic' | 'funding' | 'social' | 'ecosystem' | 'all';
}
```

#### `trackTrends`

追踪项目、融资和社交指标的市场趋势。

```typescript
{
  category: 'hot_projects' | 'funding' | 'job_changes' | 'new_tokens' | 'ecosystem' | 'all';
  timeRange?: '1d' | '7d' | '30d' | '3m';
  filterBy?: {
    ecosystem?: string;
    tags?: string;
    minFunding?: number;
  };
}
```

#### `compareEntities`

并排比较多个项目或投资者。

```typescript
{
  entities: string[];   // 要比较的实体名称列表
  compareType?: 'metrics' | 'funding' | 'ecosystem' | 'social' | 'all';
}
```

### 3. 市场分析工具

#### `getHotProjects`

获取前 100 个热门加密项目。

```typescript
{
  days: number; // 时间段（1 或 7 天）
}
```

#### `getXHotProjects`

获取 X 平台热门项目排名。

```typescript
{
  heat?: boolean;       // 获取热度排名
  influence?: boolean;  // 获取影响力排名
  followers?: boolean;  // 获取关注者排名
}
```

#### `getNewTokens`

获取过去 3 个月新发行的代币。

#### `getFundingRounds`

获取融资轮次信息。

```typescript
{
  page?: number;
  pageSize?: number;
  startTime?: string;   // yyyy-MM
  endTime?: string;     // yyyy-MM
  minAmount?: number;
  maxAmount?: number;
  projectId?: number;
}
```

## 使用示例

### 1. 项目分析

```
"给我一个以太坊的综合分析，包括融资、生态系统和社交指标"
```

### 2. 投资者研究

```
"调查币安实验室，展示他们最近的投资和投资组合"
```

### 3. 市场趋势

```
"追踪加密领域最热门的 AI 项目及其最新融资情况"
```

### 4. 实体对比

```
"对比以太坊、Polygon 和 Solana 的融资、生态系统和社交指标"
```

### 5. 生态系统分析

```
"展示所有 Layer 2 项目及其融资和热度排名"
```

## API 限制

- 每个 API 密钥每分钟 30 个请求
- 不同端点有不同的积分成本（每个请求 1-50 积分）
- 请监控您的使用量以避免达到限制

## 开发

### 构建

```bash
npm run build
```

### 监视模式

```bash
npm run watch
```

### 清理

```bash
npm run clean
```

## 错误处理

服务器包含全面的错误处理：

- API 认证错误
- 无效参数
- 速率限制
- 网络问题
- 数据解析错误

## 贡献

1. Fork 本仓库
2. 创建您的特性分支（`git checkout -b feature/amazing-feature`）
3. 提交您的更改（`git commit -m '添加一些很棒的特性'`）
4. 推送到分支（`git push origin feature/amazing-feature`）
5. 开启一个 Pull Request

## 许可证

MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 致谢

- [RootData](https://www.rootdata.com) 提供全面的加密数据 API
- [Anthropic](https://www.anthropic.com) 提供模型上下文协议框架

## 支持

对于问题和功能请求，请在 GitHub 上开启一个 issue 或联系 support@rootdata.com 咨询 API 相关问题。

---

为加密社区用 ❤️ 制作
