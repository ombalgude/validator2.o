#!/bin/bash

# Authenticity Validator Deployment Script
# This script helps deploy the application using Docker Compose

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command_exists docker-compose; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "All prerequisites are met."
}

# Function to create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p nginx/ssl
    mkdir -p scripts
    mkdir -p logs
    
    print_success "Directories created."
}

# Function to create environment files
create_env_files() {
    print_status "Creating environment files..."
    
    # Backend .env
    if [ ! -f backend/.env ]; then
        cp backend/env.example backend/.env
        print_warning "Created backend/.env from template. Please update with your configuration."
    fi
    
    # Frontend .env.local
    if [ ! -f frontend/.env.local ]; then
        cp frontend/env.local.example frontend/.env.local
        print_warning "Created frontend/.env.local from template. Please update with your configuration."
    fi
    
    print_success "Environment files created."
}

# Function to create MongoDB initialization script
create_mongo_init() {
    print_status "Creating MongoDB initialization script..."
    
    cat > scripts/mongo-init.js << 'EOF'
// MongoDB initialization script
db = db.getSiblingDB('authenticity-validator');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'password', 'role'],
      properties: {
        email: { bsonType: 'string' },
        password: { bsonType: 'string' },
        role: { enum: ['admin', 'institution', 'verifier'] }
      }
    }
  }
});

db.createCollection('certificates');
db.createCollection('institutions');
db.createCollection('verification_logs');

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.certificates.createIndex({ certificateId: 1 }, { unique: true });
db.certificates.createIndex({ verificationStatus: 1 });
db.institutions.createIndex({ code: 1 }, { unique: true });
db.verification_logs.createIndex({ certificateId: 1 });
db.verification_logs.createIndex({ timestamp: -1 });

print('Database initialized successfully');
EOF

    print_success "MongoDB initialization script created."
}

# Function to create Nginx configuration
create_nginx_config() {
    print_status "Creating Nginx configuration..."
    
    cat > nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server frontend:3000;
    }
    
    upstream backend {
        server backend:5000;
    }
    
    upstream ai-services {
        server ai-services:8000;
    }
    
    server {
        listen 80;
        server_name localhost;
        
        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Backend API
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # AI Services
        location /ai/ {
            proxy_pass http://ai-services;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # WebSocket support
        location /socket.io/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF

    print_success "Nginx configuration created."
}

# Function to build and start services
deploy_services() {
    print_status "Building and starting services..."
    
    # Build images
    docker-compose build
    
    # Start services
    docker-compose up -d
    
    print_success "Services started successfully."
}

# Function to check service health
check_health() {
    print_status "Checking service health..."
    
    # Wait for services to start
    sleep 30
    
    # Check MongoDB
    if docker-compose exec -T mongodb mongosh --eval "db.runCommand('ping')" > /dev/null 2>&1; then
        print_success "MongoDB is healthy"
    else
        print_error "MongoDB is not responding"
    fi
    
    # Check Backend
    if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
        print_success "Backend API is healthy"
    else
        print_warning "Backend API is not responding (may still be starting)"
    fi
    
    # Check AI Services
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        print_success "AI Services are healthy"
    else
        print_warning "AI Services are not responding (may still be starting)"
    fi
    
    # Check Frontend
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        print_success "Frontend is healthy"
    else
        print_warning "Frontend is not responding (may still be starting)"
    fi
}

# Function to show service URLs
show_urls() {
    print_success "Deployment completed! Services are available at:"
    echo ""
    echo "🌐 Frontend: http://localhost:3000"
    echo "🔧 Backend API: http://localhost:5000"
    echo "🤖 AI Services: http://localhost:8000"
    echo "🗄️  MongoDB: localhost:27017"
    echo "📊 Redis: localhost:6379"
    echo ""
    echo "📋 Useful commands:"
    echo "  View logs: docker-compose logs -f"
    echo "  Stop services: docker-compose down"
    echo "  Restart services: docker-compose restart"
    echo "  View service status: docker-compose ps"
}

# Function to clean up
cleanup() {
    print_status "Cleaning up..."
    docker-compose down -v
    print_success "Cleanup completed."
}

# Main deployment function
main() {
    echo "🚀 Authenticity Validator Deployment Script"
    echo "=========================================="
    echo ""
    
    case "${1:-deploy}" in
        "deploy")
            check_prerequisites
            create_directories
            create_env_files
            create_mongo_init
            create_nginx_config
            deploy_services
            check_health
            show_urls
            ;;
        "cleanup")
            cleanup
            ;;
        "restart")
            print_status "Restarting services..."
            docker-compose restart
            check_health
            show_urls
            ;;
        "logs")
            docker-compose logs -f
            ;;
        "status")
            docker-compose ps
            ;;
        *)
            echo "Usage: $0 {deploy|cleanup|restart|logs|status}"
            echo ""
            echo "Commands:"
            echo "  deploy   - Deploy the application (default)"
            echo "  cleanup  - Stop and remove all containers and volumes"
            echo "  restart  - Restart all services"
            echo "  logs     - View logs from all services"
            echo "  status   - Show status of all services"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"