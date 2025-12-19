#!/bin/bash

# AWS EC2 Deployment Script for Ayonix Face Recognition System
# This script deploys the application with InsightFace, ArcFace, and YOLO to AWS EC2

set -e

echo "========================================="
echo "Ayonix Face Recognition AWS Deployment"
echo "========================================="

# Configuration
EC2_INSTANCE_TYPE="${EC2_INSTANCE_TYPE:-t3.xlarge}"  # Minimum recommended for ML workloads
EC2_AMI="${EC2_AMI:-ami-0c55b159cbfafe1f0}"  # Ubuntu 22.04 LTS (update for your region)
EC2_KEY_NAME="${EC2_KEY_NAME:-ayonix-key}"
EC2_SECURITY_GROUP="${EC2_SECURITY_GROUP:-ayonix-sg}"
EC2_REGION="${EC2_REGION:-us-east-1}"

# Step 1: Create Security Group (if not exists)
echo "Creating security group..."
aws ec2 create-security-group \
    --group-name $EC2_SECURITY_GROUP \
    --description "Security group for Ayonix Face Recognition" \
    --region $EC2_REGION \
    2>/dev/null || echo "Security group already exists"

# Allow SSH (port 22)
aws ec2 authorize-security-group-ingress \
    --group-name $EC2_SECURITY_GROUP \
    --protocol tcp \
    --port 22 \
    --cidr 0.0.0.0/0 \
    --region $EC2_REGION \
    2>/dev/null || echo "SSH rule already exists"

# Allow HTTP (port 3000 for web app)
aws ec2 authorize-security-group-ingress \
    --group-name $EC2_SECURITY_GROUP \
    --protocol tcp \
    --port 3000 \
    --cidr 0.0.0.0/0 \
    --region $EC2_REGION \
    2>/dev/null || echo "HTTP rule already exists"

# Allow Face Analytics Service (port 5001)
aws ec2 authorize-security-group-ingress \
    --group-name $EC2_SECURITY_GROUP \
    --protocol tcp \
    --port 5001 \
    --cidr 0.0.0.0/0 \
    --region $EC2_REGION \
    2>/dev/null || echo "Face Analytics rule already exists"

# Step 2: Launch EC2 Instance
echo "Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $EC2_AMI \
    --instance-type $EC2_INSTANCE_TYPE \
    --key-name $EC2_KEY_NAME \
    --security-groups $EC2_SECURITY_GROUP \
    --region $EC2_REGION \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=Ayonix-Face-Recognition}]' \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "Instance ID: $INSTANCE_ID"

# Wait for instance to be running
echo "Waiting for instance to be running..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $EC2_REGION

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --region $EC2_REGION \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo "Instance is running at: $PUBLIC_IP"

# Step 3: Wait for SSH to be available
echo "Waiting for SSH to be available..."
sleep 30

# Step 4: Copy deployment files to EC2
echo "Copying files to EC2..."
scp -i ~/.ssh/$EC2_KEY_NAME.pem -r \
    -o StrictHostKeyChecking=no \
    ./* ubuntu@$PUBLIC_IP:/home/ubuntu/ayonix_face_recognition/

# Step 5: Install Docker and Docker Compose on EC2
echo "Installing Docker on EC2..."
ssh -i ~/.ssh/$EC2_KEY_NAME.pem -o StrictHostKeyChecking=no ubuntu@$PUBLIC_IP << 'EOF'
    # Update system
    sudo apt-get update
    sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
    
    # Install Docker
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
    sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io
    
    # Install Docker Compose
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    # Add user to docker group
    sudo usermod -aG docker ubuntu
EOF

# Step 6: Build and start Docker containers
echo "Building and starting Docker containers..."
ssh -i ~/.ssh/$EC2_KEY_NAME.pem -o StrictHostKeyChecking=no ubuntu@$PUBLIC_IP << 'EOF'
    cd /home/ubuntu/ayonix_face_recognition
    
    # Build and start containers
    docker-compose up -d --build
    
    # Show container status
    docker-compose ps
EOF

echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo "Web Application: http://$PUBLIC_IP:3000"
echo "Face Analytics API: http://$PUBLIC_IP:5001"
echo ""
echo "To SSH into the instance:"
echo "ssh -i ~/.ssh/$EC2_KEY_NAME.pem ubuntu@$PUBLIC_IP"
echo ""
echo "To view logs:"
echo "ssh -i ~/.ssh/$EC2_KEY_NAME.pem ubuntu@$PUBLIC_IP 'cd /home/ubuntu/ayonix_face_recognition && docker-compose logs -f'"
