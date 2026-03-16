#!/bin/bash
# Reptrainer Web Frontend Deployment Script
set -e

if ! command -v gcloud &> /dev/null; then
  echo "❌ Error: Google Cloud SDK (gcloud) is not installed."
  echo "Please install it from: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

REGION="us-central1"
SERVICE_NAME="reptrainer-web"

# Try to get dependency URLs
API_URL=$(gcloud run services describe reptrainer-api --region $REGION --format='value(status.url)' 2>/dev/null || echo "")
LIVE_AGENT_URL=$(gcloud run services describe reptrainer-live-agent --region $REGION --format='value(status.url)' 2>/dev/null | sed 's/https/wss/' || echo "")

echo "🚀 Deploying Web Frontend (Next.js) to Cloud Run..."

gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars="NEXT_PUBLIC_API_URL=$API_URL,NEXT_PUBLIC_LIVE_AGENT_URL=$LIVE_AGENT_URL"

URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format='value(status.url)')

echo ""
echo "✨ Web Frontend Deployed! ✨"
echo "🔗 Application URL: $URL"
