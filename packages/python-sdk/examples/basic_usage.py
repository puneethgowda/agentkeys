from agentkeys import AgentKeys

agent = AgentKeys(
    server="http://localhost:8888",
    token="agt_your_token_here",
)

# Get a key
openai_key = agent.get("openai")
print(f"Got key: {openai_key[:8]}...")

# List available keys
available = agent.list_keys()
print(f"Available keys: {available}")

# Use with context manager for auto-release
with agent.key("openai", ttl=3600) as key:
    print(f"Using key: {key[:8]}...")
    # key is automatically released after this block

agent.close()
