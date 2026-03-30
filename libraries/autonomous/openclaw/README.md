- https://clawhub.ai/
- https://openclaw-docs.dx3n.cn
- https://github.com/hesamsheikh/awesome-openclaw-usecases

## 插件

能力

- Provider
- Channel
- Hook
- Tool
- Skill
- Service

类型

- Native: openclaw.plugin.json + runtime module
- Bundle: Codex/Claude/Cursor-compatible


### 安装

命令行

```bash
# 查看
$ openclaw plugins list  
$ openclaw plugins status
$ openclaw plugins inspect <id>

# 安装
## npm（安装后放在 .openclaw/extensions 目录下）
$ openclaw plugins install <package>
$ openclaw plugins install clawhub:<pkg>
## 本地（开启 link 时，在 openclaw.json 里直接引用项目路径）
$ openclaw plugins install <path>
$ openclaw plugins install -l ./my-plugin

# 更新
$ openclaw plugins update <id>
$ openclaw plugins update --all
```

ps：安装玩后需要手动重启 `openclaw gateway restart`

聊天

```
/plugin install clawhub:@openclaw/voice-call
/plugin show voice-call
/plugin enable voice-call
```

### 配置

```jsonc
{
  "plugins": {
    "load": {
      // 本地插件加载路径, npm 放在 .openclaw/extensions 里会自动加载
      "paths": ["/.../xxx"]
    },
    "entries": {
      "xxx": {
        // 是否启用插件
        "enabled": true,
        // 插件的配置
        "config": {}
      },
      "yyy": {
        "enabled": true,
        "config": {}
      }
    },
    "installs": {
      // 本地
      "xxx": {
        "source": "path",
        "sourcePath": "/.../xxx",
        "installPath": "/.../xxx",
        "version": "x.y.z",
        "installedAt": "2026-03-26T09:27:38.660Z"
      },
      // npm
      "yyy": {
        "source": "npm",
        "spec": "yyy",
        "installPath": "/root/.openclaw/extensions/yyy",
        "version": "x.y.z",
        "resolvedName": "yyy",
        "resolvedVersion": "x.y.z",
        "resolvedSpec": "yyy@x.y.z",
        "integrity": "...",
        "shasum": "...",
        "resolvedAt": "2026-03-26T09:27:38.660Z",
        "installedAt": "2026-03-26T09:28:31.989Z"
      }
    }
  }
}
```

ps：openclaw 默认按下面的目录查找插件，开发的时候可以用 

1. `plugins.load.paths`
2. `<workspace>/.openclaw/<plugin-root>`
3. `~/.openclaw/extensions/<plugin-root>/*.ts`
4. 内置插件...

### 开发

TODO

## 编排

- [paperclip](https://github.com/paperclipai/paperclip)
- [clawith](https://github.com/dataelement/Clawith)
