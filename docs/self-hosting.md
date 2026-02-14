# Self-Hosting Guide

## Docker (Recommended)

```bash
docker run -d \
  --name agentkeys \
  -p 8888:8888 \
  -v agentkeys-data:/data \
  -e AGENTKEYS_ADMIN_PASSWORD=your-secure-password \
  -e AGENTKEYS_MASTER_KEY=your-master-passphrase \
  --restart unless-stopped \
  agentkeys/server
```

## Docker Compose

```yaml
version: "3.8"
services:
  agentkeys:
    image: agentkeys/server
    ports:
      - "8888:8888"
    volumes:
      - agentkeys-data:/data
    environment:
      - AGENTKEYS_ADMIN_PASSWORD=your-secure-password
      - AGENTKEYS_MASTER_KEY=your-master-passphrase
    restart: unless-stopped

volumes:
  agentkeys-data:
```

```bash
docker compose up -d
```

## Bare Metal (npm)

```bash
# Install
npm install -g agentkeys

# Initialize
agentkeys init --data /opt/agentkeys/data

# Start
agentkeys serve --data /opt/agentkeys/data --port 8888
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `AGENTKEYS_ADMIN_PASSWORD` | Admin password (used during init) | — |
| `AGENTKEYS_MASTER_KEY` | Master encryption passphrase | Auto-generated |
| `AGENTKEYS_PORT` | Server port | `8888` |
| `AGENTKEYS_HOST` | Bind address | `127.0.0.1` |
| `AGENTKEYS_DATA_DIR` | Data directory | `./agentkeys-data` |

## Reverse Proxy (nginx)

```nginx
server {
    listen 443 ssl;
    server_name keys.yourdomain.com;

    ssl_certificate /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;

    location / {
        proxy_pass http://127.0.0.1:8888;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Backups

The entire state is in the data directory:
- `agentkeys.db` — SQLite database (keys, agents, audit log)
- `config.json` — Server configuration
- `master.salt` — Encryption salt

Back up the entire data directory regularly.
