.PHONY: help install dev-install compile-protos init-db migrate services frontend test clean

help:
	@echo "Argos Platform - Make Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make install          - Install Python dependencies"
	@echo "  make dev-install      - Install with development dependencies"
	@echo "  make compile-protos   - Compile gRPC protobuf files"
	@echo ""
	@echo "Database:"
	@echo "  make init-db          - Initialize databases"
	@echo "  make migrate          - Run database migrations"
	@echo ""
	@echo "Run:"
	@echo "  make infra            - Start infrastructure (Docker Compose)"
	@echo "  make services         - Start all microservices"
	@echo "  make frontend         - Start frontend dev server"
	@echo "  make dev              - Start everything (infra + services + frontend)"
	@echo ""
	@echo "Testing:"
	@echo "  make test             - Run all tests"
	@echo "  make test-unit        - Run unit tests only"
	@echo "  make test-integration - Run integration tests"
	@echo "  make lint             - Run linters"
	@echo "  make format           - Format code"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean            - Clean temporary files"
	@echo "  make clean-all        - Clean everything including Docker volumes"

install:
	pip install -e .

dev-install:
	pip install -e ".[dev,docs]"

compile-protos:
	chmod +x scripts/compile-protos.sh
	./scripts/compile-protos.sh

init-db:
	python scripts/init-db.py

migrate:
	alembic upgrade head

infra:
	docker-compose up -d
	@echo "Waiting for services to be ready..."
	@sleep 10

services:
	@echo "Starting microservices..."
	@echo "This will be implemented with a process manager"

frontend:
	cd frontend && npm install && npm run dev

dev: infra
	@echo "Development environment ready!"
	@echo "- Infrastructure: http://localhost (various ports)"
	@echo "- API Gateway will start on :8000"
	@echo "- Frontend will start on :5173"

test:
	pytest

test-unit:
	pytest tests/unit

test-integration:
	pytest tests/integration

lint:
	ruff check .
	mypy argos/

format:
	black .
	ruff check --fix .

clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	rm -rf .pytest_cache .coverage htmlcov

clean-all: clean
	docker-compose down -v
	rm -rf frontend/node_modules frontend/dist

