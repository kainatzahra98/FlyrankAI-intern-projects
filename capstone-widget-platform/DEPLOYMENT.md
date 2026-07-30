# 🚀 Production Deployment Guide — Capstone Embeddable Widget Platform

This guide outlines step-by-step instructions to deploy the **Capstone Embeddable Widget Platform** into production across popular cloud hosting providers (Render, Railway, AWS, Docker, Google Cloud Run).

---

## 📋 Prerequisites & Environment Variables

Configure the following environment variables in your deployment dashboard or `.env` file:

| Variable | Recommended Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Enables production mode optimizations |
| `PORT` | `4000` (or dynamic host port) | Server binding port |
| `JWT_SECRET` | Strong random hash string | Secret key for signing admin authentication JWTs |
| `WEBHOOK_TEST_URL` | `https://your-webhook-endpoint.com` | External customer notification endpoint (isolated) |
| `ALLOWED_ORIGINS` | `*` or domain list | Allowed CORS origins for form submissions |

---

## ☁️ Option 1: One-Click Deployment to Render (Recommended)

1. Fork or push this repository to GitHub.
2. Log into [Render.com](https://render.com) and click **New +** ➔ **Web Service**.
3. Connect your GitHub repository: `FlyrankAI-intern-projects`.
4. Configure service settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`
   - **Port**: `4000`
5. Add Environment Variable:
   - `JWT_SECRET`: `prod_super_secret_key_99812`
   - `NODE_ENV`: `production`
6. Click **Deploy Web Service**.

---

## 🐳 Option 2: Docker Container Deployment (Cloud Run / AWS ECS / DigitalOcean)

### Build & Run Container Locally
```bash
# 1. Build Docker image
docker build -t capstone-widget-platform:latest .

# 2. Run Docker container
docker run -d -p 4000:4000 --name capstone-app capstone-widget-platform:latest

# 3. Test Healthcheck
curl http://localhost:4000/
```

### Deploy to Google Cloud Run
```bash
# 1. Authenticate with Google Cloud
gcloud auth configure-docker

# 2. Tag & Push Container Image
docker tag capstone-widget-platform gcr.io/YOUR_PROJECT_ID/capstone-widget-platform:v1
docker push gcr.io/YOUR_PROJECT_ID/capstone-widget-platform:v1

# 3. Deploy to Cloud Run
gcloud run deploy capstone-widget-platform \
  --image gcr.io/YOUR_PROJECT_ID/capstone-widget-platform:v1 \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## 🚆 Option 3: Deploy to Railway.app

1. Go to [Railway.app](https://railway.app) and create a new project.
2. Select **Deploy from GitHub repo** ➔ Select `capstone-widget-platform`.
3. Railway automatically detects Node.js and starts `node src/server.js`.
4. Add environment variables under **Variables** tab (`JWT_SECRET`, `NODE_ENV=production`).

---

## 🧪 Post-Deployment Health Check

Verify your production deployment using these endpoints:

1. **Root Platform Info**: `GET https://your-domain.com/`
2. **CDN Script Delivery**: `GET https://your-domain.com/cdn/widget.js`
3. **Widget Config**: `GET https://your-domain.com/api/widgets/wgt_demo_newsletter/config`
4. **Customer Site Demo**: `GET https://your-domain.com/demo/customer-site.html`
5. **No-Code Widget Builder**: `GET https://your-domain.com/demo/widget-builder.html`

---

## 🛡️ Production Security Checklist

- [x] CORS Preflight & Headers configured
- [x] Boundary input size limit (< 100KB body parser, < 50KB payload validation)
- [x] Rate Limiting (5 requests/min per IP/widget returning `429 Too Many Requests`)
- [x] Honeypot trap bot defense (`_hp_trap`)
- [x] Asynchronous safe side-effect isolation (`setImmediate`)
- [x] IP-Geo 3-provider fallback chain
