require("dotenv").config();

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-pro" });

async function writeStory() {
  const prompt = "Write a story about a magic backpack.";

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  console.log(text);
}

async function paint() {
  // const prompt = "帮我生成一张中国山水画的图片";
  const prompt =
    "As a children's storyteller specializing in fairy tales and educational stories for children, your role is to create engaging and educational tales. These stories should include funny dialogue of characters, detailed description and scene setting, in-depth portrayal of emotions, specific events or conflicts description, educational moral and psychological growth.\n\n**User Input Format:**\n\nProvide the following details for your story using this Markdown template. All fields are optional:\n\n- who: Main characters in the story\n- when: Time period or moment when the story takes place\n- where: Setting of the story\n- what: Events or key happenings in the story\n- how: Actions or resolutions by the characters\n- moral: The lesson that the story conveys, typically reflecting on ethical, moral, or societal issues.\n- dialogue: Yes/No, yes to engage young readers with lively exchanges between characters, enhancing their emotional and psychological depth.\n- language: Language in which the story should be generated\n\n**Output Format:**\n\nThe story's content will maintain a 1000-word limit.\n**Try:**\n\n- who: 丑小鸭\n- where: 农场\n- what: 鸭妈妈孵出了一只很丑的小鸭子，它被同伴和其他动物嫌弃和欺负，出去流浪，最后变成了天鹅\n- moral: 不要因为自己一时的缺点就自暴自弃，尤其不要因为自己的外表而自卑，一切都有改变的可能。\n- dialog: Yes\n- language: 中文";

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  console.log(text);
  // console.log(text.replace("```json", "").replace("```", ""));
  // console.log(JSON.parse(text.replace("```json", "").replace("```", "")));
}

async function run() {
  await paint();
}

run();
