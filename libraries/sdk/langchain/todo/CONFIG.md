# 配置说明

## API Key 配置

### 方法 1：环境变量（推荐）

在终端中设置环境变量：

**macOS / Linux:**
```bash
export GOOGLE_API_KEY='your-api-key-here'
```

**Windows CMD:**
```cmd
set GOOGLE_API_KEY=your-api-key-here
```

**Windows PowerShell:**
```powershell
$env:GOOGLE_API_KEY="your-api-key-here"
```

### 方法 2：.env 文件

1. 创建 `.env` 文件（在 tester 目录下）

2. 添加以下内容：
```env
GOOGLE_API_KEY=your-api-key-here
```

3. 安装 dotenv：
```bash
npm install dotenv
```

4. 在代码顶部添加：
```javascript
import 'dotenv/config';
```

### 方法 3：直接在代码中（不推荐）

仅用于测试，不要提交到 Git！

```javascript
const model = new ChatGoogleGenerativeAI({
  modelName: "gemini-1.5-pro",
  temperature: 0,
  apiKey: "your-api-key-here", // ⚠️ 不要提交到 Git
});
```

## 获取 API Key

### Google Gemini API Key

1. 访问：https://aistudio.google.com/app/apikey
2. 登录 Google 账号
3. 点击 "Create API Key"
4. 复制生成的 API Key

**免费额度：**
- Gemini 1.5 Flash: 15 RPM（每分钟请求数）
- Gemini 1.5 Pro: 2 RPM

**定价：** https://ai.google.dev/pricing

### OpenAI API Key（可选）

如果想使用 OpenAI 的模型：

1. 访问：https://platform.openai.com/api-keys
2. 登录账号
3. 创建新的 API Key

代码修改：
```javascript
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  modelName: "gpt-4",
  temperature: 0,
  apiKey: process.env.OPENAI_API_KEY,
});
```

### Claude API Key（可选）

如果想使用 Anthropic Claude：

1. 访问：https://console.anthropic.com/
2. 注册账号
3. 获取 API Key

代码修改：
```javascript
import { ChatAnthropic } from "@langchain/anthropic";

const model = new ChatAnthropic({
  modelName: "claude-3-5-sonnet-20241022",
  temperature: 0,
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

## 验证配置

创建测试文件 `test-config.js`：

```javascript
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const model = new ChatGoogleGenerativeAI({
  modelName: "gemini-1.5-pro",
  apiKey: process.env.GOOGLE_API_KEY,
});

async function test() {
  try {
    const result = await model.invoke("Say hello!");
    console.log("✅ 配置成功！");
    console.log("响应:", result.content);
  } catch (error) {
    console.error("❌ 配置失败:", error.message);
  }
}

test();
```

运行测试：
```bash
node test-config.js
```

## 安全建议

### ✅ 应该做的

- 使用环境变量存储 API Key
- 将 `.env` 添加到 `.gitignore`
- 定期轮换 API Key
- 为不同项目使用不同的 Key
- 监控 API 使用情况

### ❌ 不应该做的

- 不要在代码中硬编码 API Key
- 不要将 API Key 提交到 Git
- 不要分享包含 API Key 的截图
- 不要在公开场合展示 API Key

## .gitignore 配置

确保你的 `.gitignore` 包含：

```gitignore
# 环境变量
.env
.env.local
.env.*.local

# Node modules
node_modules/

# 日志
*.log
```

## 常见问题

### Q: 显示 "API key not valid"
A: 检查：
1. API Key 是否正确复制
2. 环境变量是否正确设置
3. 终端是否重新加载了环境变量

### Q: 如何在多个项目中共享配置？
A: 可以在 `~/.bashrc` 或 `~/.zshrc` 中添加：
```bash
export GOOGLE_API_KEY='your-key'
```

### Q: Windows 环境变量不生效？
A: 尝试：
1. 重启终端
2. 使用 PowerShell 而不是 CMD
3. 检查拼写（区分大小写）

### Q: 如何限制 API 使用？
A: 在 Google AI Studio 设置中可以设置配额限制

## 多模型配置

如果你想支持多个模型，可以这样配置：

```javascript
// config.js
export const models = {
  gemini: new ChatGoogleGenerativeAI({
    modelName: "gemini-1.5-pro",
    apiKey: process.env.GOOGLE_API_KEY,
  }),
  
  gpt4: new ChatOpenAI({
    modelName: "gpt-4",
    apiKey: process.env.OPENAI_API_KEY,
  }),
  
  claude: new ChatAnthropic({
    modelName: "claude-3-5-sonnet-20241022",
    apiKey: process.env.ANTHROPIC_API_KEY,
  }),
};

// 使用
import { models } from './config.js';
const model = models.gemini; // 或 models.gpt4, models.claude
```

## 环境变量最佳实践

### 开发环境

使用 `.env` 文件：
```env
NODE_ENV=development
GOOGLE_API_KEY=your-dev-key
LOG_LEVEL=debug
```

### 生产环境

通过系统环境变量或配置管理工具设置：
```bash
export NODE_ENV=production
export GOOGLE_API_KEY=your-prod-key
export LOG_LEVEL=info
```

### CI/CD 环境

在 CI/CD 平台（如 GitHub Actions）的 Secrets 中设置：
```yaml
env:
  GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
```

---

配置好后，就可以开始使用示例了！🚀

