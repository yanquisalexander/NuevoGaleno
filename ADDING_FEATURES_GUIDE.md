# Adding a New Feature to Multi-Node Architecture

This guide shows how to add a new feature (e.g., appointments) that works with both local and remote modes.

## Step 1: Add to Domain Service

Create `src-tauri/src/services/appointments.rs`:

```rust
use crate::db::appointments::{
    create_appointment as db_create_appointment,
    Appointment,
};
use crate::services::{DomainService, ServiceError, ServiceResult};

pub struct AppointmentService;

impl AppointmentService {
    pub fn new() -> Self {
        Self
    }

    pub fn create(&self, appointment: Appointment) -> ServiceResult<i64> {
        // Validation
        if appointment.patient_id <= 0 {
            return Err(ServiceError::ValidationError(
                "Invalid patient ID".to_string(),
            ));
        }

        // Call database layer
        db_create_appointment(&appointment)
            .map_err(|e| ServiceError::DatabaseError(e))
    }

    // ... other methods
}

impl DomainService for AppointmentService {
    fn name(&self) -> &'static str {
        "AppointmentService"
    }
}
```

Add to `src-tauri/src/services/mod.rs`:

```rust
pub mod appointments;
pub mod patients;
```

## Step 2: Add Tauri Command

In `src-tauri/src/lib.rs`:

```rust
#[tauri::command]
fn create_appointment(appointment: db::appointments::Appointment) -> Result<i64, String> {
    let service = services::appointments::AppointmentService::new();
    service.create(appointment).map_err(|e| e.into())
}
```

Register in `invoke_handler`:

```rust
.invoke_handler(tauri::generate_handler![
    // ... existing commands
    create_appointment,
])
```

## Step 3: Add HTTP API Endpoint

In `src-tauri/src/api/routes.rs`:

```rust
pub async fn create_appointment(
    Json(appointment): Json<Appointment>
) -> impl IntoResponse {
    let service = AppointmentService::new();
    match service.create(appointment) {
        Ok(id) => (
            StatusCode::CREATED,
            Json(json!({ "id": id })),
        ).into_response(),
        Err(e) => super::service_error_to_response(e),
    }
}

pub fn appointment_routes() -> Router {
    Router::new()
        .route("/appointments", axum::routing::post(create_appointment))
        // ... other routes
}
```

Add to main API router in `src-tauri/src/api/mod.rs`:

```rust
let mut app = Router::new()
    .nest("/api", super::routes::patient_routes())
    .nest("/api", super::routes::appointment_routes())  // Add this
    .layer(middleware::from_fn_with_state(
        token.clone(),
        super::auth_middleware,
    ));
```

## Step 4: Update Frontend Client Interface

In `src/lib/galeno-client.ts`:

```typescript
// Add types
export interface Appointment {
  id?: number;
  patient_id: number;
  date: string;
  time: string;
  notes?: string;
}

// Add to interface
export interface GalenoClient {
  // ... existing methods
  createAppointment(appointment: Appointment): Promise<number>;
  getAppointments(date?: string): Promise<Appointment[]>;
}

// Add to LocalGalenoClient
export class LocalGalenoClient implements GalenoClient {
  // ... existing methods
  
  async createAppointment(appointment: Appointment): Promise<number> {
    return await invoke<number>('create_appointment', { appointment });
  }

  async getAppointments(date?: string): Promise<Appointment[]> {
    return await invoke<Appointment[]>('get_appointments', { date });
  }
}

// Add to RemoteGalenoClient
export class RemoteGalenoClient implements GalenoClient {
  // ... existing methods
  
  async createAppointment(appointment: Appointment): Promise<number> {
    const result = await this.request<{ id: number }>(
      'POST', 
      '/appointments', 
      appointment
    );
    return result.id;
  }

  async getAppointments(date?: string): Promise<Appointment[]> {
    const params = date ? `?date=${date}` : '';
    return await this.request<Appointment[]>('GET', `/appointments${params}`);
  }
}
```

## Step 5: Create Hook (Optional)

Create `src/hooks/useAppointments.ts`:

```typescript
import { useGalenoClient } from './useGalenoClient';
import { Appointment } from '../lib/galeno-client';

export function useAppointments() {
  const client = useGalenoClient();

  return {
    createAppointment: (appointment: Appointment) => 
      client.createAppointment(appointment),
    getAppointments: (date?: string) => 
      client.getAppointments(date),
  };
}
```

## Step 6: Use in Components

```typescript
import { useAppointments } from '../hooks/useAppointments';

function AppointmentForm() {
  const { createAppointment } = useAppointments();

  const handleSubmit = async (data: any) => {
    try {
      const id = await createAppointment({
        patient_id: data.patientId,
        date: data.date,
        time: data.time,
        notes: data.notes,
      });
      console.log('Created appointment:', id);
    } catch (error) {
      console.error('Error creating appointment:', error);
    }
  };

  // ... rest of component
}
```

## Complete Checklist

When adding a new feature:

- [ ] Implement business logic in domain service (`src-tauri/src/services/`)
- [ ] Add Tauri command that calls the service (`src-tauri/src/lib.rs`)
- [ ] Add HTTP endpoint that calls the service (`src-tauri/src/api/routes.rs`)
- [ ] Update `GalenoClient` interface (`src/lib/galeno-client.ts`)
- [ ] Implement in `LocalGalenoClient` (uses invoke)
- [ ] Implement in `RemoteGalenoClient` (uses HTTP)
- [ ] Create hook if needed (`src/hooks/`)
- [ ] Test in standalone mode
- [ ] Test in host mode
- [ ] Test in client mode
- [ ] Update API documentation

## Testing

### Test Standalone Mode

1. Set node to Standalone mode
2. Test the feature works locally
3. Verify data is saved to local database

### Test Host Mode

1. Set node to Host mode
2. Start the API server
3. Test the endpoint with curl:
   ```bash
   curl -X POST http://localhost:3000/api/appointments \
     -H "Authorization: Bearer your-token" \
     -H "Content-Type: application/json" \
     -d '{"patient_id": 1, "date": "2024-01-01", "time": "10:00"}'
   ```

### Test Client Mode

1. Set up a host node
2. Set another node to Client mode pointing to the host
3. Test the feature in the client UI
4. Verify data is stored on the host, not locally

## Common Patterns

### Pagination

```rust
// Service
pub fn get_all(&self, limit: Option<i64>, offset: Option<i64>) -> ServiceResult<Vec<T>> {
    db_get_all(limit, offset).map_err(|e| ServiceError::DatabaseError(e))
}
```

```typescript
// Client
async getAppointments(limit?: number, offset?: number): Promise<Appointment[]> {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());
  if (offset) params.append('offset', offset.toString());
  const query = params.toString();
  return await this.request('GET', `/appointments${query ? `?${query}` : ''}`);
}
```

### Search/Filter

```rust
// Service
pub fn search(&self, query: &str) -> ServiceResult<Vec<T>> {
    if query.trim().is_empty() {
        return Err(ServiceError::ValidationError("Query required".to_string()));
    }
    db_search(query).map_err(|e| ServiceError::DatabaseError(e))
}
```

```typescript
// Client
async searchAppointments(query: string): Promise<Appointment[]> {
  const params = new URLSearchParams({ q: query });
  return await this.request('GET', `/appointments/search?${params}`);
}
```

### Error Handling

```rust
// Service
pub fn delete(&self, id: i64) -> ServiceResult<()> {
    match self.get_by_id(id)? {
        Some(_) => db_delete(id).map_err(|e| ServiceError::DatabaseError(e)),
        None => Err(ServiceError::NotFound(format!("Item {} not found", id))),
    }
}
```

```typescript
// Client - Remote
async deleteAppointment(id: number): Promise<void> {
  try {
    await this.request('DELETE', `/appointments/${id}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      throw new Error(`Appointment ${id} not found`);
    }
    throw error;
  }
}
```

## Best Practices

1. **Keep services pure**: No Tauri or HTTP dependencies in services
2. **Validate early**: Validate input in the service layer
3. **Consistent errors**: Use `ServiceError` types consistently
4. **Match signatures**: Ensure Tauri command and HTTP endpoint have the same logical interface
5. **Test both paths**: Always test both local and remote paths
6. **Document APIs**: Add OpenAPI/Swagger docs (future enhancement)
7. **Handle offline**: Consider offline scenarios for client mode

## Troubleshooting

### Different Results Local vs Remote

**Problem**: Feature works locally but fails remotely.

**Solution**: Check if:
- Service layer has all necessary logic (not just in Tauri command)
- HTTP endpoint properly deserializes input
- Authentication token is valid
- Network connectivity is stable

### Performance Issues

**Problem**: Remote calls are too slow.

**Solution**:
- Implement proper pagination
- Add caching where appropriate
- Optimize database queries
- Consider batch operations
- Use indexes on frequently queried fields

### Type Mismatches

**Problem**: TypeScript types don't match Rust types.

**Solution**:
- Keep types in sync between Rust and TypeScript
- Use code generation tools (future enhancement)
- Write integration tests
- Use TypeScript's `satisfies` operator

## Next Steps

After implementing your feature:

1. Write tests (unit tests for services)
2. Update documentation
3. Add to the UI navigation if needed
4. Consider edge cases and error scenarios
5. Test with real network conditions
6. Gather user feedback

## Resources

- Main Documentation: `MULTI_NODE_ARCHITECTURE.md`
- Service Layer: `src-tauri/src/services/`
- API Routes: `src-tauri/src/api/routes.rs`
- Client Interface: `src/lib/galeno-client.ts`
- Hooks: `src/hooks/`
