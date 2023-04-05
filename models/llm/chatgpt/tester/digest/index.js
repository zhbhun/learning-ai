require("dotenv").config();
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
(async () => {
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "ChatGPT" },
        {
          role: "user",
          content:
            "帮我给这个给一个 https://dev.to/charlot/what-is-iptv-how-does-it-work-44e0 生成中文摘要",
        },
      ],
    });
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log(error);
  }
})();
