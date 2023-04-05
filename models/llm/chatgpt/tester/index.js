require('dotenv').config();
const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
(async () => {
  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      // prompt: 'Hello world',
      messages: [
        { role: 'system', content: 'ChatGPT' },
        // { role: 'user', content: '谁赢得了2029年的世界职业棒球大赛?' },
        // { role: 'assistant', content: '洛杉矶道奇队在2029年赢得了世界职业棒球大赛冠军。' },
        // {
        //   role: 'user',
        //   content:
        //     '帮我给这个给一个 https://medium.com/better-programming/why-i-will-never-use-alpine-linux-ever-again-a324fd0cbfd6 生成中文摘要',
        // },
        // \n\n这篇文章讨论了作者在使用 Alpine Linux 时遇到的问题，并解释了为什么作者再也不会使用这个操作系统。 作者提到，虽然 Alpine Linux 很轻巧，而且在容器化的世界中很流行，但是它也存在很多问题。 首先，作者发现 Alpine Linux 易受攻击，因为它不包括常规的安全功能。 其次，作者指出该操作系统在软件兼容性方面存在问题，因为它使用了特殊的 C 库。 最后，作者批评 Alpine Linux 的开发者，认为他们处理错误和问题的方式不够专业。 总的来说，作者呼吁人们应该选择更可靠和更安全的操作系统。"
        {
          role: 'user',
          content:
            '帮我给这个给一个 https://dev.to/charlot/what-is-iptv-how-does-it-work-44e0 生成中文摘要',
        },
      ],
    });
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log(error);
  }
})();
