# Cue Proxy Deployment Guide

## On VPS (31.97.137.195)

### Step 1: Clone repository
```bash
cd /opt
git clone https://github.com/sfdxb7/cue-proxy.git
cd cue-proxy
```

### Step 2: Create .env file
```bash
cat > .env << 'EOF'
PORT=3456
GROQ_API_KEY=<your-groq-api-key>
DATA_DIR=/app/data
EOF
```

### Step 3: Build and run Docker container
```bash
docker build -t cue-proxy .
docker run -d --name cue-proxy --restart always \
  --network dokploy-network \
  --env-file .env \
  -v /opt/cue-proxy/data:/app/data \
  cue-proxy
```

### Step 4: Copy Traefik config
```bash
cp deploy/traefik-cue-proxy.yml /etc/dokploy/traefik/dynamic/cue-proxy.yml
```
Traefik auto-reloads dynamic config files.

### Step 5: Verify
```bash
# Health check
curl https://proxy.alfalasi.io/health

# Register a test token
curl -X POST https://proxy.alfalasi.io/v1/register \
  -H "Content-Type: application/json" \
  -d '{"version":"test"}'
```

## Alternative: systemd (without Docker)
```bash
cd /opt/cue-proxy
npm ci
npx tsc

cat > /etc/systemd/system/cue-proxy.service << 'EOF'
[Unit]
Description=Cue STT Proxy
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/cue-proxy
ExecStart=/usr/bin/node dist/index.js
Restart=always
EnvironmentFile=/opt/cue-proxy/.env

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable cue-proxy
systemctl start cue-proxy
```
