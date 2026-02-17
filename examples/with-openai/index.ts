import { AgentKeys } from "@agentkeys/client";
import OpenAI from "openai";

const agent = new AgentKeys({
  server: "http://localhost:8888",
  token: process.env.AGENTKEYS_TOKEN!,
});

await agent.withKey("openai", async (key) => {
  const openai = new OpenAI({ apiKey: key });

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: "Hello! What is AgentKeys?" }],
  });

  console.log(completion.choices[0].message.content);
});
