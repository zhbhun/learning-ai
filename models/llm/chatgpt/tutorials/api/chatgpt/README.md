## session

```
GET https://chat.openai.com/api/auth/session

cookie: ...

---

{
  "user": {
    "id": "user-xxx",
    "name": "xxx",
    "email": "xxx@yyy.com",
    "image": "https://lh3.googleusercontent.com/a/xxx",
    "picture": "https://lh3.googleusercontent.com/a/xxx",
    "mfa": false,
    "groups": [],
    "intercom_hash": "xxx"
  },
  "expires": "2023-05-07T02:57:57.990Z",
  "accessToken": "..."
}
```

## check

```
GET https://chat.openai.com/backend-api/accounts/check

authorization: Bearer ...
content-type: application/json

```

## models

```
GET https://chat.openai.com/backend-api/models

authorization: Bearer ...
content-type: application/json

---

{
  "models": [
    {
      "slug": "text-davinci-002-render-sha",
      "max_tokens": 4097,
      "title": "Turbo (Default for free users)",
      "description": "The standard ChatGPT model",
      "tags": [],
      "qualitative_properties": {}
    }
  ]
}

```

## conversations

```
GET https://chat.openai.com/backend-api/conversations?offset=0&limit=20

authorization: Bearer ...
content-type: application/json

---

{
  "items": [
    {
      "id": "b3a8e92a-19c0-4522-a55e-512aac059bb7",
      "title": "New chat",
      "create_time": "2023-04-06T12:05:36.709738",
      "update_time": "2023-04-06T12:27:51"
    },
    {
      "id": "37e8b353-06f9-4910-bdeb-e4e8df3c4a9a",
      "title": "ChatGPT问答",
      "create_time": "2023-04-06T11:58:18.550437",
      "update_time": "2023-04-07T02:55:15"
    }
  ],
  "total": 2,
  "limit": 20,
  "offset": 0,
  "has_missing_conversations": false
}
```

## conversation create

1. 初始对话

  chatgpt 会自动根据不存在的 message id 创建一个新的对话，parent_message_id 会作为根 message_id、

  ```
  POST https://chat.openai.com/backend-api/conversation

  authorization: Bearer ...
  content-type: application/json

  {
    "action": "next",
    "messages": [
      {
        "id": "7d5dbfb0-6511-4192-b5f2-13779fed444e",
        "author": { "role": "user" },
        "content": { "content_type": "text", "parts": ["介绍下你自己"] }
      }
    ],
    "parent_message_id": "6b46ad89-02e5-47e9-8e86-b684de4e2f0b",
    "model": "text-davinci-002-render-sha",
    "timezone_offset_min": -480
  }

  ---
  
  access-control-allow-credentials: true
  access-control-allow-origin: https://chat.openai.com
  content-type: text/event-stream

  {
    "message": {
      "id": "8a4a4d19-6fd4-4de1-98a4-83732cc93015",
      "author": { "role": "assistant", "metadata": {} },
      "create_time": 1680839802.947492,
      "content": {
        "content_type": "text",
        "parts": [
          "你好，我是ChatGPT，是一款基于GPT-3.5架构的大型语言模型，由OpenAI开发和训练。\n\n我可以进行各种自然语言处理任务，例如生成文本、回答问题、语言翻译、情感分析、文本摘要等。我被设计为可以使用自然语言与人类交互，从而帮助人们更好地理解和处理各种语言相关的问题。\n\n我训练时使用了大量的语料库和深度学习算法，能够模拟人类的语言行为和思考模式。我的功能和表现取决于训练的数据和算法，可以随着时间和技术的进步而不断发展和改进。\n\n总之，我是一款非常强大的自然语言处理工具，可以帮助人们更好地理解和处理语言相关的问题。"
        ]
      },
      "end_turn": true,
      "weight": 1.0,
      "metadata": {
        "model_slug": "text-davinci-002-render-sha",
        "finish_details": { "type": "stop", "stop": "<|im_end|>" },
        "timestamp_": "absolute"
      },
      "recipient": "all"
    },
    "conversation_id": "4c21976d-0b9a-42c0-a391-ede07cc825fb",
    "error": null
  }

  --- 初始化的消息对话列表 ---

  {
    "title": "ChatGPT：语言模型介绍",
    "create_time": 1680839790.067117,
    "update_time": 1680839804.0,
    "mapping": {
      "6b46ad89-02e5-47e9-8e86-b684de4e2f0b": {
        "id": "6b46ad89-02e5-47e9-8e86-b684de4e2f0b",
        "children": ["c927524c-07e7-406a-8b45-5bba79ead3f7"]
      },
      "c927524c-07e7-406a-8b45-5bba79ead3f7": {
        "id": "c927524c-07e7-406a-8b45-5bba79ead3f7",
        "message": {
          "id": "c927524c-07e7-406a-8b45-5bba79ead3f7",
          "author": { "role": "system", "metadata": {} },
          "create_time": 1680839790.067117,
          "content": { "content_type": "text", "parts": [""] },
          "end_turn": true,
          "weight": 1.0,
          "metadata": {},
          "recipient": "all"
        },
        "parent": "6b46ad89-02e5-47e9-8e86-b684de4e2f0b",
        "children": ["7d5dbfb0-6511-4192-b5f2-13779fed444e"]
      },
      "7d5dbfb0-6511-4192-b5f2-13779fed444e": {
        "id": "7d5dbfb0-6511-4192-b5f2-13779fed444e",
        "message": {
          "id": "7d5dbfb0-6511-4192-b5f2-13779fed444e",
          "author": { "role": "user", "metadata": {} },
          "create_time": 1680839790.078414,
          "content": { "content_type": "text", "parts": ["介绍下你自己"] },
          "weight": 1.0,
          "metadata": { "timestamp_": "absolute" },
          "recipient": "all"
        },
        "parent": "c927524c-07e7-406a-8b45-5bba79ead3f7",
        "children": ["8a4a4d19-6fd4-4de1-98a4-83732cc93015"]
      },
      "8a4a4d19-6fd4-4de1-98a4-83732cc93015": {
        "id": "8a4a4d19-6fd4-4de1-98a4-83732cc93015",
        "message": {
          "id": "8a4a4d19-6fd4-4de1-98a4-83732cc93015",
          "author": { "role": "assistant", "metadata": {} },
          "create_time": 1680839802.947492,
          "content": {
            "content_type": "text",
            "parts": [
              "你好，我是ChatGPT，是一款基于GPT-3.5架构的大型语言模型，由OpenAI开发和训练。\n\n我可以进行各种自然语言处理任务，例如生成文本、回答问题、语言翻译、情感分析、文本摘要等。我被设计为可以使用自然语言与人类交互，从而帮助人们更好地理解和处理各种语言相关的问题。\n\n我训练时使用了大量的语料库和深度学习算法，能够模拟人类的语言行为和思考模式。我的功能和表现取决于训练的数据和算法，可以随着时间和技术的进步而不断发展和改进。\n\n总之，我是一款非常强大的自然语言处理工具，可以帮助人们更好地理解和处理语言相关的问题。"
            ]
          },
          "end_turn": true,
          "weight": 1.0,
          "metadata": {
            "model_slug": "text-davinci-002-render-sha",
            "finish_details": { "type": "stop", "stop": "<|im_end|>" },
            "timestamp_": "absolute"
          },
          "recipient": "all"
        },
        "parent": "7d5dbfb0-6511-4192-b5f2-13779fed444e",
        "children": []
      }
    },
    "moderation_results": [],
    "current_node": "8a4a4d19-6fd4-4de1-98a4-83732cc93015"
  }

  ```

2. 设置对话标题

  根据初始返回的响应消息 id 生成标题

  ```
  POST https://chat.openai.com/backend-api/conversation/gen_title/4c21976d-0b9a-42c0-a391-ede07cc825fb

  authorization: Bearer ...
  content-type: application/json

  {"message_id":"8a4a4d19-6fd4-4de1-98a4-83732cc93015"}

  ---

  {"title":"ChatGPT问答模型"}
  ```

3. ？？？

  ```
  POST https://chat.openai.com/backend-api/moderations

  authorization: Bearer ...
  content-type: application/json

  {
    "input": "\n你是谁？\n\n我是ChatGPT，一个由OpenAI训练的大型语言模型，基于GPT-3.5架构。我被设计为能够回答各种各样的问题并提供有用的信息和建议。有什么我可以帮助你的吗？",
    "model": "text-moderation-playground",
    "conversation_id": "cd37b353",
    "message_id": "8c40095b"
  }

  ---

  {"flagged":false,"blocked":false,"moderation_id":"modr-72WoZ"}
  ```

## conversation list

```
GET https://chat.openai.com/backend-api/conversation/37e8b353

authorization: Bearer ...
content-type: application/json

---

{
  "title": "ChatGPT问答",
  "create_time": 1680782298.550437,
  "update_time": 1680836115.0,
  "mapping": {
    "6fc06d0b-ee34-46c2-b94c-bc8bba43a06a": {
      "id": "6fc06d0b-ee34-46c2-b94c-bc8bba43a06a",
      "children": ["7e4364f3-ea94-41ae-9f15-462086a149f6"]
    },
    "7e4364f3-ea94-41ae-9f15-462086a149f6": {
      "id": "7e4364f3-ea94-41ae-9f15-462086a149f6",
      "message": {
        "id": "7e4364f3-ea94-41ae-9f15-462086a149f6",
        "author": { "role": "system", "metadata": {} },
        "create_time": 1680782298.550437,
        "content": { "content_type": "text", "parts": [""] },
        "end_turn": true,
        "weight": 1.0,
        "metadata": {},
        "recipient": "all"
      },
      "parent": "6fc06d0b-ee34-46c2-b94c-bc8bba43a06a",
      "children": ["1dd2301a-a874-4560-891b-7e9b60477ee9"]
    },
    "1dd2301a-a874-4560-891b-7e9b60477ee9": {
      "id": "1dd2301a-a874-4560-891b-7e9b60477ee9",
      "message": {
        "id": "1dd2301a-a874-4560-891b-7e9b60477ee9",
        "author": { "role": "user", "metadata": {} },
        "create_time": 1680782298.555763,
        "content": { "content_type": "text", "parts": ["你是谁?"] },
        "weight": 1.0,
        "metadata": { "timestamp_": "absolute" },
        "recipient": "all"
      },
      "parent": "7e4364f3-ea94-41ae-9f15-462086a149f6",
      "children": ["37faf3fb-eb65-4af7-b896-dad3e73af8a2"]
    },
    "37faf3fb-eb65-4af7-b896-dad3e73af8a2": {
      "id": "37faf3fb-eb65-4af7-b896-dad3e73af8a2",
      "message": {
        "id": "37faf3fb-eb65-4af7-b896-dad3e73af8a2",
        "author": { "role": "assistant", "metadata": {} },
        "create_time": 1680782303.24759,
        "content": {
          "content_type": "text",
          "parts": [
            "我是ChatGPT，一个由OpenAI训练的大型语言模型，基于GPT-3.5架构。我可以回答各种问题，提供信息和帮助解决问题。"
          ]
        },
        "end_turn": true,
        "weight": 1.0,
        "metadata": {
          "model_slug": "text-davinci-002-render-sha",
          "finish_details": { "type": "stop", "stop": "<|im_end|>" },
          "timestamp_": "absolute"
        },
        "recipient": "all"
      },
      "parent": "1dd2301a-a874-4560-891b-7e9b60477ee9",
      "children": []
    }
  },
  "moderation_results": [],
  "current_node": "37faf3fb-eb65-4af7-b896-dad3e73af8a2"
}
```

## message

```
POST  https://chat.openai.com/backend-api/conversation

authorization: Bearer ...
content-type: application/json
referer: https://chat.openai.com/chat/37e8b353-06f9-4910-bdeb-e4e8df3c4a9a

{
  "action": "next",
  "messages": [
    {
      "id": "bcebf85d",
      "author": { "role": "user" },
      "content": {
        "content_type": "text",
        "parts": ["你是谁？"]
      }
    }
  ],
  "conversation_id": "37e8b353",
  "parent_message_id": "db43c33e",
  "model": "text-davinci-002-render-sha",
  "timezone_offset_min": -480
}

---

access-control-allow-credentials: true
access-control-allow-origin: https://chat.openai.com
content-type: text/event-stream

{
  "message": {
    "id": "d2cf2c5c-8eb3-48af-803b-c797a281cdd2",
    "author": {
      "role": "assistant",
      "name": null,
      "metadata": {}
    },
    "create_time": 1680838106.243919,
    "update_time": null,
    "content": {
      "content_type": "text",
      "parts": [
        "当然，很高兴能够向你介绍一下我自己！\n\n我是ChatGPT，一种基于自然语言处理技术的AI助手。我被训练用于自然语言生成，可以处理和回答各种问题，并且可以进行多种自然语言任务，如文本生成、摘要、翻译等等。\n\n我是基于GPT-3.5架构开发的，这是一种经过训练的深度神经网络，可以预测下一个单词或字符的概率，并生成具有连贯性和逻辑性的文本。我在许多方面都非常擅长，包括自然语言理解、自然语言生成、语言翻译、问答系统等等。\n\n我被设计为一种开放式的语言模型，这意味着我可以不断学习并自我完善，以更好地为用户提供帮助。我可以用于各种领域，包括教育、医疗、金融、媒体、娱乐等等。如果您有任何问题或需要帮助，请随时问我！"
      ]
    },
    "end_turn": true,
    "weight": 1,
    "metadata": {
      "message_type": "next",
      "model_slug": "text-davinci-002-render-sha",
      "finish_details": {
        "type": "stop",
        "stop": "<|im_end|>"
      }
    },
    "recipient": "all"
  },
  "conversation_id": "b3a8e92a-19c0-4522-a55e-512aac059bb7",
  "error": null
}
```

## ...