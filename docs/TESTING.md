# Testing Guide

This document outlines all tests currently implemented in this project and how to run them.

## Test Structure

The project uses **Jest** for both unit and integration testing. All tests are located in `src/__tests__/` and include:

- **Unit Tests**: Test individual functions in isolation (`version.test.ts`)
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

**File**: `src/__tests__/version.test.ts`

Tests the version parsing and tag name creation logic in `src/version.ts`.

### Test Coverage

#### `parseVersion()` Function

**Tags with 'v' prefix:**
- ✅ Parses `v1.2.3` correctly
- ✅ Parses `v2.0.0` correctly
- ✅ Parses `v10.20.30` correctly

**Tags without 'v' prefix:**
- ✅ Parses `1.2.3` correctly
- ✅ Parses `2.0.0` correctly

**Tags with `refs/tags/` prefix:**
- ✅ Parses `refs/tags/v1.2.3` correctly
- ✅ Parses `refs/tags/1.2.3` correctly

**Prerelease versions:**
- ✅ Detects prerelease with v prefix (`v1.2.3-beta.1`)
- ✅ Detects prerelease without v prefix (`1.2.3-alpha`)
- ✅ Detects prerelease with multiple segments (`v2.0.0-rc.1.2`)

**Build metadata:**
- ✅ Parses version with build metadata (`v1.2.3+build.123`)
- ✅ Parses prerelease with build metadata (`v1.2.3-beta.1+build.456`)

**Invalid versions:**
- ✅ Throws error for invalid format
- ✅ Throws error for missing patch version (`v1.2`)
- ✅ Throws error for non-numeric versions (`v1.2.x`)

#### `createTagName()` Function

- ✅ Creates major tag with default prefix (`v2`)
- ✅ Creates major tag with custom prefix (`release-3`)
- ✅ Creates minor tag with default prefix (`v2.3`)
- ✅ Creates minor tag with custom prefix (`release-1.2`)
- ✅ Handles zero versions (`v0`, `v0.0`)
- ✅ Handles large version numbers (`v10.20`)

**Total Unit Tests**: 21 test cases

### Complete Test Case Reference

#### Unit Tests: `parseVersion()` Function

| Test Case | Input | Expected Output |
|-----------|-------|----------------|
| Parse v1.2.3 | `tag: "v1.2.3"` | `{major: 1, minor: 2, patch: 3, isPrerelease: false, original: "v1.2.3"}` |
| Parse v2.0.0 | `tag: "v2.0.0"` | `{major: 2, minor: 0, patch: 0, isPrerelease: false}` |
| Parse v10.20.30 | `tag: "v10.20.30"` | `{major: 10, minor: 20, patch: 30, isPrerelease: false}` |
| Parse 1.2.3 (no v) | `tag: "1.2.3"` | `{major: 1, minor: 2, patch: 3, isPrerelease: false, original: "1.2.3"}` |
| Parse 2.0.0 (no v) | `tag: "2.0.0"` | `{major: 2, minor: 0, patch: 0, isPrerelease: false}` |
| Parse refs/tags/v1.2.3 | `tag: "refs/tags/v1.2.3"` | `{major: 1, minor: 2, patch: 3, isPrerelease: false, original: "refs/tags/v1.2.3"}` |
| Parse refs/tags/1.2.3 | `tag: "refs/tags/1.2.3"` | `{major: 1, minor: 2, patch: 3, isPrerelease: false}` |
| Prerelease v1.2.3-beta.1 | `tag: "v1.2.3-beta.1"` | `{major: 1, minor: 2, patch: 3, isPrerelease: true, prerelease: "beta.1"}` |
| Prerelease 1.2.3-alpha | `tag: "1.2.3-alpha"` | `{major: 1, minor: 2, patch: 3, isPrerelease: true, prerelease: "alpha"}` |
| Prerelease v2.0.0-rc.1.2 | `tag: "v2.0.0-rc.1.2"` | `{major: 2, minor: 0, patch: 0, isPrerelease: true, prerelease: "rc.1.2"}` |
| Build metadata v1.2.3+build.123 | `tag: "v1.2.3+build.123"` | `{major: 1, minor: 2, patch: 3, build: "build.123", isPrerelease: false}` |
| Prerelease + build v1.2.3-beta.1+build.456 | `tag: "v1.2.3-beta.1+build.456"` | `{major: 1, minor: 2, patch: 3, prerelease: "beta.1", build: "build.456", isPrerelease: true}` |
| Invalid format | `tag: "invalid"` | Throws error: "Invalid semantic version format" |
| Missing patch v1.2 | `tag: "v1.2"` | Throws error: "Invalid semantic version format" |
| Non-numeric v1.2.x | `tag: "v1.2.x"` | Throws error: "Invalid semantic version format" |

#### Unit Tests: `createTagName()` Function

| Test Case | Input | Expected Output |
|-----------|-------|----------------|
| Major tag default prefix | `prefix: "v", major: 2` | `"v2"` |
| Major tag custom prefix | `prefix: "release-", major: 3` | `"release-3"` |
| Minor tag default prefix | `prefix: "v", major: 2, minor: 3` | `"v2.3"` |
| Minor tag custom prefix | `prefix: "release-", major: 1, minor: 2` | `"release-1.2"` |
| Zero major version | `prefix: "v", major: 0` | `"v0"` |
| Zero minor version | `prefix: "v", major: 0, minor: 0` | `"v0.0"` |
| Large version numbers | `prefix: "v", major: 10, minor: 20` | `"v10.20"` |

#### Integration Tests: Complete Action Workflow

| Test # | Test Name | Inputs | Expected Outputs | Expected Behavior |
|--------|-----------|--------|------------------|-------------------|
| 1 | Tag with v prefix | `tag: "v1.2.3"`<br>`updateMinor: true`<br>`verbose: true` | `majorTag: "v1"`<br>`minorTag: "v1.2"` | Creates `v1` and `v1.2` tags pointing to `v1.2.3` commit SHA |
| 2 | Tag without v prefix | `tag: "2.0.0"`<br>`updateMinor: true` | `majorTag: "v2"`<br>`minorTag: "v2.0"` | Creates `v2` and `v2.0` tags pointing to `2.0.0` commit SHA |
| 3 | Different refTag | `tag: "3.0.0"`<br>`refTag: "HEAD"`<br>`updateMinor: false` | `majorTag: "v3"` | Creates `v3` tag pointing to HEAD commit (not `3.0.0` tag commit) |
| 4 | Prerelease skipping | `tag: "v4.0.0-beta.1"`<br>`updateMinor: false`<br>`ignorePrerelease: true` | Action fails | `setFailed()` called, no tags created |
| 5 | Custom prefix | `tag: "5.1.0"`<br>`prefix: "release-"`<br>`updateMinor: true` | `majorTag: "release-5"`<br>`minorTag: "release-5.1"` | Creates `release-5` and `release-5.1` tags with custom prefix |
| 6 | Major tag only | `tag: "v6.1.0"`<br>`updateMinor: false` | `majorTag: "v6"` | Creates only `v6` tag, `v6.1` tag NOT created |
| 7 | Update existing tag | `tag: "v7.1.0"`<br>`updateMinor: false`<br>(v7 tag already exists pointing to v7.0.0) | `majorTag: "v7"` | Updates existing `v7` tag to point to `v7.1.0` commit (force update) |
| 8 | Prerelease allowed | `tag: "v8.0.0-rc.1"`<br>`ignorePrerelease: false`<br>`updateMinor: false` | `majorTag: "v8"` | Creates `v8` tag for prerelease version when `ignorePrerelease: false` |
| 9 | RefTag different commit | `tag: "v9.0.0"`<br>`refTag: "HEAD"`<br>`updateMinor: false`<br>(v9.0.0 points to previous commit, HEAD is newer) | `majorTag: "v9"` | Creates `v9` tag pointing to HEAD commit (different from `v9.0.0` tag commit) |
| 10 | Zero versions | `tag: "v0.1.0"`<br>`updateMinor: true` | `majorTag: "v0"`<br>`minorTag: "v0.1"` | Creates `v0` and `v0.1` tags for zero major version |
| 11 | Output verification | `tag: "v11.2.3"`<br>`updateMinor: true` | `majorTag: "v11"`<br>`minorTag: "v11.2"` | Verifies `setOutput()` called with correct values for both outputs |

## Integration Tests

**File**: `src/__tests__/integration.test.ts`

Tests the complete action workflow using isolated temporary git repositories. These tests:

- Create temporary git repositories for each test run
- Mock `@actions/core` to capture outputs and control logging
- Mock `pushTag` to prevent actual remote pushes (tests verify locally)
- Use real git CLI commands to verify tag creation and behavior
- Clean up temporary repositories after tests complete

### Test Scenarios

#### Test 1: Tag with v prefix
- **Input**: Tag `v1.2.3` with `updateMinor: true`
- **Verifies**:
  - Major tag `v1` is created pointing to `v1.2.3` commit
  - Minor tag `v1.2` is created pointing to `v1.2.3` commit
  - Outputs `majorTag` and `minorTag` are correctly set

#### Test 2: Tag without v prefix
- **Input**: Tag `2.0.0` with `updateMinor: true`
- **Verifies**:
  - Action handles tags without 'v' prefix
  - Major tag `v2` and minor tag `v2.0` are created correctly

#### Test 3: Different refTag
- **Input**: Tag `3.0.0` with `refTag: "HEAD"` and `updateMinor: false`
- **Verifies**:
  - Floating tags point to `HEAD` commit, not the tag commit
  - Only major tag is created (updateMinor=false)

#### Test 4: Prerelease skipping
- **Input**: Tag `v4.0.0-beta.1` with `ignorePrerelease: true`
- **Verifies**:
  - Action correctly identifies prerelease version
  - Action fails with appropriate error message
  - No tags are created when prerelease is ignored

#### Test 5: Custom prefix
- **Input**: Tag `5.1.0` with `prefix: "release-"` and `updateMinor: true`
- **Verifies**:
  - Output tags use custom prefix (`release-5`, `release-5.1`)
  - Version parsing works with tags without prefix
  - Custom prefix is applied to output tag names

#### Test 6: Major tag only
- **Input**: Tag `v6.0.0` with `updateMinor: false`
- **Verifies**:
  - Only major tag is created (`v6`)
  - Minor tag is NOT created
  - Output only includes `majorTag`

#### Test 7: Update existing tag
- **Input**: Tag `v7.0.0`, update to point to new commit
- **Verifies**:
  - Existing tags are updated (not duplicated)
  - Tags correctly point to new commit SHA
  - Action handles tag updates gracefully

#### Test 8: Verbose logging
- **Input**: Tag `v8.0.0` with `verbose: true`
- **Verifies**:
  - Debug logging is enabled
  - `ACTIONS_STEP_DEBUG` environment variable is set
  - Detailed debug output is generated

#### Test 9: Output verification
- **Input**: Various tags with different configurations
- **Verifies**:
  - `majorTag` output is always set correctly
  - `minorTag` output is set only when `updateMinor: true`
  - Output values match created tag names

#### Test 10: Error handling
- **Input**: Invalid inputs or git errors
- **Verifies**:
  - Action handles errors gracefully
  - Appropriate error messages are provided
  - `setFailed` is called with meaningful messages

#### Test 11: Complex version scenarios
- **Input**: Tags with various version formats and edge cases
- **Verifies**:
  - Handles custom prefix tags (e.g., `release-5.1.0`)
  - Handles version extraction from complex tag names
  - Works with all supported semver formats

**Total Integration Tests**: 11 test scenarios

### Integration Test Architecture

#### Isolation

Each test run creates a fresh temporary git repository:
- Uses `fs.mkdtempSync()` to create isolated directories
- Each test operates in its own git repository
- No interference between tests or with the main repository

#### Git Operations

Tests use real git CLI commands:
- `git init` - Initialize repositories
- `git tag` - Create tags
- `git rev-parse` - Verify commit SHAs
- `git config` - Configure git for tests

#### Mocking Strategy

**Mocked**:
- `@actions/core` - Captures outputs and controls logging
- `pushTag()` - Prevents actual remote pushes (verified locally)

**Real**:
- Git CLI commands (within temporary repositories)
- Version parsing logic
- Tag creation and verification
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
   export INPUT_TAG=v1.2.3
   export INPUT_UPDATEMINOR=true
   export INPUT_REFTAG=v1.2.3
   export INPUT_IGNOREPRERELEASE=true
   export INPUT_VERBOSE=false
   ```

3. **Run the action**:
   ```bash
   node dist/index.js
   ```

**Note**: Full integration tests with git push operations require a git repository with remote access and are best tested in CI/CD.

## Test Coverage Goals

Current coverage targets:
- **Unit Tests**: 100% coverage of `version.ts` functions
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
2. Use `createTestTag()` helper for tag setup
3. Set `process.env.INPUT_*` variables
4. Call `runAction()` (imported from `../index`)
5. Verify results using `getTagSha()` helper
6. Add clear console.log messages for visibility

### Test Best Practices

- ✅ One assertion per concept
- ✅ Use descriptive test names
- ✅ Clean up after tests (handled automatically)
- ✅ Mock external dependencies
- ✅ Test both success and failure cases
- ✅ Verify outputs, not just that code runs
- ✅ Use helper functions to reduce duplication

