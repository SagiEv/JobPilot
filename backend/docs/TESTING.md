# Backend Testing Guide

This document outlines the testing strategy, tools, and flow for the JobPilot backend. We use **Jest** as our testing framework and aim to maintain comprehensive coverage across all core backend layers.

## Technology Stack
- **Test Runner & Assertion Library**: [Jest](https://jestjs.io/)
- **Mocking**: Jest's built-in mocking capabilities (`jest.mock()`, `jest.fn()`)
- **Coverage**: Istanbul (integrated with Jest)

## Architecture & Test Flow

Our test suite adheres strictly to the **AAA Pattern (Arrange, Act, Assert)**:

1. **Arrange**: Set up the initial state and mock any dependencies (e.g., database clients, external APIs).
2. **Act**: Invoke the function or endpoint being tested.
3. **Assert**: Verify the returned outputs and ensure the mocked dependencies were called with the correct arguments.

### Testing Layers

We use isolated unit testing across our architectural layers:

#### 1. Controllers (`tests/controllers/`)
Controller tests focus on request validation, HTTP status codes, and JSON response formatting. 
- **Mocking**: The entire Service layer (`services/`) is mocked.
- **Goal**: Ensure that valid requests map to the correct service methods, and invalid requests (or thrown service errors) are handled by returning appropriate `40x` or `500` HTTP statuses.

#### 2. Services (`tests/services/`)
Service tests focus exclusively on business logic and orchestration.
- **Mocking**: Data access layers (repositories or global Supabase clients) and external utilities (e.g., Axios for AI APIs, parsing libraries) are mocked out.
- **Goal**: Ensure data is processed correctly, errors are caught, and the correct database queries are initiated.

#### 3. Middleware & Utils (`tests/middleware/`, `tests/utils/`)
These tests check pure functions and Express middleware components (e.g., JWT extraction, role authorization). 
- **Goal**: Validate specific atomic pieces of logic, like verifying an encryption algorithm or testing error handlers.

---

## The Global Environment (`tests/setup.js`)

To prevent tests from mutating external state or failing on initialization, our Jest configuration (`jest.config.js`) executes `tests/setup.js` *before* any test modules load.

This setup file is responsible for two critical things:
1. **Environment Variables**: Overriding variables like `SUPABASE_URL` and `GROQ_API_KEY` with safe dummy strings.
2. **Global Database Mock**: Mocking `../supabaseClient` to return a fully stubbed, chainable interface (e.g., `.from().select().eq().single()`). This prevents modules that require the database upon initialization from crashing, and provides a unified, reset-able database mock across all test suites.

---

## Running the Tests

You can run the tests using standard npm scripts from within the `backend/` directory.

### Standard Test Run
Runs all tests across the backend efficiently:
```bash
npm test
```

### Coverage Report
Runs all tests and generates a comprehensive code coverage report:
```bash
npm run test:coverage
```
After running this command, an interactive HTML report will be generated. You can view it by opening:
`backend/coverage/lcov-report/index.html` in your web browser.

### Running a Specific Test File
To run a specific test suite or test file, simply pass the path to Jest:
```bash
npx jest tests/services/user.service.test.js
```

---

## Writing a New Test

When adding new backend functionality, follow these guidelines to ensure consistency:

1. **Location**: Create the test file alongside the others in the `backend/tests/` directory mapping the structure of the actual code (e.g., `tests/services/myService.test.js`).
2. **Helpers**: Use the shared utility functions found in `tests/helpers/factories.js`. For example, use `buildReqRes()` to quickly scaffold mocked Express request and response objects for controller testing.
3. **Mocking Supabase**: Because the global Supabase client is mocked in `setup.js`, you do not need to locally mock `supabaseClient`. You can simply import it in your test file and override the resolved values for specific chains:
```javascript
const supabase = require('../../supabaseClient');

// Override the global mock to return specific data for this test
supabase.__chain.then.mockImplementationOnce((resolve) => resolve({ 
    data: { id: 1, name: 'Job' }, 
    error: null 
}));
```
