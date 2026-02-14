import os
from agentkeys import AgentKeys

agent = AgentKeys(
    server="http://localhost:8888",
    token=os.environ["AGENTKEYS_TOKEN"],
)

with agent.key("openai") as key:
    # Set the key for CrewAI to use
    os.environ["OPENAI_API_KEY"] = key

    from crewai import Agent, Task, Crew

    researcher = Agent(
        role="Researcher",
        goal="Research the latest AI developments",
        backstory="You are an AI research assistant.",
    )

    task = Task(
        description="Summarize what AgentKeys does for AI agents.",
        agent=researcher,
        expected_output="A brief summary of AgentKeys.",
    )

    crew = Crew(agents=[researcher], tasks=[task])
    result = crew.kickoff()
    print(result)

agent.close()
