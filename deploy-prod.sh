#!/bin/bash
set -e

# --- Variables ---
PROJECT_ID="staffwatch"
REGION="us-central1"
# Prod specific variables
REPO_NAME="trackup-prod"
IMAGE_NAME="trackup-api-prod" 
TAG="latest"
IMAGE_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:${TAG}"
# Use .env.prod if it exists, otherwise assume .env contains prod values or handle secrets differently
ENV_FILE=".env.prod"

if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️  $ENV_FILE not found! Falling back to .env (ensure this contains PROD values!)"
    ENV_FILE=".env"
fi

echo "🚀 Starting PROD deployment flow..."

# 1. Build & Push
echo "📦 Building and Pushing Image to $REPO_NAME..."
docker build --platform linux/amd64 -t $IMAGE_URL .
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet
docker push $IMAGE_URL

# 2. Extract Env Vars
# Extract variables but exclude 'PORT'
ENV_VARS=$(grep -v '^#' $ENV_FILE | grep -v '^PORT=' | xargs | sed 's/ /,/g')

echo "🌐 Deploying to Cloud Run (PROD)..."

# 3. Deploy
gcloud run deploy $IMAGE_NAME \
  --image $IMAGE_URL \
  --platform managed \
  --region $REGION \
  --no-invoker-iam-check \
  --set-env-vars="$ENV_VARS"

echo "✅ Success! Your PROD service is live."
