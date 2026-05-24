# API Contract & Swagger — US-05

Reference document for everyone consuming the Savely backend API
(frontend Next.js, mobile, internal scripts). Source of truth for the
runtime shape of every endpoint.

## 1. Swagger / OpenAPI

NestJS Swagger module is wired in `backend/src/main.ts` via
`setupSwagger()` and exposed at:

- Swagger UI: `http://localhost:3005/api/docs`
- Raw OpenAPI JSON: `http://localhost:3005/api/docs-json`

The same document can be generated as a static file (for type generation
or CI artefacts):

```bash
cd backend
npm run openapi:export      # writes backend/openapi.json
```

## 2. Standard response convention

All HTTP responses follow a single envelope. This is enforced globally
by `ResponseEnvelopeInterceptor` (success) and `HttpExceptionFilter`
(error), so no controller has to format responses manually.

### Success

```json
{
  "success": true,
  "data": { ... }
}
```

- `data` carries the route's payload (object, array, primitive — whatever
  the handler returned).
- A controller MAY return an already-shaped envelope (i.e. an object
  with `success: true` and `data`). It will be passed through unchanged.
- Swagger routes (`/api/docs*`) are excluded from envelope wrapping.

### Error

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "email must be an email",
    "details": ["email must be an email", "password too short"]
  }
}
```

- `code` is a stable, machine-readable string. Mapping:
  | HTTP | code                  |
  | ---- | --------------------- |
  | 400  | `BAD_REQUEST`         |
  | 401  | `UNAUTHORIZED`        |
  | 403  | `FORBIDDEN`           |
  | 404  | `NOT_FOUND`           |
  | 409  | `CONFLICT`            |
  | 422  | `UNPROCESSABLE_ENTITY`|
  | 500  | `INTERNAL_ERROR`      |
- `message` is human-readable but stable (do not localise here).
- `details` is optional. It contains the raw `class-validator` array on
  validation failures.
- 5xx errors never leak the original exception message or stack — only a
  generic `Internal server error` is returned. The full trace is logged.

## 3. DTO sharing strategy front ↔ back

**Decision: generate frontend types from the OpenAPI document.** No
shared monorepo package, no hand-written duplication.

Rationale:

- The repo is split into two `package.json` (frontend, backend) without a
  workspace tool. Pulling in pnpm/turbo just for one shared package is
  overkill for the current scope.
- The backend already controls every payload shape via NestJS DTOs +
  `@nestjs/swagger` decorators, so the OpenAPI document is the single
  source of truth at runtime.
- Type generation runs once per backend change and produces a single
  `.d.ts` file consumed by the frontend client.

### Workflow

1. Backend dev updates a DTO / controller, runs `npm run openapi:export`
   to refresh `backend/openapi.json`.
2. Frontend dev runs the type-generation script (added when the
   frontend client is wired up):
   ```bash
   cd frontend
   npx openapi-typescript ../backend/openapi.json -o lib/api-types.ts
   ```
3. The existing `frontend/lib/api.ts` keeps its adapter layer but its
   request/response types come from the generated file.

### Conventions when authoring DTOs

- Always export request and response DTO classes from the controller's
  module (`*/dto/*.dto.ts`).
- Annotate every field with `@ApiProperty` / `@ApiPropertyOptional`.
- Annotate every controller route with `@ApiOperation` and the
  appropriate `@ApiOkResponse` / `@ApiCreatedResponse`.
- Tag protected controllers with `@ApiBearerAuth('access-token')`.
