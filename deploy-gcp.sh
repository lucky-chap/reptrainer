#!/bin/bash
# Reptrainer Full-Stack GCP Deployment Script
# This script deploys all three services (API, Live Agent, Web) to Cloud Run.

set -e

if ! command -v gcloud &> /dev/null; then
  echo "❌ Error: Google Cloud SDK (gcloud) is not installed."
  echo "Please install it from: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"

echo "🚀 Starting Full-Stack Deployment for project: $PROJECT_ID"

# 1. Deploy Live Agent (Python)
echo "📦 Building and Deploying Live Agent..."
gcloud builds submit --config=apps/live-agent/cloudbuild.yaml --substitutions=_REGION=$REGION . || \
gcloud run deploy reptrainer-live-agent --source apps/live-agent --region $REGION --allow-unauthenticated

LIVE_AGENT_URL=$(gcloud run services describe reptrainer-live-agent --region $REGION --format='value(status.url)' | sed 's/https/wss/')

# 2. Deploy API (Node)
echo "📦 Building and Deploying API Proxy..."
gcloud run deploy reptrainer-api --source apps/api --region $REGION --allow-unauthenticated \
  --set-env-vars="LIVE_AGENT_URL=$LIVE_AGENT_URL"

API_URL=$(gcloud run services describe reptrainer-api --region $REGION --format='value(status.url)')

# 3. Deploy Web (Next.js)
echo "📦 Building and Deploying Web Frontend..."
gcloud run deploy reptrainer-web --source apps/web --region $REGION --allow-unauthenticated \
  --set-env-vars="NEXT_PUBLIC_API_URL=$API_URL,NEXT_PUBLIC_LIVE_AGENT_URL=$LIVE_AGENT_URL"

WEB_URL=$(gcloud run services describe reptrainer-web --region $REGION --format='value(status.url)')

echo ""
echo "✨ Deployment Complete! ✨"
echo "--------------------------------------------------"
echo "🌍 Web Frontend: $WEB_URL"
echo "🔌 API Proxy:    $API_URL"
echo "🤖 Live Agent:   $LIVE_AGENT_URL"
echo "--------------------------------------------------"
