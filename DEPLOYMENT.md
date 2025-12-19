# Ayonix Face Recognition System - AWS Deployment Guide

## Overview

This deployment package includes:
- **InsightFace** for face detection and analysis
- **ArcFace** for face recognition (512-dimensional embeddings)
- **YOLO v8** for people counting
- **Face Analytics**: Age, gender, expression, race estimation
- **Docker** containerization for easy deployment
- **AWS EC2** deployment scripts

---

## System Requirements

### AWS EC2 Instance
- **Instance Type**: t3.xlarge or larger (minimum 4 vCPU, 16GB RAM)
- **Storage**: 50GB EBS volume
- **OS**: Ubuntu 22.04 LTS
- **Region**: Any AWS region

### Local Machine (for deployment)
- AWS CLI configured with credentials
- SSH key pair for EC2 access
- Docker and Docker Compose (for local testing)

---

## Quick Start Deployment

### 1. Download the Checkpoint

Download the checkpoint from Manus and extract it to your local machine.

### 2. Configure AWS Credentials

```bash
# Install AWS CLI if not already installed
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure
# Enter your AWS Access Key ID, Secret Access Key, and default region
```

### 3. Create SSH Key Pair

```bash
# Create EC2 key pair
aws ec2 create-key-pair \
    --key-name ayonix-key \
    --query 'KeyMaterial' \
    --output text > ~/.ssh/ayonix-key.pem

# Set correct permissions
chmod 400 ~/.ssh/ayonix-key.pem
```

### 4. Deploy to AWS

```bash
# Navigate to project directory
cd ayonix_face_recognition

# Run deployment script
./deploy_aws.sh
```

The script will:
1. Create security group with required ports (22, 3000, 5001)
2. Launch EC2 instance (t3.xlarge)
3. Install Docker and Docker Compose
4. Copy application files to EC2
5. Build and start Docker containers

### 5. Access the Application

After deployment completes, you'll see:
```
Web Application: http://<EC2_PUBLIC_IP>:3000
Face Analytics API: http://<EC2_PUBLIC_IP>:5001
```

---

## Manual Deployment

If you prefer manual deployment:

### 1. Launch EC2 Instance

```bash
# Launch instance
aws ec2 run-instances \
    --image-id ami-0c55b159cbfafe1f0 \
    --instance-type t3.xlarge \
    --key-name ayonix-key \
    --security-groups ayonix-sg \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=Ayonix-Face-Recognition}]'
```

### 2. SSH into Instance

```bash
ssh -i ~/.ssh/ayonix-key.pem ubuntu@<EC2_PUBLIC_IP>
```

### 3. Install Docker

```bash
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
newgrp docker
```

### 4. Copy Application Files

```bash
# From your local machine
scp -i ~/.ssh/ayonix-key.pem -r ayonix_face_recognition ubuntu@<EC2_PUBLIC_IP>:/home/ubuntu/
```

### 5. Build and Start Containers

```bash
# On EC2 instance
cd /home/ubuntu/ayonix_face_recognition
docker-compose up -d --build
```

---

## Docker Configuration

### Services

1. **face_analytics** (Port 5001)
   - InsightFace face detection and analysis
   - ArcFace face recognition
   - YOLO people counting
   - Python Flask API

2. **web_app** (Port 3000)
   - React frontend
   - Node.js backend
   - tRPC API

### Environment Variables

Edit `docker-compose.yml` to configure:

```yaml
environment:
  - FACE_ANALYTICS_URL=http://face_analytics:5001
  - DATABASE_URL=<your_database_url>
  - JWT_SECRET=<your_jwt_secret>
```

---

## Face Analytics API

### Endpoints

#### 1. Health Check
```bash
GET http://<EC2_IP>:5001/health
```

#### 2. Analyze Face
```bash
POST http://<EC2_IP>:5001/analyze_face
Content-Type: application/json

{
  "image": "data:image/jpeg;base64,..."
}

Response:
{
  "success": true,
  "faces": [
    {
      "bbox": [x1, y1, x2, y2],
      "det_score": 0.99,
      "embedding": [512-dimensional array],
      "age": 25,
      "gender": "male",
      "expression": "happy",
      "race": "unknown"
    }
  ]
}
```

#### 3. Count People
```bash
POST http://<EC2_IP>:5001/count_people
Content-Type: application/json

{
  "image": "data:image/jpeg;base64,..."
}

Response:
{
  "success": true,
  "count": 5,
  "detections": [
    {"bbox": [x1, y1, x2, y2], "confidence": 0.95},
    ...
  ]
}
```

#### 4. Extract Embedding
```bash
POST http://<EC2_IP>:5001/extract_embedding
Content-Type: application/json

{
  "image": "data:image/jpeg;base64,..."
}

Response:
{
  "success": true,
  "embedding": [512-dimensional array]
}
```

---

## Monitoring and Logs

### View Container Logs

```bash
# All containers
docker-compose logs -f

# Specific service
docker-compose logs -f face_analytics
docker-compose logs -f web_app
```

### Container Status

```bash
docker-compose ps
```

### Resource Usage

```bash
docker stats
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs face_analytics

# Rebuild containers
docker-compose down
docker-compose up -d --build
```

### Out of Memory

Upgrade to larger instance type:
```bash
# Stop instance
aws ec2 stop-instances --instance-ids <INSTANCE_ID>

# Change instance type
aws ec2 modify-instance-attribute \
    --instance-id <INSTANCE_ID> \
    --instance-type t3.2xlarge

# Start instance
aws ec2 start-instances --instance-ids <INSTANCE_ID>
```

### Face Detection Slow

- Use GPU instance (p3.2xlarge) for faster inference
- Reduce image resolution before sending to API
- Adjust YOLO model size (yolov8n → yolov8s → yolov8m)

---

## Security Recommendations

1. **Restrict Security Group**
   ```bash
   # Allow only your IP for SSH
   aws ec2 authorize-security-group-ingress \
       --group-name ayonix-sg \
       --protocol tcp \
       --port 22 \
       --cidr <YOUR_IP>/32
   ```

2. **Use HTTPS**
   - Set up SSL certificate with Let's Encrypt
   - Configure nginx reverse proxy

3. **Environment Variables**
   - Store secrets in AWS Secrets Manager
   - Use IAM roles for EC2 instance

4. **Database**
   - Use AWS RDS for production database
   - Enable encryption at rest

---

## Cost Estimation

### AWS EC2 (t3.xlarge)
- Instance: ~$0.17/hour (~$122/month)
- Storage (50GB EBS): ~$5/month
- Data Transfer: Variable

### Total: ~$130-150/month

For production, consider:
- Reserved Instances (up to 72% savings)
- Spot Instances (up to 90% savings, with interruptions)

---

## Scaling

### Horizontal Scaling

Use AWS ECS or EKS for container orchestration:

```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name ayonix-cluster

# Deploy services with auto-scaling
```

### Load Balancing

```bash
# Create Application Load Balancer
aws elbv2 create-load-balancer \
    --name ayonix-alb \
    --subnets <subnet-ids> \
    --security-groups <sg-id>
```

---

## Support

For issues or questions:
1. Check container logs: `docker-compose logs -f`
2. Review AWS CloudWatch logs
3. Contact support at your organization

---

## License

Proprietary - Ayonix Face Recognition System
