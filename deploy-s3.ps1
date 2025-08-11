
# Simple deployment script for Eirvote frontend

param(
    [string]$BucketName = ""
)

Write-Host "Eirvote Frontend Deployment Script" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Cyan

# Check if build folder exists
if (-not (Test-Path "./dist")) {
    Write-Host "No build folder found. Building project..." -ForegroundColor Red
    
    Write-Host "Installing dependencies..." -ForegroundColor Blue
    npm install
    
    Write-Host "Building React app..." -ForegroundColor Blue
    npm run build
    
    if (-not (Test-Path "./dist")) {
        Write-Host "Build failed! Check for errors above." -ForegroundColor Red
        exit 1
    }
}

# If no bucket name provided, ask user
if ($BucketName -eq "") {
    Write-Host "`nYou can either:"
    Write-Host "1. Create a new bucket (enter 'new')"
    Write-Host "2. Use existing bucket (enter bucket name)"
    
    $BucketName = Read-Host "Enter your choice"
    
    if ($BucketName -eq "new") {
        $BucketName = "eirvote-frontend-$(Get-Random -Minimum 1000 -Maximum 9999)"
        Write-Host "Creating new bucket: $BucketName" -ForegroundColor Yellow
    }
}

Write-Host "`nDeploying to bucket: $BucketName" -ForegroundColor Blue

# Configure bucket for static website hosting first
Write-Host "Configuring bucket for static website hosting..." -ForegroundColor Blue
aws s3 mb s3://$BucketName --region eu-west-1 2>$null
aws s3 website s3://$BucketName --index-document index.html --error-document index.html

# Set public read policy
$policy = @"
{
    \"Version\": \"2012-10-17\",
    \"Statement\": [
        {
            \"Sid\": \"PublicReadGetObject\",
            \"Effect\": \"Allow\",
            \"Principal\": \"*\",
            \"Action\": \"s3:GetObject\",
            \"Resource\": \"arn:aws:s3:::$BucketName/*\"
        }
    ]
}
"@

$policy | Out-File -FilePath "bucket-policy.json" -Encoding UTF8
aws s3api put-bucket-policy --bucket $BucketName --policy file://bucket-policy.json
Remove-Item "bucket-policy.json" -ErrorAction SilentlyContinue

# Deploy to S3
aws s3 sync ./dist s3://$BucketName --delete

if ($LASTEXITCODE -eq 0) {
    $websiteUrl = "http://$BucketName.s3-website-eu-west-1.amazonaws.com"
    
    Write-Host "`nDEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
    Write-Host "======================" -ForegroundColor Cyan
    Write-Host "Frontend: $websiteUrl" -ForegroundColor Green
    Write-Host "Backend:  http://54.246.158.129:3001" -ForegroundColor Green
    Write-Host "`nYour voting system is live!" -ForegroundColor Magenta
    
    # Test backend connection
    Write-Host "`nTesting backend connection..." -ForegroundColor Blue
    try {
        $response = Invoke-RestMethod -Uri "http://54.246.158.129:3001/api/health" -TimeoutSec 10
        Write-Host "Backend is responding: $($response.status)" -ForegroundColor Green
    } catch {
        Write-Host "Backend test failed - check your EC2 instance" -ForegroundColor Yellow
    }
    
} else {
    Write-Host "`nDeployment failed!" -ForegroundColor Red
    Write-Host "Make sure AWS CLI is configured and you have the right permissions." -ForegroundColor Yellow
}