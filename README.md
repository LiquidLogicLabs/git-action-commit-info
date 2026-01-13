# Git Commit Info Action

[![CI](https://github.com/LiquidLogicLabs/git-action-commit-info/actions/workflows/ci.yml/badge.svg)](https://github.com/LiquidLogicLabs/git-action-commit-info/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

A simple GitHub Action that retrieves commit information (SHA, message, author, date) using an offset from HEAD. This action uses only local git commands and provides detailed commit metadata.

## Features

- ✅ **Simple offset-based lookup**: Get commit info using an offset from HEAD (0 = HEAD, 1 = HEAD~1, etc.)
- ✅ **Comprehensive commit info**: Retrieves full SHA, short SHA, commit message, author name, author email, and commit date
- ✅ **Backwards-only navigation**: Always goes backwards in history from HEAD (HEAD~X format)
- ✅ **Forgiving input**: Negative offsets are accepted but converted to absolute value for convenience
- ✅ **Local git commands only**: Uses only local git commands (no remote operations)
- ✅ **Verbose logging**: Optional verbose debug logging for troubleshooting
- ✅ **TypeScript implementation**: Built with TypeScript for type safety and reliability

## Usage

### Basic Example - Get Current Commit Info (HEAD)

```yaml
- name: Get Commit Info
  uses: LiquidLogicLabs/git-action-commit-info@v1
  with:
    offset: '0'  # 0 means HEAD (default)
```

This retrieves information about the current HEAD commit and sets outputs:
- `sha`: Full commit SHA (40 characters)
- `shortSha`: Short commit SHA (7 characters)
- `message`: Commit message (first line/subject)
- `messageRaw`: Full commit message (includes all lines, preserves newlines)
- `author`: Author name
- `authorEmail`: Author email address
- `date`: Commit date (ISO format)
- `dateISO`: Commit date in ISO 8601 format

### Get Previous Commit Info (HEAD~1)

```yaml
- name: Get Previous Commit Info
  uses: LiquidLogicLabs/git-action-commit-info@v1
  with:
    offset: '1'  # One commit before HEAD
  id: prev-commit
```

### Get Commit Info with Offset

```yaml
- name: Get Commit Info
  uses: LiquidLogicLabs/git-action-commit-info@v1
  with:
    offset: '2'  # Two commits before HEAD
  id: commit-info

- name: Use Commit Info
  run: |
    echo "Commit SHA: ${{ steps.commit-info.outputs.sha }}"
    echo "Short SHA: ${{ steps.commit-info.outputs.shortSha }}"
    echo "Message: ${{ steps.commit-info.outputs.message }}"
    echo "Full Message: ${{ steps.commit-info.outputs.messageRaw }}"
    echo "Author: ${{ steps.commit-info.outputs.author }}"
```

### With Verbose Debug Logging

```yaml
- name: Get Commit Info
  uses: LiquidLogicLabs/git-action-commit-info@v1
  with:
    offset: '0'
    verbose: true  # Enables detailed debug logging
```

### Using Outputs in Workflow

```yaml
- name: Checkout code
  uses: actions/checkout@v4
  with:
    fetch-depth: 0  # Full history needed for offsets

- name: Get Commit Info
  uses: LiquidLogicLabs/git-action-commit-info@v1
  with:
    offset: '1'  # Previous commit
  id: commit-info

- name: Display Commit Info
  run: |
    echo "Full SHA: ${{ steps.commit-info.outputs.sha }}"
    echo "Short SHA: ${{ steps.commit-info.outputs.shortSha }}"
    echo "Message: ${{ steps.commit-info.outputs.message }}"
    echo "Full Message: ${{ steps.commit-info.outputs.messageRaw }}"
    echo "Author: ${{ steps.commit-info.outputs.author }} <${{ steps.commit-info.outputs.authorEmail }}>"
    echo "Date: ${{ steps.commit-info.outputs.dateISO }}"

- name: Use Commit SHA in Another Step
  run: |
    # Use the commit SHA for something
    COMMIT_SHA="${{ steps.commit-info.outputs.sha }}"
    echo "Working with commit: $COMMIT_SHA"
```

### Negative Offset Support (Convenience Feature)

```yaml
- name: Get Commit Info with Negative Offset
  uses: LiquidLogicLabs/git-action-commit-info@v1
  with:
    offset: '-1'  # Negative offsets are converted to absolute value (same as 1)
```

**Note**: The offset always goes backwards from HEAD. Negative offsets are accepted as a convenience feature - if you accidentally use a negative number, it will be converted to its absolute value. For example, `offset: '-1'` becomes `offset: '1'` (both resolve to HEAD~1). You cannot go "forward" in commit history.

## Inputs

| Input | Description | Required | Default |
| ------- | ------------- | ---------- | --------- |
| `offset` | Offset from HEAD to look up. Always goes backwards in history: 0 = HEAD, 1 = HEAD~1, 2 = HEAD~2, etc. Negative offsets are accepted but converted to absolute value (e.g., -1 becomes 1). | No | `'0'` |
| `verbose` | Enable verbose debug logging. Sets ACTIONS_STEP_DEBUG=true environment variable and enables detailed debug output | No | `'false'` |

## Outputs

| Output | Description |
| -------- | ------------- |
| `sha` | Full commit SHA (40 characters) |
| `shortSha` | Short commit SHA (7 characters) |
| `message` | Commit message (first line/subject) |
| `messageRaw` | Full commit message (includes all lines, preserves newlines) |
| `author` | Author name |
| `authorEmail` | Author email address |
| `date` | Commit date (ISO format) |
| `dateISO` | Commit date in ISO 8601 format |

## Examples

### Get Current Commit Info

```yaml
- uses: LiquidLogicLabs/git-action-commit-info@v1
  # offset defaults to 0 (HEAD)
```

### Get Previous Commit Info

```yaml
- uses: LiquidLogicLabs/git-action-commit-info@v1
  with:
    offset: '1'  # HEAD~1
```

### Get Commit Info for Comparison

```yaml
- name: Get Previous Commit
  uses: LiquidLogicLabs/git-action-commit-info@v1
  with:
    offset: '1'
  id: prev-commit

- name: Get Current Commit
  uses: LiquidLogicLabs/git-action-commit-info@v1
  with:
    offset: '0'
  id: current-commit

- name: Compare Commits
  run: |
    echo "Previous: ${{ steps.prev-commit.outputs.shortSha }} - ${{ steps.prev-commit.outputs.message }}"
    echo "Current: ${{ steps.current-commit.outputs.shortSha }} - ${{ steps.current-commit.outputs.message }}"
```

### Error Handling

If the offset exceeds the commit history, the action will fail with a clear error message:

```yaml
- name: Get Commit Info (may fail)
  uses: LiquidLogicLabs/git-action-commit-info@v1
  with:
    offset: '1000'  # Will fail if repository doesn't have 1000 commits
  continue-on-error: true
```

## How It Works

1. **Offset Calculation**: The action calculates the git reference from the offset (e.g., `HEAD~1` for offset 1, `HEAD` for offset 0)
2. **Git Command Execution**: Uses `git log -1` with a custom format to retrieve all commit information in one call
3. **Output Parsing**: Parses the git log output and extracts commit metadata
4. **Output Setting**: Sets all outputs (sha, shortSha, message, author, authorEmail, date, dateISO) for use in subsequent workflow steps

## Offset Behavior

The offset **always goes backwards** from HEAD in the commit history:

- **offset=0**: HEAD (current commit)
- **offset=1**: HEAD~1 (one commit before HEAD)
- **offset=2**: HEAD~2 (two commits before HEAD)
- **offset=3**: HEAD~3 (three commits before HEAD)

**Negative offsets**: Negative offsets are accepted for convenience but are converted to their absolute value:
- **offset=-1**: Converted to 1 → HEAD~1 (same as offset=1)
- **offset=-2**: Converted to 2 → HEAD~2 (same as offset=2)

**Important**: Git doesn't support going "forward" in history. The offset always navigates backwards from HEAD. Negative offsets are provided as a convenience feature - if you accidentally use a negative number, it will still work by converting it to the equivalent positive offset.

## Error Handling

The action will fail with clear error messages in the following cases:

- **Invalid offset**: If the offset is not a valid integer
- **Offset exceeds history**: If the offset is larger than the number of commits in the repository
- **Git command failure**: If git commands fail for any other reason

## Requirements

- Git must be available in the runner environment (standard in GitHub Actions)
- The repository must have at least one commit
- For offsets greater than 0, `fetch-depth: 0` may be required in the checkout step to get full history:

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0  # Full history needed for offsets > 0
```

## Logging

### Basic Logging (Always Enabled)

The action provides informative logging at each step:

- Offset calculation
- Commit information retrieval
- Summary of retrieved commit info

### Verbose Debug Logging

Enable verbose logging by setting `verbose: true`:

```yaml
- uses: LiquidLogicLabs/git-action-commit-info@v1
  with:
    offset: '0'
    verbose: true
```

This enables:

- Detailed debug output via `core.debug()`
- Sets `ACTIONS_STEP_DEBUG=true` for GitHub Actions debug logging
- Shows git command outputs and intermediate steps

## Security

- The action uses only local git commands (no remote operations)
- No secrets or sensitive data are accessed
- All git commands are executed with proper error handling
- The action validates all inputs before execution

## License

This project is licensed under the MIT License.

## Contributing

Contributions are welcome! Please see the [Development Guide](docs/DEVELOPMENT.md) for information on how to contribute.