import { AgentKeys } from "agentkeys";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const agent = new AgentKeys({
  server: "http://localhost:8888",
  token: process.env.AGENTKEYS_TOKEN!,
});

await agent.withKey("openai", async (key) => {
  const openai = createOpenAI({ apiKey: key });

  const { text } = await generateText({
    model: openai("gpt-4"),
    prompt: "Explain what AgentKeys does in one sentence.",
  });

  console.log(text);
});
