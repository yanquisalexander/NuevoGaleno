# Multi-Node Architecture Guide

## Overview

Nuevo Galeno now supports a multi-node architecture that allows a single installation to operate in three different modes:

1. **Standalone Mode**: Traditional local-only operation
2. **Host Mode**: Acts as a server for other instances, exposing an HTTP API
3. **Client Mode**: Connects to a remote host instead of using local database

This architecture follows the principle that **the UI never accesses SQLite directly**. All business logic lives in domain services, and both Tauri commands and HTTP API are just adapters.

## Architecture Layers

### 1. Domain Services Layer (`src-tauri/src/services/`)

Pure business logic, independent of Tauri and HTTP:

```rust
pub struct PatientService {
    // Business logic for patient management
}

impl PatientService {
    pub fn create(&self, input: CreatePatientInput) -> ServiceResult<i64> {
        // Validation
        // Business rules
        // Database operations
    }
}
```

**Key Points:**
- ❌ No Tauri dependencies
- ❌ No HTTP dependencies
- ✅ Pure business logic
- ✅ Reusable across all adapters

### 2. Adapters

#### Tauri Adapter (Commands)

```rust
#[tauri::command]
fn create_patient(input: CreatePatientInput) -> Result<i64, String> {
    let service = PatientService::new();
    service.create(input).map_err(|e| e.into())
}
```

#### HTTP API Adapter

```rust
pub async fn create_patient(Json(input): Json<CreatePatientInput>) -> impl IntoResponse {
    let service = PatientService::new();
    match service.create(input) {
        Ok(id) => (StatusCode::CREATED, Json(json!({ "id": id }))).into_response(),
        Err(e) => service_error_to_response(e),
    }
}
```

**Important**: Both adapters call **exactly the same service logic**.

### 3. Frontend Unified Client

The frontend uses a unified client interface that automatically switches between local (Tauri invoke) and remote (HTTP) based on the active context:

```typescript
// Unified interface
export interface GalenoClient {
  getPatients(limit?: number, offset?: number): Promise<Patient[]>;
  createPatient(input: CreatePatientInput): Promise<number>;
  // ... other methods
}

// Local adapter (Tauri)
class LocalGalenoClient implements GalenoClient {
  async getPatients(limit?: number, offset?: number): Promise<Patient[]> {
    return await invoke('get_patients', { limit, offset });
  }
}

// Remote adapter (HTTP)
class RemoteGalenoClient implements GalenoClient {
  async getPatients(limit?: number, offset?: number): Promise<Patient[]> {
    return await this.request('GET', `/patients?limit=${limit}&offset=${offset}`);
  }
}
```

## Node Configuration

### Standalone Mode (Default)

No special configuration needed. Works like the traditional version:

```typescript
{
  mode: 'standalone',
  node_name: 'Clinica Principal',
  host_config: null,
  client_config: null
}
```

### Host Mode

Enables the HTTP API server:

```typescript
{
  mode: 'host',
  node_name: 'Servidor Principal',
  host_config: {
    api_port: 3000,
    api_token: 'your-secure-token-here',
    enable_cors: true
  },
  client_config: null
}
```

**To start the server:**

1. Configure node in Host mode via the UI (Node Configuration app)
2. The server starts automatically when you save the configuration
3. API is available at `http://localhost:3000/api`

**API Endpoints:**

- `GET /api/patients` - Get all patients
- `GET /api/patients/:id` - Get patient by ID
- `POST /api/patients` - Create patient
- `PUT /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient
- `GET /api/patients/search?q=query` - Search patients
- `GET /api/patients/count` - Get patient count

**Authentication:**

All API requests require a Bearer token:

```
Authorization: Bearer your-secure-token-here
```

### Client Mode

Connects to a remote host:

```typescript
{
  mode: 'client',
  node_name: 'Consultorio Remoto',
  host_config: null,
  client_config: {
    remote_url: 'http://192.168.1.100:3000',
    auth_token: 'your-secure-token-here'
  }
}
```

**Important:** In client mode:
- The local database is NOT used
- All operations go through the remote API
- The remote host must be in Host mode
- Network connectivity is required

## Usage Examples

### Using the Unified Client in Components

```typescript
import { useGalenoClient } from '../hooks/useGalenoClient';

function MyComponent() {
  const client = useGalenoClient();
  
  const loadPatients = async () => {
    // Works with both local and remote!
    const patients = await client.getPatients();
    console.log(patients);
  };
  
  const createNewPatient = async () => {
    const id = await client.createPatient({
      first_name: 'John',
      last_name: 'Doe',
      // ... other fields
    });
    console.log('Created patient:', id);
  };
}
```

### Using the Node Context

```typescript
import { useNode } from '../contexts/NodeContext';

function NodeStatusIndicator() {
  const { nodeConfig, activeContext } = useNode();
  
  return (
    <div>
      <p>Node: {nodeConfig?.node_name}</p>
      <p>Mode: {activeContext?.mode}</p>
      {activeContext?.mode === 'remote' && (
        <p>Connected to: {activeContext.apiBaseUrl}</p>
      )}
    </div>
  );
}
```

## Security Considerations

### Authentication Methods

**Local Mode:**
- Password authentication with SHA-256 hashing
- Optional PIN authentication (4-6 digits, numeric only)
- Session stored in memory (Rust global state)

**Remote Mode:**
- JWT-based authentication (JSON Web Tokens)
- Token expiration: 24 hours
- Tokens are stateless and self-contained
- **PIN authentication NOT supported** in remote mode (security consideration)

### API Token Security

1. **Never hardcode tokens**: Use environment variables or secure storage
2. **Use strong tokens**: Generate cryptographically secure random strings
3. **Rotate tokens regularly**: Change tokens periodically
4. **HTTPS in production**: Always use HTTPS for remote connections

### Network Security

1. **Firewall configuration**: Only expose API port to trusted networks
2. **VPN recommended**: Use VPN for remote connections when possible
3. **Rate limiting**: Consider adding rate limiting to the API (future enhancement)

## Use Cases

### Use Case 1: Single Clinic with Multiple Workstations

**Setup:**
- Main computer: Host mode (stores database, runs API)
- Reception computers: Client mode (connects to main computer)
- Doctor's laptops: Standalone mode (can work offline)

**Benefits:**
- Centralized data on main computer
- Multiple users can work simultaneously
- Doctors can work offline when needed

### Use Case 2: Multi-Branch Clinic

**Setup:**
- Each branch: Standalone mode during work hours
- Nightly sync: Temporarily switch to client mode to sync with central server

**Benefits:**
- Each branch has its own data
- Can work if network fails
- Periodic synchronization of data

### Use Case 3: Mobile Companion App

**Setup:**
- Desktop: Host mode
- Mobile app (future): Client mode

**Benefits:**
- Access patient data from mobile devices
- Review appointments on the go
- Quick patient lookups

## Troubleshooting

### Server Won't Start

1. Check if port is already in use:
   ```bash
   netstat -an | grep 3000
   ```

2. Try a different port in the configuration

3. Check firewall settings

### Client Can't Connect

1. Verify the host URL is correct
2. Check network connectivity: `ping host-ip`
3. Verify the authentication token matches
4. Check if the host's API server is running
5. Ensure firewall allows incoming connections on the API port

### Performance Issues

1. **Slow API responses**: Check network latency
2. **Database locks**: Use connection pooling (future enhancement)
3. **Large datasets**: Implement pagination (already supported)

## Future Enhancements

1. **Automatic Service Discovery**: Nodes automatically discover hosts on the local network
2. **Data Synchronization**: Intelligent sync between standalone nodes
3. **Load Balancing**: Multiple host nodes with load distribution
4. **Audit Trail**: Enhanced logging for all operations
5. **Role-Based Access**: Permissions per user/node
6. **WebSocket Support**: Real-time updates between nodes
7. **Backup/Restore**: Automated backup system for host nodes

## Migration Guide

### Existing Installation to Host Mode

1. Open "Configuración Multi-Nodo" from the system menu
2. Select "Host" mode
3. Configure:
   - Port (default: 3000)
   - Generate a secure token
   - Enable CORS if needed
4. Save configuration
5. Server starts automatically

### Adding a Client Node

1. Install Nuevo Galeno on the client machine
2. Complete initial setup
3. Open "Configuración Multi-Nodo"
4. Select "Client" mode
5. Configure:
   - Remote URL: `http://host-ip:3000`
   - Token: Same as host's token
6. Save configuration
7. Test by opening Patients app

## API Reference

### Authentication Endpoints

#### POST /api/auth/login

Authenticate a user and receive a JWT token.

**Request Body:**
```json
{
  "username": "doctor1",
  "password": "mypassword"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "doctor1",
    "name": "Dr. John Doe",
    "role": "doctor",
    "active": true
  }
}
```

**Error (401):**
```json
{
  "error": "Authentication failed",
  "message": "Usuario no encontrado"
}
```

**Notes:**
- Password is sent in plain text over HTTPS (use HTTPS in production!)
- JWT token is valid for 24 hours
- Token must be used in subsequent requests

#### GET /api/auth/verify

Verify a JWT token is valid.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "valid": true,
  "user": {
    "id": 1,
    "username": "doctor1",
    "name": "Dr. John Doe",
    "role": "doctor",
    "active": true
  }
}
```

**Response (401) - Invalid token:**
```json
{
  "valid": false,
  "user": null
}
```

### Authentication

All endpoints (except `/api/auth/login` and `/api/health`) require authentication. Two methods are supported:

**Method 1: Static API Token (Host-to-Host)**
```
Authorization: Bearer <api-token>
```
Use the token configured in the host's node configuration.

**Method 2: JWT Token (User Authentication)**
```
Authorization: Bearer <jwt-token>
```
Use the JWT token received from `/api/auth/login`.

### Patients Endpoints

#### GET /api/patients

Get all patients with optional pagination.

**Query Parameters:**
- `limit` (optional): Maximum number of results
- `offset` (optional): Number of results to skip

**Response:**
```json
[
  {
    "id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "document_number": "12345678",
    "phone": "+1234567890",
    "email": "john@example.com",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

#### GET /api/patients/:id

Get a specific patient by ID.

**Response:**
```json
{
  "id": 1,
  "first_name": "John",
  "last_name": "Doe",
  // ... other fields
}
```

**Error (404):**
```json
{
  "error": "Not Found",
  "message": "Patient 999 not found"
}
```

#### POST /api/patients

Create a new patient.

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "document_number": "12345678",
  "phone": "+1234567890",
  "email": "john@example.com"
}
```

**Response (201):**
```json
{
  "id": 1
}
```

#### PUT /api/patients/:id

Update an existing patient.

**Request Body:**
```json
{
  "phone": "+9876543210",
  "email": "newemail@example.com"
}
```

**Response (200):**
```json
{
  "message": "Patient updated successfully"
}
```

#### DELETE /api/patients/:id

Delete a patient.

**Response (200):**
```json
{
  "message": "Patient deleted successfully"
}
```

#### GET /api/patients/search?q=query

Search patients by name, document number, or other fields.

**Query Parameters:**
- `q`: Search query

**Response:** Array of matching patients (same format as GET /api/patients)

#### GET /api/patients/count

Get total patient count.

**Response:**
```json
{
  "count": 42
}
```

## Contributing

When adding new features:

1. **Add to Domain Service**: Implement business logic in services layer
2. **Add Tauri Command**: Create command that calls the service
3. **Add HTTP Endpoint**: Create API route that calls the service
4. **Update Client Interface**: Add method to `GalenoClient` interface
5. **Implement in Both Adapters**: Add to `LocalGalenoClient` and `RemoteGalenoClient`
6. **Update Documentation**: Document the new functionality

## License

This feature is part of Nuevo Galeno and follows the same license.
