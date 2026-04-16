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

COMPOSE_CMD=()

setup_compose_command() {
    if docker compose version >/dev/null 2>&1; then
        COMPOSE_CMD=(docker compose)
        return
    fi

    if command_exists docker-compose; then
        COMPOSE_CMD=(docker-compose)
        return
    fi

    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    setup_compose_command
    
    print_success "All prerequisites are met."
}

# Function to create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p scripts
    mkdir -p logs
    
    print_success "Directories created."
}

verify_required_files() {
    print_status "Checking deployment files..."

    required_files=(
        "docker-compose.yml"
        "frontend/Dockerfile"
        "frontend/env.local.example"
        "scripts/mongo-init.js"
        "nginx/nginx.conf"
    )

    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            print_error "Missing required deployment file: $file"
            exit 1
        fi
    done

    print_success "Deployment files are present."
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

# Function to build and start services
deploy_services() {
    print_status "Building and starting services..."
    
    # Build images
    "${COMPOSE_CMD[@]}" build
    
    # Start services
    "${COMPOSE_CMD[@]}" up -d
    
    print_success "Services started successfully."
}

# Function to check service health
check_health() {
    print_status "Checking service health..."
    
    # Wait for services to start
    sleep 30
    
    # Check MongoDB
    if "${COMPOSE_CMD[@]}" exec -T mongodb mongosh --eval "db.runCommand('ping')" > /dev/null 2>&1; then
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
    if curl -f http://localhost:8001/health > /dev/null 2>&1; then
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
    echo "🌐 Reverse Proxy: http://localhost"
    echo "🔧 Backend API: http://localhost:5000"
    echo "🤖 AI Services: http://localhost:8001"
    echo "🗄️  MongoDB: localhost:27017"
    echo "📊 Redis: localhost:6379"
    echo ""
    echo "📋 Useful commands:"
    echo "  View logs: ${COMPOSE_CMD[*]} logs -f"
    echo "  Stop services: ${COMPOSE_CMD[*]} down"
    echo "  Restart services: ${COMPOSE_CMD[*]} restart"
    echo "  View service status: ${COMPOSE_CMD[*]} ps"
}

# Function to clean up
cleanup() {
    print_status "Cleaning up..."
    "${COMPOSE_CMD[@]}" down -v
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
            verify_required_files
            create_env_files
            deploy_services
            check_health
            show_urls
            ;;
        "cleanup")
            check_prerequisites
            cleanup
            ;;
        "restart")
            check_prerequisites
            print_status "Restarting services..."
            "${COMPOSE_CMD[@]}" restart
            check_health
            show_urls
            ;;
        "logs")
            check_prerequisites
            "${COMPOSE_CMD[@]}" logs -f
            ;;
        "status")
            check_prerequisites
            "${COMPOSE_CMD[@]}" ps
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
