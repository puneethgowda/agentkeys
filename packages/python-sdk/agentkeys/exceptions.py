class AgentKeysError(Exception):
    def __init__(self, message: str, status: int = 0):
        super().__init__(message)
        self.status = status


class AgentKeysConnectionError(AgentKeysError):
    def __init__(self, message: str):
        super().__init__(message, status=0)


class AgentKeysAuthError(AgentKeysError):
    def __init__(self, message: str):
        super().__init__(message, status=401)


class AgentKeysScopeError(AgentKeysError):
    def __init__(self, message: str):
        super().__init__(message, status=403)


class AgentKeysBudgetError(AgentKeysError):
    def __init__(self, message: str):
        super().__init__(message, status=429)
