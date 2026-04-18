#!/bin/bash
set -e

# --- Variables ---
PROJECT_ID="staffwatch"
REGION="us-central1"
REPO_NAME="my-repo"
IMAGE_NAME="staffwatch-api"
TAG="latest"
IMAGE_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:${TAG}"

echo "🚀 Starting deployment flow..."

# 1. Build & Push
echo "📦 Building and Pushing Image..."
docker build --platform linux/amd64 -t $IMAGE_URL .
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet
docker push $IMAGE_URL

# 2. Extract Env Vars
# This command: 
# - Ignores comments (#)
# - Removes empty lines
# - Joins lines with commas
# Extract variables but exclude 'PORT'
ENV_VARS=$(grep -v '^#' .env | grep -v '^PORT=' | xargs | sed 's/ /,/g')

echo "🌐 Deploying to Cloud Run..."

# 3. Deploy
gcloud run deploy $IMAGE_NAME \
  --image $IMAGE_URL \
  --platform managed \
  --region $REGION \
  --no-invoker-iam-check \
  --set-env-vars="$ENV_VARS"

echo "✅ Success! Your service is live."