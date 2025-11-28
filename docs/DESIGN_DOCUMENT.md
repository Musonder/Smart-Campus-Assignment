# Smart Campus System - Design Document

**Version:** 1.0  
**Date:** 2024  
**Authors:** Smart Campus Development Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Design Patterns](#design-patterns)
4. [Data Model](#data-model)
5. [Trade-offs and Decisions](#trade-offs-and-decisions)
6. [Deployment Architecture](#deployment-architecture)
7. [Security Architecture](#security-architecture)
8. [Scalability and Performance](#scalability-and-performance)
9. [Future Enhancements](#future-enhancements)

---

## 1. Executive Summary

### 1.1 Purpose
The Smart Campus System is a comprehensive microservices-based platform for managing academic operations, facility management, and student services in a university environment. The system supports enrollment, grading, scheduling, analytics, and IoT device integration.

### 1.2 Scope
- **Academic Management**: Course enrollment, grade assignment, assessment management
- **Scheduling**: Automated timetable generation with constraint optimization
- **Analytics**: ML-powered enrollment prediction and room optimization
- **Security**: RBAC/ABAC, encryption, GDPR compliance, audit logging
- **IoT Integration**: Sensor and actuator management for smart facilities
- **Event Sourcing**: Immutable event log for audit and state reconstruction

### 1.3 Key Requirements
- **Scalability**: Handle 10,000+ concurrent users
- **Availability**: 99.9% uptime
- **Security**: End-to-end encryption, RBAC/ABAC, GDPR compliance
- **Performance**: <200ms API response time (p95)
- **Reliability**: Event sourcing, circuit breakers, graceful degradation

---

## 2. System Architecture

### 2.1 Microservices Architecture

The system follows a microservices architecture with the following services:

#### 2.1.1 API Gateway
- **Technology**: FastAPI
- **Responsibilities**:
  - Request routing and load balancing
  - Authentication and authorization (JWT)
  - API versioning
  - Rate limiting
  - Request/response transformation

#### 2.1.2 User Service
- **Technology**: FastAPI, PostgreSQL
- **Responsibilities**:
  - User management (CRUD)
  - Authentication (password, OAuth, certificate)
  - Role management
  - Profile management

#### 2.1.3 Academic Service
- **Technology**: FastAPI, PostgreSQL, MongoDB (Event Store)
- **Responsibilities**:
  - Course and section management
  - Student enrollment (event-sourced)
  - Grade assignment (encrypted)
  - Assessment management

#### 2.1.4 Scheduler Service
- **Technology**: FastAPI
- **Responsibilities**:
  - Timetable generation
  - Constraint evaluation (hard/soft)
  - Room allocation optimization
  - Schedule conflict resolution

#### 2.1.5 Analytics Service
- **Technology**: FastAPI, PyTorch, scikit-learn
- **Responsibilities**:
  - Enrollment dropout prediction (LSTM)
  - Room usage optimization (RL/PPO)
  - Model versioning and explainability
  - Rule-based fallback

#### 2.1.6 Security Service
- **Technology**: FastAPI
- **Responsibilities**:
  - GDPR data erasure
  - Audit log management
  - Penetration testing
  - Security policy enforcement

### 2.2 Communication Patterns

#### 2.2.1 Synchronous Communication
- **REST APIs**: Primary communication between services
- **gRPC**: High-performance inter-service communication
- **Protocol**: HTTP/2 for gRPC, HTTP/1.1 for REST

#### 2.2.2 Asynchronous Communication
- **Event Sourcing**: Event store (MongoDB) for state reconstruction
- **Event Streams**: Pub/sub for real-time notifications
- **Message Queue**: RabbitMQ for reliable message delivery

### 2.3 Data Storage

#### 2.3.1 Relational Database (PostgreSQL)
- **Purpose**: Primary data storage for entities
- **Services**: User Service, Academic Service
- **Features**: ACID transactions, foreign keys, indexes

#### 2.3.2 Document Store (MongoDB)
- **Purpose**: Event store for event sourcing
- **Services**: All services (event publishing)
- **Features**: Append-only, versioned, queryable

#### 2.3.3 Cache (Redis)
- **Purpose**: Session storage, rate limiting, caching
- **Services**: API Gateway, all services
- **Features**: In-memory, TTL support, pub/sub

---

## 3. Design Patterns

### 3.1 Domain-Driven Design (DDD)

#### 3.1.1 Aggregates
- **EnrollmentAggregate**: Manages enrollment lifecycle
- **GradeAggregate**: Immutable grade records
- **TimetableAggregate**: Schedule state management

#### 3.1.2 Domain Events
- **StudentEnrolledEvent**: Published on enrollment
- **GradeAssignedEvent**: Published on grade assignment
- **EmergencyLockdownEvent**: Published on lockdown

### 3.2 Event Sourcing

#### 3.2.1 Event Store
- **Implementation**: MongoDB with version-based optimistic concurrency
- **Features**:
  - Append-only log
  - Snapshot support for performance
  - Event replay for state reconstruction

#### 3.2.2 Event Replay
- **Use Case**: Rebuild aggregate state from events
- **Optimization**: Start from latest snapshot
- **Verification**: Replay all events to ensure consistency

### 3.3 CQRS (Command Query Responsibility Segregation)

#### 3.3.1 Commands
- **Write Operations**: Create, update, delete
- **Event Publishing**: Commands produce events
- **Validation**: Business rules enforced in command handlers

#### 3.3.2 Queries
- **Read Operations**: Optimized for read performance
- **Caching**: Redis cache for frequently accessed data
- **Projections**: Materialized views for complex queries

### 3.4 Strategy Pattern

#### 3.4.1 Enrollment Policies
- **PrerequisitePolicy**: Checks course prerequisites
- **CapacityPolicy**: Validates section capacity
- **TimeConflictPolicy**: Detects schedule conflicts

#### 3.4.2 Authentication Strategies
- **PasswordCredential**: Username/password
- **OAuthCredential**: OAuth providers
- **CertificateCredential**: X.509 certificates

### 3.5 Circuit Breaker Pattern

#### 3.5.1 Implementation
- **Purpose**: Prevent cascading failures
- **States**: Closed, Open, Half-Open
- **Use Case**: ML service fallback to rule-based logic

### 3.6 Repository Pattern

#### 3.6.1 Data Access
- **Abstraction**: Repository interface
- **Implementation**: SQLAlchemy for PostgreSQL
- **Benefits**: Testability, maintainability

### 3.7 Factory Pattern

#### 3.7.1 Aggregate Creation
- **EnrollmentAggregate.create()**: Factory method
- **Grade.create()**: Immutable grade creation
- **Event.create()**: Domain event creation

---

## 4. Data Model

### 4.1 Core Entities

#### 4.1.1 Person Hierarchy (5+ Levels)
```
AbstractEntity
  └── VersionedEntity
      └── AuditableEntity
          └── Person (abstract)
              ├── Student
              ├── Lecturer
              ├── Staff
              ├── Guest
              └── Admin
```

#### 4.1.2 Academic Entities
- **Course**: Course catalog entries
- **Section**: Course sections with schedule
- **Enrollment**: Student-section relationships
- **Assessment**: Assignments, exams, quizzes
- **Grade**: Immutable grade records (encrypted)

#### 4.1.3 Security Entities
- **Credential**: Authentication credentials (password, OAuth, certificate)
- **Role**: RBAC roles with permissions
- **Permission**: Fine-grained permissions (action + resource)
- **AuthToken**: JWT tokens

### 4.2 Relationships

#### 4.2.1 Academic Relationships
- **Course 1:N Section**: One course has many sections
- **Section N:M Student** (via Enrollment): Many-to-many with enrollment metadata
- **Assessment 1:N Grade**: One assessment produces many grades
- **Student 1:N Grade**: One student has many grades

#### 4.2.2 Security Relationships
- **Person N:M Role**: Many-to-many with dynamic role attachment
- **Role 1:N Permission**: One role has many permissions
- **Person 1:N Credential**: One person can have multiple credentials

### 4.3 Event Store Schema

#### 4.3.1 EventEnvelope
```json
{
  "event_id": "UUID",
  "stream_id": "string",
  "stream_version": "int",
  "event": {
    "event_type": "string",
    "occurred_at": "datetime",
    "data": {}
  },
  "timestamp": "datetime"
}
```

#### 4.3.2 Snapshot
```json
{
  "aggregate_id": "UUID",
  "aggregate_type": "string",
  "version": "int",
  "state": {},
  "timestamp": "datetime"
}
```

---

## 5. Trade-offs and Decisions

### 5.1 Microservices vs Monolith

**Decision**: Microservices  
**Rationale**:
- **Scalability**: Independent scaling of services
- **Technology Diversity**: Different services can use optimal technologies
- **Team Autonomy**: Teams can work independently
- **Fault Isolation**: Failures in one service don't cascade

**Trade-offs**:
- **Complexity**: More complex deployment and monitoring
- **Network Latency**: Inter-service communication overhead
- **Data Consistency**: Eventual consistency challenges

### 5.2 Event Sourcing vs Traditional CRUD

**Decision**: Event Sourcing for critical aggregates  
**Rationale**:
- **Audit Trail**: Complete history of changes
- **State Reconstruction**: Rebuild state from events
- **Temporal Queries**: Query historical state
- **Compliance**: Immutable audit log for GDPR

**Trade-offs**:
- **Complexity**: More complex read models
- **Storage**: Larger storage requirements
- **Performance**: Event replay can be slow (mitigated with snapshots)

### 5.3 PostgreSQL vs NoSQL

**Decision**: PostgreSQL for entities, MongoDB for events  
**Rationale**:
- **PostgreSQL**: ACID transactions, relational integrity, complex queries
- **MongoDB**: Flexible schema for events, horizontal scaling, append-only optimization

**Trade-offs**:
- **Data Duplication**: Some data in both systems
- **Consistency**: Eventual consistency between systems
- **Complexity**: Two database systems to manage

### 5.4 REST vs gRPC

**Decision**: Both (REST for external, gRPC for internal)  
**Rationale**:
- **REST**: Standard, easy to use, browser-compatible
- **gRPC**: High performance, type-safe, streaming support

**Trade-offs**:
- **Maintenance**: Two API implementations
- **Complexity**: Need to maintain both protocols

### 5.5 Encryption at Rest vs Application-Level

**Decision**: Application-level encryption for sensitive fields  
**Rationale**:
- **Fine-Grained**: Encrypt only sensitive fields (grades)
- **Key Management**: Application controls encryption keys
- **Performance**: Selective encryption reduces overhead

**Trade-offs**:
- **Key Management**: Need secure key storage
- **Performance**: Encryption/decryption overhead

---

## 6. Deployment Architecture

### 6.1 Containerization

#### 6.1.1 Docker Containers
- Each microservice runs in a Docker container
- Base image: Python 3.11-slim
- Multi-stage builds for optimization

#### 6.1.2 Container Orchestration
- **Option 1**: Docker Compose (development)
- **Option 2**: Kubernetes (production)
- **Features**: Auto-scaling, health checks, rolling updates

### 6.2 Database Deployment

#### 6.2.1 PostgreSQL
- **Primary**: Master database for writes
- **Replicas**: Read replicas for scaling reads
- **Backup**: Daily backups with point-in-time recovery

#### 6.2.2 MongoDB
- **Replica Set**: 3-node replica set for high availability
- **Sharding**: Horizontal scaling for large event volumes
- **Backup**: Continuous backup to S3

### 6.3 Load Balancing

#### 6.3.1 API Gateway
- **Load Balancer**: Nginx/HAProxy
- **Algorithm**: Round-robin with health checks
- **SSL Termination**: TLS/SSL at load balancer

### 6.4 Monitoring and Logging

#### 6.4.1 Metrics
- **Prometheus**: Metrics collection
- **Grafana**: Visualization dashboards
- **Metrics**: Response time, error rate, throughput

#### 6.4.2 Logging
- **ELK Stack**: Elasticsearch, Logstash, Kibana
- **Structured Logging**: JSON logs with correlation IDs
- **Log Aggregation**: Centralized log collection

### 6.5 CI/CD Pipeline

#### 6.5.1 Continuous Integration
- **GitHub Actions**: Automated testing
- **Tests**: Unit, integration, penetration
- **Code Quality**: Linting, type checking

#### 6.5.2 Continuous Deployment
- **Staging**: Automated deployment to staging
- **Production**: Manual approval for production
- **Rollback**: Automated rollback on failure

---

## 7. Security Architecture

### 7.1 Authentication

#### 7.1.1 JWT Tokens
- **Algorithm**: HS256
- **Expiration**: 15 minutes (access), 7 days (refresh)
- **Storage**: HttpOnly cookies (recommended) or localStorage

#### 7.1.2 Multi-Factor Authentication
- **2FA**: TOTP (Time-based One-Time Password)
- **Backup Codes**: Recovery codes for account access

### 7.2 Authorization

#### 7.2.1 RBAC
- **Roles**: Student, Lecturer, Admin
- **Permissions**: Action + Resource type
- **Hierarchy**: Role inheritance

#### 7.2.2 ABAC
- **Attributes**: User, resource, environment
- **Policies**: Fine-grained access control
- **Evaluation**: Policy engine

### 7.3 Encryption

#### 7.3.1 Field-Level Encryption
- **Algorithm**: Fernet (symmetric)
- **Fields**: Grades (points, percentage, feedback)
- **Key Management**: Environment variables, key rotation

### 7.4 Audit Logging

#### 7.4.1 Hash-Chained Logs
- **Algorithm**: SHA-256
- **Structure**: Each entry links to previous
- **Tamper Detection**: Any modification breaks chain

### 7.5 GDPR Compliance

#### 7.5.1 Data Erasure
- **Full Deletion**: Removes all personal data
- **Pseudonymization**: Anonymizes PII, preserves analytics
- **Verification**: Audit trail of erasure operations

---

## 8. Scalability and Performance

### 8.1 Horizontal Scaling

#### 8.1.1 Stateless Services
- **API Gateway**: Multiple instances behind load balancer
- **Microservices**: Auto-scaling based on CPU/memory
- **Database**: Read replicas for read scaling

### 8.2 Caching Strategy

#### 8.2.1 Redis Cache
- **Session Storage**: User sessions
- **Query Results**: Frequently accessed data
- **Rate Limiting**: Request rate limiting

### 8.3 Performance Targets

#### 8.3.1 API Response Time
- **P50**: <100ms
- **P95**: <200ms
- **P99**: <500ms

#### 8.3.2 Throughput
- **API Gateway**: 10,000 requests/second
- **Database**: 5,000 queries/second
- **Event Store**: 50,000 events/second

---

## 9. Future Enhancements

### 9.1 Planned Features
- **Mobile App**: Native iOS/Android applications
- **Real-time Notifications**: WebSocket support
- **Advanced Analytics**: More ML models
- **Blockchain**: Immutable audit log on blockchain

### 9.2 Technology Upgrades
- **GraphQL**: Alternative to REST
- **Service Mesh**: Istio for advanced traffic management
- **Serverless**: AWS Lambda for event processing

---

## Appendix A: Technology Stack

### Backend
- **Language**: Python 3.11
- **Framework**: FastAPI
- **ORM**: SQLAlchemy
- **Database**: PostgreSQL 15, MongoDB 6
- **Cache**: Redis 7
- **Message Queue**: RabbitMQ

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **UI Library**: Shadcn UI, Tailwind CSS
- **State Management**: TanStack Query

### ML/AI
- **Framework**: PyTorch, scikit-learn
- **RL**: Stable-Baselines3
- **Explainability**: LIME, SHAP

### DevOps
- **Containerization**: Docker
- **Orchestration**: Kubernetes (optional)
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus, Grafana
- **Logging**: ELK Stack

---

## Appendix B: Glossary

- **Aggregate**: Cluster of domain objects treated as a single unit
- **Event Sourcing**: Storing state changes as a sequence of events
- **CQRS**: Command Query Responsibility Segregation
- **RBAC**: Role-Based Access Control
- **ABAC**: Attribute-Based Access Control
- **GDPR**: General Data Protection Regulation
- **JWT**: JSON Web Token
- **gRPC**: Google Remote Procedure Call

---

**Document End**


