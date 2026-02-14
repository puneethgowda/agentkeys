import time
import threading
from typing import Optional

import httpx

from .exceptions import (
    AgentKeysError,
    AgentKeysConnectionError,
    AgentKeysAuthError,
    AgentKeysScopeError,
    AgentKeysBudgetError,
)


class AgentKeys:
    def __init__(self, server: str, token: str, timeout: float = 30.0):
        self.server = server.rstrip("/")
        self.token = token
        self._cache: dict[str, dict] = {}
        self._timers: dict[str, threading.Timer] = {}
        self._client = httpx.Client(
            base_url=self.server,
            headers={"Authorization": f"Bearer {self.token}"},
            timeout=timeout,
        )

    def get(self, name: str, ttl: Optional[int] = None) -> str:
        # Check cache
        if name in self._cache:
            entry = self._cache[name]
            if entry["expires_at"] > time.time():
                return entry["value"]
            del self._cache[name]

        try:
            res = self._client.post(
                f"/api/v1/keys/{name}",
                json={"ttl": ttl} if ttl else {},
            )
        except httpx.ConnectError as e:
            raise AgentKeysConnectionError(
                f"Failed to connect to AgentKeys server at {self.server}: {e}"
            ) from e

        if not res.is_success:
            data = res.json() if res.headers.get("content-type", "").startswith("application/json") else {}
            message = data.get("error", f"HTTP {res.status_code}")
            error_map = {
                401: AgentKeysAuthError,
                403: AgentKeysScopeError,
                429: AgentKeysBudgetError,
            }
            cls = error_map.get(res.status_code, AgentKeysError)
            raise cls(message)

        data = res.json()

        # Cache with TTL
        if data.get("expires_in"):
            self._cache[name] = {
                "value": data["key"],
                "expires_at": time.time() + data["expires_in"],
            }
            # Auto-clear after TTL
            old_timer = self._timers.pop(name, None)
            if old_timer:
                old_timer.cancel()
            timer = threading.Timer(
                data["expires_in"], lambda n=name: self._cache.pop(n, None)
            )
            timer.daemon = True
            timer.start()
            self._timers[name] = timer

        return data["key"]

    def list_keys(self) -> list[str]:
        try:
            res = self._client.get("/api/v1/keys")
        except httpx.ConnectError as e:
            raise AgentKeysConnectionError(
                f"Failed to connect to AgentKeys server at {self.server}: {e}"
            ) from e
        res.raise_for_status()
        return res.json()["keys"]

    def release(self, name: str) -> None:
        self._cache.pop(name, None)
        timer = self._timers.pop(name, None)
        if timer:
            timer.cancel()
        try:
            self._client.post(f"/api/v1/keys/{name}/release")
        except Exception:
            pass  # Best-effort

    def key(self, name: str, ttl: Optional[int] = None) -> "_KeyContext":
        return _KeyContext(self, name, ttl)

    def close(self) -> None:
        for timer in self._timers.values():
            timer.cancel()
        self._timers.clear()
        self._cache.clear()
        self._client.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()


class _KeyContext:
    def __init__(self, client: AgentKeys, name: str, ttl: Optional[int]):
        self.client = client
        self.name = name
        self.ttl = ttl
        self._value: Optional[str] = None

    def __enter__(self) -> str:
        self._value = self.client.get(self.name, self.ttl)
        return self._value

    def __exit__(self, *args):
        self.client.release(self.name)
        self._value = None
