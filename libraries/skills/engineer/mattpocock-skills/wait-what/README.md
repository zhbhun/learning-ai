# wait-what

> 停下来。上一条回复没讲明白：换个讲法重新讲一遍（仅手动）

## 场景

sandbox 里有一个三步部署脚本 pipeline.sh，配套一份术语表 GLOSSARY.md（定义了 artifact、promote、target、live 四个词）。用户让 agent 跑一遍部署并解释现状，第一轮回复行话密集；用户发 /wait-what，agent 按技能要求加上下文、用 ASD-STE100 简化技术英语、按术语表重新讲了一遍。仓库里只有一个 GLOSSARY.md，agent 直接采用它；技能提到的 GLOSSARY-MAP.md 仅在仓库有多个术语表时才需要。

## 对话

- 在仓库的 libraries/skills/engineer/mattpocock-skills/wait-what/sandbox 目录下有一个部署脚本 pipeline.sh。帮我跑一下 ./pipeline.sh staging，跑完给我讲讲这个脚本具体做了什么、我的应用现在处于什么状态。

  ```md
  跑完了，`./pipeline.sh staging` 三步全部成功退出。下面是脚本做的事和你应用的真实状态。

  ## 脚本做了什么（共 11 行）

  ```
  pipeline.sh <target>   # target 只接受 staging / prod
  ```

  1. **构建**：`tar czf app.tgz src` — 把整个 `src/` 目录打成 `app.tgz` 压缩包，放在 sandbox 根目录。
  2. **晋升（promote）**：`mkdir -p deploy/<target>` 然后把 `app.tgz` 复制到 `deploy/<target>/app.tgz`。
  3. **收尾**：打印 "done, `<target>` is live"。

  细节：`set -e` 开头，任何一步失败就中止；不传参数会直接报 usage 退出（`${1:?...}`）；传了 staging/prod 以外的值它也不会拦，会照样建出 `deploy/<随便什么>/` 目录。

  按仓库 `GLOSSARY.md` 的术语表：artifact = `app.tgz`，promote = 复制到 target 并让它对外服务，target = staging 或 prod。

  ## 你的应用现在处于什么状态

  - `deploy/staging/app.tgz` 已就位，我解包核对过，内容和 `src/app.js` 完全一致（应用本体就一行 `console.log("hello from the app")`）。
  - `deploy/prod/` **不存在**——这次运行完全没碰 prod。
  - 有一点值得注意：脚本最后说 "staging is live with the new artifact"，但按术语表 "live" 的定义是“用户此刻拿到的版本”，而整个脚本**没有任何启动服务或部署到远端的动作**，纯粹是本地文件复制。所以准确说法是：staging 目录里放了一份新鲜的 artifact，但并没有什么东西在真正“对外服务”——"is live" 这句输出比脚本实际做的事要响亮。

  相关文件：
  - `sandbox/pipeline.sh`
  - `sandbox/GLOSSARY.md`
  - 产物：`sandbox/app.tgz` 和 `sandbox/deploy/staging/app.tgz`（均为本次运行新生成）
  ```

- /wait-what

  ```md
  `wait-what` 技能在此会话中未注册，因此我直接读取其 SKILL.md。
  只有一个 `GLOSSARY.md`（沙箱里的那个），没有 `GLOSSARY-MAP.md`，所以我重新整理了报告，使用其术语，并采用 ASD-STE100 简化技术英语。正在按要求重新表述。

  ---

  ## 背景

  你让我运行 `pipeline.sh`，目标为 `staging`。位置：`sandbox` 目录位于 `libraries/skills/engineer/mattpocock-skills/wait-what/sandbox/`。

  ## 脚本操作说明 — 三步

  1. 脚本读取 `target` 参数。这里：`staging`。
  2. 第一步：脚本从 `src/` 生成 `artifact`。`artifact` 是 `app.tgz`。
  3. 第二步：脚本将 `artifact` 从 `staging` 提升。然后 `deploy/staging/` 目录下就有了 `artifact` 的副本。
  4. 第三步：脚本打印一条完成消息。

  `set -e` 配置意味着脚本会在任何失败步骤处停止。如果没有 `target` 参数，脚本将不会运行。脚本不会检查 `target` 名称。因此，错误的名称也会成功——请务必指定 `staging` 或 `prod`。

  ## 当前状态

  - `staging` 是可用的。它拥有新的 `artifact`。`artifact` 内容与 `src/app.js` 一致。我已经验证了这一点。
  - `prod` 未被触及。`deploy/prod/` 不存在。当前生产环境没有可用的 `artifact`。
  - 脚本消息显示 "`staging` is live"。我不同意这一点。根据 `GLOSSARY.md` 的定义，`live` = 当前用户获得的版本。脚本不启动服务器。它不进行网络部署。它只复制文件。因此，"`staging` is live" 是不准确的。当前状态为：`staging` 目录持有该 `artifact`。没有服务器对其进行服务。
  - 本次运行生成的文件：`.../sandbox/app.tgz`，`.../sandbox/deploy/staging/app.tgz`。两者均运行于 2026-11-06 14:23。

  此任务已完成，无需进一步工作。若 `staging` 状态报告需要修正，请告诉我。
  ```

## 总结

agent 上一条回复你没看懂时，敲 /wait-what，它停下来把那段话重新讲一遍：先补上你缺的背景，句子砍到一句一个信息点，术语严格按仓库 GLOSSARY.md 的定义用（仓库里有多个术语表时按 GLOSSARY-MAP.md 找到对应那份）。

对比这两轮最直观：第一轮是正常工程师口吻，长句连着术语带解释；第二轮全是短句、按步骤编号、开头多了一节背景，术语都换成定义原样出现（“`artifact` 是 `app.tgz`”“`live` = 当前用户获得的版本”）。值得注意的是它上一轮的核心判断——脚本输出说 "is live" 但实际没有任何东西在对外服务——在新讲法里一字未丢，重新讲不等于把结论讲丢。

两点局限：它只管换讲法，不管内容对错，前提是第一遍讲的东西本身靠谱；术语表是仓库自己的文件、技能不带，仓库里没有 GLOSSARY.md 时用词全靠 agent 自己定，术语统一的效果就没了（本例试用的术语表是场景预埋的）。
