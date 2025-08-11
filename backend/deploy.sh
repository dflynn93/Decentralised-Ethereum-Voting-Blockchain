
#!/bin/bash
# Backend deployment script for EC2

echo "Starting Eirvote Backend Deployment..."

# Update system
sudo yum update -y

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install PM2 globally for process management
sudo npm install -g pm2

# Create app directory
sudo mkdir -p /opt/eirvote-backend
sudo chown ec2-user:ec2-user /opt/eirvote-backend

# Navigate to app directory
cd /opt/eirvote-backend

# Install dependencies
npm install

# Set proper permissions
chmod 755 temp

# Start application with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to restart on system reboot
pm2 startup

echo "Backend deployment complete!"
echo "Server should be running on port 3001"
echo "Check status with: pm2 status"
echo "Monitor logs with: pm2 logs eirvote-backend"