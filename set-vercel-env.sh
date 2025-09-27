#!/bin/bash

# Set the NEXT_PUBLIC_SERVER_URL environment variable in Vercel
echo "Setting NEXT_PUBLIC_SERVER_URL in Vercel..."

vercel env add NEXT_PUBLIC_SERVER_URL production <<< "https://cryptowallet-server-mbq8dslwx-phucs-projects-174186b3.vercel.app"

echo "Environment variable set! Triggering a new deployment..."
vercel --prod --yes

echo "Done! Your app should be working now."