# Testing Guide

This document outlines all tests currently implemented in this project and how to run them.

## Test Structure

The project uses **Jest** for both unit and integration testing. All tests are located in `src/__tests__/` and include:

- **Unit Tests**: Test individual functions in isolation (`logger.test.ts`)
- **Integration Tests**: Test the full action workflow with real git operations (`integration.test.ts`)

## Running Tests

### All Tests

Run all tests (unit + integration):

```bash
npm test
```

### Watch Mode

Run tests in watch mode (useful during development):

```bash
npm run test:watch
```

### Coverage Report

Generate a test coverage report:

```bash
npm run test:coverage
```

This generates:
- Text output in the terminal
- HTML report in `coverage/` directory
- LCOV report for CI integration

## Unit Tests

**File**: `src/__tests__/logger.test.ts`

Tests the Logger utility class that provides consistent logging across the action.

### Test Coverage

#### Logger Class

**With verbose disabled:**
- ✅ Logs info messages correctly
- ✅ Logs warning messages correctly
- ✅ Logs error messages correctly
- ✅ Logs debug messages using `core.debug()` when verbose is false
- ✅ Exposes verbose property correctly

**With verbose enabled:**
- ✅ Logs debug messages using `core.info()` with `[DEBUG]` prefix when verbose is true
- ✅ Exposes verbose property correctly

**Default constructor:**
- ✅ Defaults to verbose=false when no argument provided

**Total Unit Tests**: 7 test cases

### Complete Test Case Reference

#### Unit Tests: Logger Class

| Test Case | Input | Expected Behavior |
|-----------|-------|-------------------|
| Info message | `logger.info('Test message')` | Calls `core.info()` with message |
| Warning message | `logger.warning('Warning message')` | Calls `core.warning()` with message |
| Error message | `logger.error('Error message')` | Calls `core.error()` with message |
| Debug (verbose=false) | `logger.debug('Debug message')` with `verbose: false` | Calls `core.debug()` with message |
| Debug (verbose=true) | `logger.debug('Debug message')` with `verbose: true` | Calls `core.info()` with `[DEBUG] Debug message` |
| Verbose property | `logger.verbose` | Returns the verbose boolean value |
| Default constructor | `new Logger()` | Creates logger with `verbose: false` |

## Integration Tests

**File**: `src/__tests__/integration.test.ts`

Tests the complete action workflow using isolated temporary git repositories. These tests:

- Create temporary git repositories for each test run
- Mock `@actions/core` to capture outputs and control logging
- Use real git CLI commands to verify commit information retrieval
- Clean up temporary repositories after tests complete

### Test Scenarios

#### Test 1: Get commit info for HEAD (offset 0)
- **Input**: `offset: '0'`, `verbose: false`
- **Verifies**:
  - Retrieves information about the current HEAD commit
  - All outputs are set correctly (sha, shortSha, message, author, authorEmail, date, dateISO)
  - SHA is 40 characters, short SHA is 7 characters
  - All outputs are non-empty

#### Test 2: Get commit info for HEAD~1 (offset 1)
- **Input**: `offset: '1'`, `verbose: false`
- **Verifies**:
  - Retrieves information about the previous commit (HEAD~1)
  - All outputs match expected values from git
  - SHA is different from HEAD commit

#### Test 3: Get commit info for HEAD~2 (offset 2)
- **Input**: `offset: '2'`, `verbose: false`
- **Verifies**:
  - Retrieves information about two commits before HEAD
  - All outputs are correct
  - SHA is different from HEAD and HEAD~1

#### Test 4: Get commit info with negative offset (-1)
- **Input**: `offset: '-1'`, `verbose: false`
- **Verifies**:
  - Negative offsets are converted to absolute value
  - `-1` behaves the same as `1` (both resolve to HEAD~1)
  - All outputs are correct

#### Test 5: Verbose logging
- **Input**: `offset: '0'`, `verbose: true`
- **Verifies**:
  - Verbose logging is enabled
  - `ACTIONS_STEP_DEBUG` environment variable is set
  - Debug output is generated
  - All outputs are still set correctly

#### Test 6: Error handling for invalid offset
- **Input**: `offset: 'invalid'`
- **Verifies**:
  - Action fails with clear error message
  - `setFailed()` is called with appropriate message
  - Error message indicates invalid offset value

#### Test 7: Error handling for offset exceeding history
- **Input**: `offset: '1000'` (exceeds commit history)
- **Verifies**:
  - Action fails with clear error message
  - `setFailed()` is called
  - Error message indicates commit not found

#### Test 8: Default offset (0) when not provided
- **Input**: No offset provided (defaults to '0')
- **Verifies**:
  - Defaults to offset 0 (HEAD)
  - Retrieves HEAD commit information
  - All outputs are set correctly

**Total Integration Tests**: 8 test scenarios

### Integration Test Architecture

#### Isolation

Each test run creates a fresh temporary git repository:
- Uses `fs.mkdtempSync()` to create isolated directories
- Each test operates in its own git repository
- No interference between tests or with the main repository

#### Git Operations

Tests use real git CLI commands:
- `git init` - Initialize repositories
- `git commit` - Create commits for testing
- `git log` - Retrieve commit information
- `git rev-parse` - Verify commit SHAs
- `git config` - Configure git for tests

#### Mocking Strategy

**Mocked**:
- `@actions/core` - Captures outputs and controls logging

**Real**:
- Git CLI commands (within temporary repositories)
- Commit information retrieval logic
- File system operations

## Test Environment

### Local Development

Tests run locally using:
- Node.js 20+
- Jest test runner
- Real git CLI (must be installed)
- Temporary file system directories

### CI/CD

Tests run in GitHub Actions via `.github/workflows/test.yml`:
- Uses `ubuntu-latest` runner
- Node.js 20
- Full git history (`fetch-depth: 0`)
- Same test execution as local (`npm test`)

### Local Workflow Testing with Act

Test the GitHub Actions workflows locally using `act`:

```bash
# Run test workflow
npm run test:act

# Run test workflow with verbose output
npm run test:act:verbose

# Run CI workflow (includes lint and test)
npm run test:act:ci

# Run just the lint job via act
npm run lint:act
```

See [DEVELOPMENT.md](./DEVELOPMENT.md) for more details on using `act`.

## Manual Testing

For manual testing of the action:

1. **Build the action**:
   ```bash
   npm run build
   ```

2. **Set environment variables** (GitHub Actions converts camelCase inputs to uppercase):
   ```bash
   export INPUT_OFFSET=0
   export INPUT_VERBOSE=false
   ```

3. **Run the action**:
   ```bash
   node dist/index.js
   ```

**Note**: Full integration tests with git operations require a git repository and are best tested in CI/CD or using the integration test suite.

## Test Coverage Goals

Current coverage targets:
- **Unit Tests**: 100% coverage of `logger.ts`
- **Integration Tests**: Cover all major use cases and edge cases
- **Code Coverage**: Aim for >80% overall coverage

View coverage reports:
```bash
npm run test:coverage
```

HTML report is available at `coverage/index.html`.

## Troubleshooting Tests

### Tests Fail Locally

1. **Check git is installed**:
   ```bash
   git --version
   ```

2. **Verify Node.js version**:
   ```bash
   node --version  # Should be 20+
   ```

3. **Clear Jest cache**:
   ```bash
   npm test -- --clearCache
   ```

4. **Reinstall dependencies**:
   ```bash
   rm -rf node_modules && npm install
   ```

### Integration Test Failures

If integration tests fail:
- Check that temporary directories can be created (permissions)
- Verify git is properly configured (user.name and user.email)
- Ensure no processes are locking temporary files
- Check disk space (tests create temporary git repositories)

### Act Test Failures

If `act` tests fail:
- Verify `act` is installed: `act --version`
- Check `~/.actrc` configuration file exists
- Ensure Docker is running
- Verify workflow event files exist in `.github/workflows/.act/`

## Writing New Tests

### Adding Unit Tests

1. Create or update test file in `src/__tests__/`
2. Follow existing test patterns
3. Mock external dependencies (`@actions/core`)
4. Use descriptive test names
5. Add tests to appropriate test suite

### Adding Integration Tests

1. Add test case to `integration.test.ts`
2. Use `createCommit()` helper for commit setup
3. Set `process.env.INPUT_*` variables
4. Call `runAction()` (imported from `../index`)
5. Verify results using `getCommitInfoGit()` helper
6. Add clear console.log messages for visibility

### Test Best Practices

- ✅ One assertion per concept
- ✅ Use descriptive test names
- ✅ Clean up after tests (handled automatically)
- ✅ Mock external dependencies
- ✅ Test both success and failure cases
- ✅ Verify outputs, not just that code runs
- ✅ Use helper functions to reduce duplication
