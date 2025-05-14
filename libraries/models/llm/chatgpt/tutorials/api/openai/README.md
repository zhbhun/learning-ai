## chat

### completions

#### 超出 Token

- Normal

  ```
  400

  {
    "error": {
      "message": "This model's maximum context length is 4097 tokens. However, your messages resulted in 4258 tokens. Please reduce the length of the messages.",
      "type": "invalid_request_error",
      "param": "messages",
      "code": "context_length_exceeded"
    }
  }
  ```

- Stream

  ```
  400

  TODO
  ```

## 示例

- [chatgpt-vue](https://github.com/lianginx/chatgpt-vue) - 使用 Vue3 + Typescript + Tailwind CSS 框架，调用 OpenAI 的 gpt-3.5-turbo 模型 API 实现的简单聊天对话，支持连续对话。