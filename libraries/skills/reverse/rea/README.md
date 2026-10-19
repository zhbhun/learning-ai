## 使用教程

### 应用分析

- `npx -y rea-agents@latest analyze-javascript-application "$HOME\Downloads\notes-example" --format json --filter-output normalized_result.summary.ipc`
- `npx -y rea-agents@latest analyze-javascript-application "$env:LOCALAPPDATA\Programs\Xmind\resources\app.asar" --format json --filter-output normalized_result.summary.ipc,normalized_result.statistics`

### 网页分析

1. 带调试端口启动浏览器

  `"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir=%TEMP%\rea-chrome https://rea.tools/examples/notes-web/`

2. 查询浏览器打开了哪些页面

  `npx -y rea-agents@latest list-browser-targets http://127.0.0.1:9222 --format json`

3. 分析网页一段时间内的请求

  `npx -y rea-agents@latest inspect-web-page http://127.0.0.1:9222 页面ID --observation-ms 12000 --format json --filter-output normalized_result.network.requests`

## 参考文献

- [GitHub 11万star：AI拆软件神器保姆级实操教程](https://www.cnblogs.com/weipo0105/p/23276536)