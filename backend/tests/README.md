# Backend Test Suite

This directory contains comprehensive test coverage for the RFID Access Control Backend API.

## Test Structure

```
tests/
├── setup.ts                    # Global test setup and configuration
├── helpers/
│   └── testData.ts             # Test data factory functions
├── controllers/                # API endpoint tests
│   ├── auth.controller.test.ts
│   ├── user.controller.test.ts
│   └── lock.controller.test.ts
├── middleware/                 # Middleware unit tests
│   └── auth.middleware.test.ts
├── services/                   # Service layer tests
│   └── user.service.test.ts
└── integration/                # End-to-end integration tests
    └── api.integration.test.ts
```

## Test Configuration

### Jest Configuration

- **Framework**: Jest with TypeScript support
- **Environment**: Node.js test environment
- **Database**: Uses the same PostgreSQL database with test data isolation
- **Coverage**: Configured to generate coverage reports
- **Timeout**: 30 seconds per test for database operations

### Environment Setup

Tests use the same database configuration as development but with proper cleanup between test runs.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- auth.controller.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="should login"
```

## Test Helpers

### Test Data Factory (`testData.ts`)

Provides factory functions to create test data with proper relationships:

```typescript
// Create test entities
const project = await createTestProject();
const city = await createTestCity();
const projectCity = await createTestProjectCity();
const user = await createTestUser({ role: "ADMIN" });
const address = await createTestAddress();
const location = await createTestLocation();
const lock = await createTestLock();
const rfidKey = await createTestRFIDKey();
const permission = await createTestPermission();
const accessLog = await createTestAccessLog();

// Cleanup after tests
await cleanupTestData();
```

### Features:

- **Automatic ID generation**: Uses timestamps to ensure uniqueness
- **Proper relationships**: Maintains foreign key relationships
- **Flexible overrides**: Allow customization of test data
- **Type safety**: Full TypeScript support with proper types
- **Cleanup utilities**: Proper teardown to avoid test pollution

## Test Categories

### 1. Controller Tests

Test API endpoints and HTTP request/response handling:

- **Authentication flows** (login, logout, profile)
- **CRUD operations** (users, locks, locations)
- **Authorization checks** (role-based access)
- **Input validation** (request body validation)
- **Error handling** (4xx, 5xx responses)

### 2. Middleware Tests

Test middleware functions in isolation:

- **Authentication middleware** (JWT token validation)
- **Authorization middleware** (role and permission checks)
- **Validation middleware** (input sanitization)
- **Error handling middleware** (error responses)

### 3. Service Tests

Test business logic and data operations:

- **User management** (creation, updates, permissions)
- **Lock operations** (access control, status tracking)
- **RFID key management** (issuance, expiration)
- **Tenant isolation** (multi-tenant data separation)

### 4. Integration Tests

Test complete workflows and system behavior:

- **Authentication flows** (end-to-end login process)
- **API security** (CORS, rate limiting, headers)
- **Error handling** (404s, validation errors)
- **Health checks** (system status)

## Database Testing Strategy

### Isolation

- Each test suite runs in isolation with its own test data
- Data is cleaned up after each test suite completes
- Foreign key relationships are properly maintained during cleanup

### Performance

- Tests run sequentially (`maxWorkers: 1`) to avoid database conflicts
- Database operations are optimized for test speed
- Test data is minimal but realistic

### Data Integrity

- All test data uses proper Prisma models and types
- Relationships are maintained correctly
- Unique constraints are respected with timestamp-based IDs

## Current Test Status

### ✅ Working Tests (15 passing)

- Basic test infrastructure
- Test data factory functions
- Database setup and cleanup
- User service basic operations

### 🔧 Tests Needing Fixes (16 failing)

- **API Response Format**: Some tests expect different response structures
- **Error Messages**: Expected error messages don't match actual responses
- **Authentication**: Some auth flows need adjustment for actual implementation
- **Data Constraints**: Some unique constraint violations in test data creation

### 🎯 Areas for Improvement

- **Mock External Services**: Mock Twilio, email services for isolated testing
- **Performance Tests**: Add tests for API response times and database performance
- **Security Tests**: Add tests for security vulnerabilities and attack vectors
- **Load Tests**: Add tests for concurrent user scenarios

## Writing New Tests

### Best Practices

1. **Use descriptive test names**:

   ```typescript
   it('should create user with valid admin credentials', async () => {
   ```

2. **Follow AAA pattern** (Arrange, Act, Assert):

   ```typescript
   // Arrange
   const testUser = await createTestUser({ role: "ADMIN" });

   // Act
   const response = await request(app).get("/api/user");

   // Assert
   expect(response.status).toBe(200);
   ```

3. **Clean up test data**:

   ```typescript
   afterAll(async () => {
     await cleanupTestData();
   });
   ```

4. **Use proper TypeScript types**:

   ```typescript
   let testUser: { id: string; username: string };
   ```

5. **Test both success and error cases**:
   ```typescript
   describe("POST /api/user", () => {
     it("should create user with valid data", async () => {
       /* ... */
     });
     it("should reject invalid user data", async () => {
       /* ... */
     });
     it("should require authentication", async () => {
       /* ... */
     });
   });
   ```

### Test Data Guidelines

- **Use factory functions** from `testData.ts` instead of direct Prisma calls
- **Make data unique** using timestamps or random values
- **Keep relationships consistent** (proper foreign keys)
- **Clean up after tests** to avoid pollution between test runs

## Debugging Tests

### Common Issues

1. **Database connection errors**: Ensure PostgreSQL is running and accessible
2. **Unique constraint violations**: Use timestamp-based IDs in test data
3. **Foreign key violations**: Clean up related tables in correct order
4. **Timeout errors**: Increase Jest timeout for database-heavy tests

### Debug Commands

```bash
# Run tests with debug output
DEBUG=true npm test

# Run single test with verbose output
npm test -- --verbose auth.controller.test.ts

# Run tests without coverage for faster execution
npm test -- --no-coverage
```

## Contributing

When adding new tests:

1. **Follow the existing structure** and naming conventions
2. **Add tests for both happy path and error cases**
3. **Use the test data factory functions** for consistent test data
4. **Include proper cleanup** in test suites
5. **Update this README** when adding new test categories or significant changes

## Dependencies

- **Jest**: Test framework and test runner
- **Supertest**: HTTP assertions for API testing
- **@types/jest**: TypeScript definitions for Jest
- **ts-jest**: TypeScript preprocessor for Jest

The test suite is configured to work with the existing Prisma database schema and Express.js application structure.
