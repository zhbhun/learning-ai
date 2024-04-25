- https://learningprompt.wiki/
- https://learnprompting.org/
- https://www.promptingguide.ai/zh/

## 原则

- 包含完整的信息

  - Bad：`Write a poem about OpenAI.`
  - Good: `Write a short inspiring poem about OpenAI, focusing on the recent DALL-E product launch (DALL-E is a text to image ML model) in the style of a {famous poet}`

- 简洁易懂，并减少歧义

  - Bad：`The description for this product should be fairly short, a few sentences only, and not too much more.`
  - Good: `Use a 3 to 5 sentence paragraph to describe this product.`

- 使用正确的语法、拼写，以及标点

## 技巧

### To do and Not To do

在问答场景里，为了让 AI 回答更加准确，一般会在问题里加条件。

- Bad: `Recommend a movie to me`
- Good: 

  ```
  Recommend a movie to me.
  DO NOT ASK FOR INTERESTS. DO NOT ASK FOR PERSONAL INFORMATION.
  ```

### 基于示例回答

在某些场景下，我们能比较简单地向 AI 描述出什么能做，什么不能做。但有些场景，有些需求很难通过文字指令传递给 AI，即使描述出来了，AI 也不能很好地理解。

- bad:

  ```
  Suggest three names for a horse that is a superhero.

  ---

  Thunder Hooves, Captain Canter, Mighty Gallop
  ```

- good:

  ```
  Suggest three names for an animal that is a superhero.

  Animal: Cat
  Names: Captain Sharpclaw, Agent Fluffball, The Incredible Feline
  Animal: Dog
  Names: Ruff the Protector, Wonder Canine, Sir Barks-a-Lot
  Animal: Horse
  Names:

  ---

  Gallop Guardian, Equine Avenger, The Mighty Stallion
  ```

### 使用引导词，引导模型输出特定内容

- bad:

  ```
  Create a MySQL query for all students in the Computer Science Department:
  Table departments, columns = [DepartmentId, DepartmentName]
  Table students, columns = [DepartmentId, StudentId, StudentName]
  ```

- good:

  ```
  Create a MySQL query for all students in the Computer Science Department:
  Table departments, columns = [DepartmentId, DepartmentName]
  Table students, columns = [DepartmentId, StudentId, StudentName]
  SELECT
  ```

### 增加角色或任务

在 prompt 里增加一些 role（角色）相关的内容，让 AI 生成的内容更符合你的需求。

- bad:

  ```
  Please rewrite the following sentences to make them easier to understand.
  ```

- good:

  ```
  You are a primary school teacher who can explain complex content to a level that a 7 or 8 year old child can understand. Please rewrite the following sentences to make them easier to understand:
  ```

### 使用特殊符号指令和需要处理的文本分开

可以用“”“将指令和文本分开。如果你的文本有多段，增加”“”会提升 AI 反馈的准确性。

- bad:

  ```bad
  Please summarize the following sentences to make them easier to understand.
  OpenAI is an American artificial intelligence (AI) research laboratory consisting of the non-profit OpenAI Incorporated (OpenAI Inc.) and its for-profit subsidiary corporation OpenAI Limited Partnership (OpenAI LP). OpenAI conducts AI research with the declared intention of promoting and developing a friendly AI. OpenAI systems run on the fifth most powerful supercomputer in the world.[5][6][7] The organization was founded in San Francisco in 2015 by Sam Altman, Reid Hoffman, Jessica Livingston, Elon Musk, Ilya Sutskever, Peter Thiel and others,[8][1][9] who collectively pledged US$1 billion. Musk resigned from the board in 2018 but remained a donor. Microsoft provided OpenAI LP with a $1 billion investment in 2019 and a second multi-year investment in January 2023, reported to be $10 billion.[10]
  ```

- good:

  ```
  Please summarize the following sentences to make them easier to understand.

  Text: """
  OpenAI is an American artificial intelligence (AI) research laboratory consisting of the non-profit OpenAI Incorporated (OpenAI Inc.) and its for-profit subsidiary corporation OpenAI Limited Partnership (OpenAI LP). OpenAI conducts AI research with the declared intention of promoting and developing a friendly AI. OpenAI systems run on the fifth most powerful supercomputer in the world.[5][6][7] The organization was founded in San Francisco in 2015 by Sam Altman, Reid Hoffman, Jessica Livingston, Elon Musk, Ilya Sutskever, Peter Thiel and others,[8][1][9] who collectively pledged US$1 billion. Musk resigned from the board in 2018 but remained a donor. Microsoft provided OpenAI LP with a $1 billion investment in 2019 and a second multi-year investment in January 2023, reported to be $10 billion.[10]
  """
  ```

### 通过格式词阐述需要输出的格式

- bad:

  ```
  Summarize the main points of the following speech
  ```

- good:

  ```
  Summarize the main points of the following speech
  Use the following format:
  Topic 1: <topic_name_1>
  - <point_1>
  ..
  Topic 2: <topic_name_2>
  - <point_1>
  ..
  Topic 10: ..

  Text: """
  Thank you so much, Fred, for that lovely introduction. And thanks to the Atlantic Council for hosting me today.

  The course of the global economy over the past two years has been shaped by COVID-19 and our efforts to fight the pandemic. It’s now evident, though, that the war between Russia and Ukraine has redrawn the contours of the world economic outlook. Vladimir Putin’s unprovoked attack on Ukraine and its people is taking a devastating human toll, with lives tragically lost, families internally displaced or becoming refugees, and communities and cities destroyed.
  ...
  """
  ```

## 用法

### 创造

- 写文章
- 写故事
- 写代码
- 写...

### 改写

- 翻译
- 润色

### 缩写

- 提取：提取信息里的某一段内容，比如从一大段文字中，找到关键内容，并分类。
- 解释：这个跟改写内容有点像，但这个更偏向于解释与总结。
- 总结：对一堆信息进行总结。

### 扩写

## 词库

- https://snackprompt.com/
- https://github.com/f/awesome-chatgpt-prompts
- https://contentatscale.ai/ai-prompt-library/
- https://www.aishort.top/en/
- https://prompthero.com/chatgpt-prompts
- https://www-aiprm-com.webpkgcache.com/doc/-/s/www.aiprm.com/
- https://www.explainthis.io/zh-hans/chatgpt
- https://www.atlassian.com/software/confluence/templates
- https://promptport.ai/
- [Prompt Engineering Guide](https://www.promptingguide.ai/zh)
