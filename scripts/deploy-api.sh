#!/bin/bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Deploy Kinotabel API to Google Cloud Functions
#
# Prerequisites:
#   - gcloud CLI installed and authenticated (gcloud auth login)
#   - Google Cloud project configured (gcloud config set project PROJECT_ID)
#   - Cloud Functions API enabled
#   - credentials.json in project root (Google Sheets service account)
#
# Usage:
#   ./scripts/deploy-api.sh
#   ./scripts/deploy-api.sh --project my-gcp-project --region europe-west1
# ─────────────────────────────────────────────────────────────────────────────

# Defaults
REGION="${REGION:-europe-west1}"
FUNCTION_NAME="${FUNCTION_NAME:-kinotabel-api}"
MEMORY="${MEMORY:-256MB}"
SPREADSHEET_ID="${SPREADSHEET_ID:-1hMYxHm4voBIulIeU0JicB0Co4FhvvxLR42PrRVHlZWA}"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --project)  GCP_PROJECT="$2"; shift 2 ;;
    --region)   REGION="$2"; shift 2 ;;
    --name)     FUNCTION_NAME="$2"; shift 2 ;;
    --memory)   MEMORY="$2"; shift 2 ;;
    *)          echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Find project root (directory containing package.json with "kinotabel" name)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== Kinotabel API Deployment ==="
echo "Project root: $PROJECT_ROOT"
echo "Region:       $REGION"
echo "Function:     $FUNCTION_NAME"
echo "Memory:       $MEMORY"
echo ""

# Check prerequisites
if ! command -v gcloud &> /dev/null; then
  echo "ERROR: gcloud CLI not found. Install it from https://cloud.google.com/sdk/docs/install"
  exit 1
fi

if [[ -n "${GCP_PROJECT:-}" ]]; then
  gcloud config set project "$GCP_PROJECT"
fi

ACTIVE_PROJECT=$(gcloud config get-value project 2>/dev/null)
echo "GCP Project:  $ACTIVE_PROJECT"

# Check credentials file
CREDENTIALS_FILE="$PROJECT_ROOT/credentials.json"
if [[ ! -f "$CREDENTIALS_FILE" ]]; then
  echo "ERROR: credentials.json not found at $CREDENTIALS_FILE"
  echo "This file contains Google Sheets service account credentials."
  exit 1
fi

echo ""
echo "--- Step 1: Build shared package ---"
cd "$PROJECT_ROOT"
npm run build:shared

echo ""
echo "--- Step 2: Build server (TypeScript → JavaScript) ---"
cd "$PROJECT_ROOT/server"
npm run build

echo ""
echo "--- Step 3: Prepare deployment package ---"
# Copy the cloud-functions-specific package.json into dist/
cp "$PROJECT_ROOT/server/cloud-functions-package.json" "$PROJECT_ROOT/server/dist/package.json"

# Copy shared package into dist so the dependency resolves
mkdir -p "$PROJECT_ROOT/server/dist/node_modules/@kinotabel/shared"
cp -r "$PROJECT_ROOT/packages/shared/src/"* "$PROJECT_ROOT/server/dist/node_modules/@kinotabel/shared/"
# If shared has been built, also copy dist
if [[ -d "$PROJECT_ROOT/packages/shared/dist" ]]; then
  cp -r "$PROJECT_ROOT/packages/shared/dist/"* "$PROJECT_ROOT/server/dist/node_modules/@kinotabel/shared/"
fi
# Create a minimal package.json for the shared package
cat > "$PROJECT_ROOT/server/dist/node_modules/@kinotabel/shared/package.json" <<'SHARED_PKG'
{
  "name": "@kinotabel/shared",
  "version": "1.0.0",
  "main": "index.js",
  "types": "index.d.ts"
}
SHARED_PKG

echo ""
echo "--- Step 4: Deploy to Google Cloud Functions ---"
cd "$PROJECT_ROOT/server/dist"

# Read credentials JSON and escape for env var
CREDS_JSON=$(cat "$CREDENTIALS_FILE")

gcloud functions deploy "$FUNCTION_NAME" \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point api \
  --region "$REGION" \
  --set-env-vars "GOOGLE_CREDENTIALS_JSON=$(echo "$CREDS_JSON" | tr -d '\n')","DB_SPREADSHEET_ID=$SPREADSHEET_ID" \
  --memory "$MEMORY" \
  --timeout 60s \
  --gen2

echo ""
echo "=== Deployment complete ==="
FUNCTION_URL="https://${REGION}-${ACTIVE_PROJECT}.cloudfunctions.net/${FUNCTION_NAME}"
echo "API URL: $FUNCTION_URL"
echo ""
echo "Test it:"
echo "  curl ${FUNCTION_URL}/api/auth"
echo ""
echo "Set this as VITE_API_URL in your GitHub repository variables:"
echo "  $FUNCTION_URL"
