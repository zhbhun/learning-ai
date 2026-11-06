# wizard

> 生成交互式 bash 向导脚本，带着人一步步走完只有本人能做的手动操作。适用于开通基础设施、配置凭证或 CI secrets、走陌生第三方控制台、一次性数据迁移或割接；AI 自己能完成的步骤不要用它。

## 场景

一个 newsletter 项目接了 Resend 发确认邮件，但 `RESEND_API_KEY` 还没配，项目跑不起来——这个 key 要从 Resend 控制台拿（只有本人能登录去复制），再写进本地 `.env` 和 GitHub secrets（CI 里引用）。沙箱预埋了 `.env.example`（含一个非 secret 的 `EMAIL_FROM`）和引用 `secrets.RESEND_API_KEY` 的 CI workflow。

## 对话

- /wizard 我刚给我的 newsletter 项目接入了 Resend 发确认邮件，项目在 sandbox 下，后续操作都在这个目录里做。现在项目还跑不起来，因为 RESEND_API_KEY 既没写进本地 .env，也没配成 GitHub secrets（CI 里要用）。帮我生成一个脚本，带着我把这些配置一步步走完。

  ```md
  验证完成：`bash -n` 语法通过（shellcheck 未安装，跳过），已加执行权限。静态追踪确认：`ask_secret` 捕获的 `RESEND_API_KEY` 经 `write_env` 落入 `.env`、经 `set_secret` 落入 GitHub，secret 名与 `ci.yml` 里的 `secrets.RESEND_API_KEY` 完全一致；模板库部分一字未动。范围按你点名的最小化：`EMAIL_FROM` 没加进去，只有 API key 一个 stage。

  **已生成的脚本**：`sandbox/setup-resend.sh`

  它做的事（1 个 stage，逐步带你走）：
  1. 自动打开 `https://resend.com/api-keys`，告诉你登录后进 Dashboard → API Keys；没有 key 就点「Create API Key」（命名、选 Sending access），已有 key 就点行上的复制图标，并提示完整 key 只在创建时显示一次。
  2. `ask_secret` 隐藏输入，粘贴以 `re_` 开头的 key。
  3. `write_env` 幂等写入 sandbox 下的 `.env`（不存在则以 0600 权限创建，重跑会保留已有值，Enter 即保留当前值）。
  4. `set_secret` 写入 GitHub 仓库 secret `RESEND_API_KEY`（对应 ci.yml 的引用）。
  5. 收尾打印总结：写入了哪些值、哪些跳过了。

  **如何运行**：
  ```bash
  cd sandbox
  ./setup-resend.sh
  ```
  Ctrl-C 随时可退，重跑会记住已保存的值。

  **一个已知缺口**：本机没有安装 `gh` CLI，所以第 4 步的 GitHub secret 写入会被自动跳过并在结尾提示手动命令。两个选择：
  - 先 `brew install gh && gh auth login`，再跑脚本，一步到位；
  - 或者脚本跑完后手动执行结尾提示的 `gh secret set RESEND_API_KEY`。

  注意 `gh secret set` 作用的是当前 git 仓库，CI 也在这个仓库上，正好对应。脚本按 skill 约定默认是一次性的，配完可删；如果想留着当可重复的初始化路径，再考虑提交进仓库。
  ```

## 总结

AI 能替你写代码、跑命令，但有一类活天生只能你亲自干：登录第三方网站、在控制台里点来点去、把 API key 复制出来。这类活烦在两头——手动做容易漏步骤，找 AI 帮忙又得反复截图解释「我该点哪」。这个技能干的事是生成一个 bash 向导脚本：你跑它，它自动打开该开的网页，告诉你点哪个按钮、复制哪个值，粘贴进去后它把值写进 `.env`、GitHub secrets 该去的地方，每一步都确认、随时显示还剩几步。没装这个技能时，你得到的是一堆「先去 A 再去 B 然后……」的文字说明（示意）；装了之后，你得到的是一个会自己开网页、能中途退出重跑（已存的值不丢）的脚本。

实际跑下来的感受：它先读仓库摸清要配哪些值（`.env.example`、CI workflow 里每个 `secrets.*` 引用都算一个），再严格按需生成——沙箱里明明还有个 `EMAIL_FROM`，但用户没点名，子代理就不给它加 stage，并在交付时明说了取舍。技能要求「展示阶段清单并和用户确认」，单轮派发下子代理没停下来等确认，直接按最小范围生成了。另一处贴心的是降级：本机没装 `gh` CLI，脚本不会失败到一半，而是跳过 GitHub secret 写入、结尾列出手动补做的命令。生成的脚本默认是一次性的，配完就删——要留成团队可重复的初始化路径，再提交进仓库并在 README 里链过去。
