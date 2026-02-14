import os
from agentkeys import AgentKeys
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

agent = AgentKeys(
    server="http://localhost:8888",
    token=os.environ["AGENTKEYS_TOKEN"],
)

with agent.key("openai") as key:
    llm = ChatOpenAI(model="gpt-4", api_key=key)
    response = llm.invoke([HumanMessage(content="What is AgentKeys?")])
    print(response.content)

agent.close()
