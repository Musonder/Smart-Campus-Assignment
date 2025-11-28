# Object Model & Core Classes - Implementation Summary

## Overview

This document summarizes the comprehensive object model implementation for the Smart Campus system, featuring:
- **5+ level inheritance hierarchies**
- **Multiple orthogonal composition relationships**
- **Pluggable authentication strategies**
- **Event-driven architecture with pub/sub**
- **Constraint-based scheduling**
- **Immutable audit trails**
- **Hot-loadable plugin system**

---

## 1. Inheritance Hierarchy (5+ Levels)

### Person Hierarchy (6 Levels)

```
Level 1: AbstractEntity
  ├─ Universal ID (UUID)
  ├─ Lifecycle management (created_at, updated_at, status)
  └─ Business rule validation

Level 2: VersionedEntity (extends AbstractEntity)
  ├─ Schema versioning (schema_version, migration_history)
  └─ Migration support

Level 3: AuditableEntity (extends VersionedEntity)
  ├─ Audit trail (created_by, updated_by, access_count)
  └─ Compliance tracking

Level 4: Person (extends AuditableEntity)
  ├─ Personal information (email, name, DOB)
  ├─ Dynamic role attachments (attached_roles)
  └─ GDPR compliance (pseudonymization)

Level 5: Student/Lecturer/Staff/Guest/Admin (extends Person)
  ├─ Student: student_id, GPA, credits, academic_standing
  ├─ Lecturer: employee_id, department, specialization, tenure
  ├─ Staff: employee_id, job_title, clearance_level
  ├─ Guest: visitor_id, visit_purpose, access validity
  └─ Admin: admin_level, permissions, 2FA requirement
```

**Example: Student**
- `AbstractEntity` → `VersionedEntity` → `AuditableEntity` → `Person` → `Student`
- **Total: 5 levels** ✅

---

## 2. Core Classes Implemented

### 2.1 Base Entities

#### AbstractEntity
- **Location**: `shared/domain/entities.py`
- **Features**:
  - Universal UUID-based identity
  - Lifecycle management (DRAFT, ACTIVE, INACTIVE, ARCHIVED, DELETED)
  - Timestamp tracking (created_at, updated_at)
  - Business rule validation interface

#### VersionedEntity
- **Extends**: `AbstractEntity`
- **Features**:
  - Schema versioning for backward compatibility
  - Migration history tracking
  - `migrate_to_latest()` method

#### AuditableEntity
- **Extends**: `VersionedEntity`
- **Features**:
  - Creation/update tracking (created_by, updated_by)
  - Access logging (access_count, last_accessed_at)
  - Audit summary generation

---

### 2.2 Person Hierarchy

#### Person (Abstract)
- **Extends**: `AuditableEntity`
- **Features**:
  - Personal information (email, name, phone, DOB)
  - **Dynamic role attachments** at runtime (e.g., Student can be TA)
  - GDPR compliance (pseudonymization, consent tracking)
  - Methods: `attach_role()`, `detach_role()`, `has_role()`, `pseudonymize()`

#### Student
- **Extends**: `Person`
- **Features**:
  - Student ID, enrollment date, graduation date
  - Academic data (GPA, credits, major, minor)
  - Academic standing (good/probation/suspended)
  - Methods: `update_gpa()`, `add_credits()`

#### Lecturer
- **Extends**: `Person`
- **Features**:
  - Employee ID, department, title
  - Specialization, tenure status
  - Course load management (max_course_load)

#### Staff
- **Extends**: `Person`
- **Features**:
  - Employee ID, department, job title
  - Security clearance level (1-5)

#### Guest
- **Extends**: `Person`
- **Features**:
  - Visitor ID, host ID
  - Temporary access with validity period
  - Methods: `is_access_valid()`, `extend_access()`

#### Admin
- **Extends**: `Person`
- **Features**:
  - Admin level (1-3)
  - Granular permissions (users, courses, facilities, security)
  - Mandatory 2FA

---

### 2.3 Authentication & Security

#### Credential (Abstract)
- **Location**: `shared/domain/security.py`
- **Strategy Pattern**: Pluggable authentication
- **Features**:
  - Abstract `verify()` method
  - Expiration tracking
  - Usage tracking (last_used_at)

#### PasswordCredential
- **Extends**: `Credential`
- **Strategy**: `AuthStrategy.PASSWORD`
- **Features**:
  - Bcrypt password hashing
  - Failed attempt tracking
  - Account locking

#### OAuthCredential
- **Extends**: `Credential`
- **Strategy**: `AuthStrategy.OAUTH`
- **Features**:
  - Provider support (Google, Microsoft, GitHub)
  - Access/refresh token management

#### CertificateCredential
- **Extends**: `Credential`
- **Strategy**: `AuthStrategy.CERTIFICATE`
- **Features**:
  - X.509 certificate support
  - Certificate serial, thumbprint, issuer
  - Validity period tracking

#### AuthToken
- **Features**:
  - JWT-based tokens
  - Access/refresh token types
  - Scopes and expiration
  - Factory methods: `create_access_token()`, `create_refresh_token()`

#### Role & Permission
- **Role**: Groups permissions, hierarchical inheritance
- **Permission**: Fine-grained RBAC/ABAC (action + resource_type + conditions)

---

### 2.4 Academic Entities

#### Course
- **Extends**: `VersionedEntity`
- **Features**:
  - Course code, title, description
  - Credits, level, department
  - Prerequisites, corequisites
  - Learning outcomes

#### Section
- **Extends**: `VersionedEntity`
- **Features**:
  - Section number, semester
  - Schedule (days, start_time, end_time)
  - Room assignment, instructor
  - Enrollment management (current_enrollment, max_enrollment, waitlist)

#### Syllabus
- **Extends**: `VersionedEntity`
- **Features**:
  - Course overview, topics
  - Required/recommended readings
  - Grading policy and distribution
  - Academic policies (attendance, late submission, integrity)

#### Assessment
- **Extends**: `VersionedEntity`
- **Features**:
  - Title, description, type (exam/assignment/quiz)
  - Points, weight, dates
  - Late submission policy
  - Group work support

#### Grade (Immutable)
- **Features**:
  - Immutable grade objects (frozen Pydantic model)
  - Points earned, percentage, letter grade
  - Feedback, graded_by, graded_at
  - Once created, cannot be modified (only replaced)

---

### 2.5 Facility Entities

#### Facility
- **Extends**: `VersionedEntity`
- **Features**:
  - Building name, code, type
  - Address, floors, rooms
  - Energy monitoring (energy_meter_id, current_energy_usage)
  - Environmental control (temperature)

#### Room
- **Extends**: `VersionedEntity`
- **Features**:
  - Room number, type, floor
  - Capacity, current occupancy
  - Equipment (projector, whiteboard, computers)
  - Environmental sensors (temperature, humidity, light)
  - Booking availability

#### Resource
- **Extends**: `VersionedEntity`
- **Features**:
  - Resource type (projector, computer, etc.)
  - Manufacturer, model, serial number
  - Maintenance tracking
  - Usage hours

#### Sensor
- **Extends**: `VersionedEntity`
- **Features**:
  - Sensor type (temperature, humidity, motion, energy)
  - Current reading, unit, last_reading_at
  - Calibration status
  - Threshold-based anomaly detection

#### Actuator
- **Extends**: `VersionedEntity`
- **Features**:
  - Actuator type (HVAC, light, lock, blind)
  - Current state management
  - Authorization for control
  - Command history

#### Booking
- **Extends**: `VersionedEntity`
- **Features**:
  - Room reservation
  - Time range (start_time, end_time)
  - Attendees, organizer
  - Confirmation/cancellation

---

### 2.6 Scheduler Subsystem

#### Constraint (Base)
- **Features**:
  - Constraint type (HARD/SOFT)
  - Priority and weight
  - Parameters dictionary
  - Methods: `is_hard()`, `is_soft()`

#### Concrete Constraints
- **CapacityConstraint**: Hard - Room capacity must accommodate section
- **TimeConflictConstraint**: Hard - No overlapping time slots
- **InstructorAvailabilityConstraint**: Hard - Instructor must be available
- **RoomPreferenceConstraint**: Soft - Prefer certain rooms
- **BalancedWorkloadConstraint**: Soft - Balance instructor workload

#### Timetable
- **Extends**: `VersionedEntity`
- **Features**:
  - Semester, academic year
  - Section-to-room-time assignments
  - Constraint management (add/remove)
  - Snapshot creation
  - Finalization (immutable state)

#### TimetableSnapshot
- **Extends**: `VersionedEntity`
- **Features**:
  - Immutable snapshot of timetable state
  - Optimization scores
  - Constraint satisfaction tracking
  - Version history (parent_snapshot_id)

---

### 2.7 Event System

#### Event (Abstract)
- **Location**: `shared/events/base.py`
- **Features**:
  - Event metadata (correlation_id, causation_id, trace_id)
  - Event type identification
  - Serialization support

#### DomainEvent
- **Extends**: `Event`
- **Features**:
  - Aggregate root association
  - Sequence numbering
  - Event sourcing support

#### EventStream
- **Location**: `shared/events/stream.py`
- **Features**:
  - Publish/subscribe pattern
  - Multiple subscribers per event type
  - Event history and replay
  - Polymorphic subscription (base class subscribers)

#### EventSubscriber (Interface)
- **Features**:
  - `handle_event()` method
  - `get_subscribed_event_types()` method

#### EventStreamManager
- **Features**:
  - Centralized stream management
  - Stream creation/removal
  - Cross-stream operations

---

### 2.8 Policy System

#### EnrollmentPolicy (Abstract)
- **Location**: `shared/domain/policies.py`
- **Strategy Pattern**: Pluggable enrollment policies
- **Features**:
  - Priority-based execution
  - `evaluate()` method

#### Concrete Policies
- **PrerequisitePolicy**: Checks course prerequisites
- **CapacityPolicy**: Enforces section capacity
- **TimeConflictPolicy**: Prevents schedule conflicts
- **CreditLimitPolicy**: Enforces credit hour limits
- **AcademicStandingPolicy**: Checks academic standing
- **PriorityEnrollmentPolicy**: Implements priority enrollment windows

#### PolicyEngine
- **Features**:
  - Policy registration and management
  - Priority-based evaluation
  - Fail-fast on first violation
  - Result aggregation

---

### 2.9 Audit & Compliance

#### AuditLogEntry
- **Location**: `shared/domain/audit.py`
- **Features**:
  - **Immutable** (frozen Pydantic model)
  - Tamper-evident hash chaining
  - Action, severity, actor, resource tracking
  - Change tracking (old_values, new_values)

#### AuditLogChain
- **Features**:
  - Chain of audit entries
  - Integrity verification
  - Query by actor, resource, action, time range

#### ComplianceChecker
- **Features**:
  - Unauthorized access detection
  - Failed authentication analysis
  - Data export tracking (GDPR)
  - Comprehensive compliance reports

---

### 2.10 Plugin System

#### IPlugin (Interface)
- **Location**: `shared/domain/plugins.py`
- **Features**:
  - Lifecycle hooks: `on_load()`, `on_activate()`, `on_deactivate()`, `on_unload()`
  - Plugin metadata
  - Status tracking

#### PluginManager
- **Features**:
  - Hot-loading from files
  - Dependency injection (PluginContext)
  - Hot-reload without restart
  - Plugin discovery

#### PluginContext
- **Features**:
  - Service registration for plugins
  - Hook system for extensibility
  - Dependency injection

---

### 2.11 ML Model Wrapper

#### BaseMLModel (Abstract)
- **Location**: `ml/models/base.py`
- **Features**:
  - Abstract methods: `train()`, `predict()`, `explain()`
  - Model versioning integration
  - Deterministic behavior (RNG seeding)
  - Save/load support

#### EnrollmentPredictor
- **Extends**: `BaseMLModel`
- **Features**:
  - LSTM-based dropout prediction
  - Attention mechanism
  - Explainability hooks

#### RoomUsageOptimizer
- **Extends**: `BaseMLModel`
- **Features**:
  - PPO-based room allocation
  - Energy + travel time optimization
  - Constraint satisfaction

---

## 3. Composition Relationships

### 3.1 Has-A Relationships

1. **Person has-a Credential**
   - A person can have multiple credentials (password, OAuth, certificate)
   - Pluggable authentication strategies

2. **Room has-a Resource**
   - Room contains equipment/resources (projector, computer, etc.)
   - Resources belong to a specific room

3. **Room has-a Sensor/Actuator**
   - Room contains IoT sensors (temperature, humidity)
   - Room contains actuators (HVAC, lights)

4. **Timetable has-a Constraint**
   - Timetable contains multiple constraints
   - Constraints can be added/removed dynamically

### 3.2 Contains Relationships (Aggregation)

1. **Facility contains Room**
   - Facility aggregates multiple rooms
   - Rooms belong to a facility

2. **Course contains Section**
   - Course aggregates multiple sections
   - Sections are instances of a course

3. **Timetable contains TimetableSnapshot**
   - Timetable creates and manages snapshots
   - Snapshots are version history

### 3.3 Uses-A Relationships (Association)

1. **Section uses-a Room**
   - Section is assigned to a room
   - Room can host multiple sections (at different times)

2. **Section uses-a Lecturer**
   - Section is taught by a lecturer
   - Lecturer can teach multiple sections

3. **EventStream uses Event**
   - EventStream publishes and manages events
   - Events are independent entities

4. **Person uses-a Role**
   - Person can have multiple roles
   - Roles are attached dynamically at runtime

---

## 4. Key Design Patterns

### 4.1 Strategy Pattern
- **Credential**: Pluggable authentication (Password, OAuth, Certificate)
- **EnrollmentPolicy**: Pluggable enrollment validation policies

### 4.2 Observer Pattern
- **EventStream**: Publish/subscribe for event-driven architecture

### 4.3 Factory Pattern
- **AuthToken**: Factory methods for token creation
- **AuditLogEntry**: Factory method for hash computation

### 4.4 Immutability Pattern
- **Grade**: Immutable grade objects
- **AuditLogEntry**: Frozen Pydantic models
- **TimetableSnapshot**: Immutable snapshots

### 4.5 Versioning Pattern
- **VersionedEntity**: Schema versioning and migration
- **TimetableSnapshot**: Version history for timetables

---

## 5. Encapsulation & Interfaces

### 5.1 Well-Documented Public Interfaces
- All classes have comprehensive docstrings
- Type hints throughout
- Clear method signatures

### 5.2 Encapsulation
- Private methods prefixed with `_`
- Protected attributes where appropriate
- Public API clearly defined

### 5.3 Immutability
- Grade objects are frozen
- AuditLogEntry is frozen
- TimetableSnapshot is immutable

---

## 6. Versioning Support

### 6.1 Entity Schema Versioning
- `VersionedEntity` tracks `schema_version`
- Migration history tracking
- `migrate_to_latest()` method

### 6.2 Model Versioning
- ML models track version in `ModelRegistry`
- Model metadata includes version
- Version-based model loading

### 6.3 Timetable Versioning
- `TimetableSnapshot` provides version history
- Parent snapshot tracking
- Rollback capability

---

## 7. Summary Statistics

- **Total Classes**: 50+
- **Inheritance Levels**: 5-6 levels (Person hierarchy)
- **Composition Relationships**: 10+ (has-a, contains, uses-a)
- **Design Patterns**: 5+ (Strategy, Observer, Factory, Immutability, Versioning)
- **Pluggable Systems**: 3 (Authentication, Enrollment Policies, Plugins)
- **Immutable Entities**: 3 (Grade, AuditLogEntry, TimetableSnapshot)

---

## 8. File Structure

```
shared/
├── domain/
│   ├── entities.py          # AbstractEntity, Person hierarchy
│   ├── academic.py          # Course, Section, Syllabus, Assessment, Grade
│   ├── facilities.py        # Facility, Room, Resource, Sensor, Actuator
│   ├── security.py          # Credential, AuthToken, Role, Permission
│   ├── policies.py          # EnrollmentPolicy, PolicyEngine
│   ├── scheduler.py         # Constraint, Timetable, TimetableSnapshot
│   ├── plugins.py           # IPlugin, PluginManager
│   └── audit.py            # AuditLogEntry, ComplianceChecker
├── events/
│   ├── base.py             # Event, DomainEvent
│   └── stream.py           # EventStream, EventSubscriber
└── verification/
    └── enrollment_invariants.py  # Formal verification

ml/
└── models/
    ├── base.py              # BaseMLModel
    ├── enrollment_predictor.py
    ├── room_optimizer.py
    └── versioning.py        # ModelRegistry
```

---

## 9. Compliance & Requirements

✅ **AbstractEntity**: Universal ID, lifecycle, versioning  
✅ **Person Hierarchy**: 5+ levels with dynamic role attachments  
✅ **Credential & AuthToken**: Pluggable auth strategies (password, OAuth, certificate)  
✅ **Academic Entities**: Course, Section, Syllabus, Assessment, Grade (immutable)  
✅ **Facility Entities**: Facility, Room, Resource (sensors, actuators)  
✅ **EnrollmentPolicy**: Strategy pattern with multiple policies  
✅ **Scheduler**: Constraint objects (soft/hard), Timetable snapshotting  
✅ **Event System**: Event and EventStream for pub/sub  
✅ **Plugin System**: Plugin interface and PluginManager for hot-loading  
✅ **Audit & Compliance**: AuditLogEntry, ComplianceChecker  
✅ **Policy System**: Policy and PolicyEngine  
✅ **MLModel Wrapper**: Abstract with train(), predict(), explain()  
✅ **Encapsulation**: Well-documented public interfaces  
✅ **Immutability**: Where appropriate (Grade, AuditLogEntry)  
✅ **Versioning**: Entity schema versioning  
✅ **5+ Inheritance Levels**: Person hierarchy  
✅ **Multiple Composition Relationships**: has-a, uses-a, contains  

---

**Kellycode - 2464** ✅

