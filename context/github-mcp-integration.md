# Git Command Line Integration Context

## Repository Information
- **Organization**: Axon-Shield
- **Repository**: DNSWatcher
- **URL**: https://github.com/Axon-Shield/DNSWatcher
- **Status**: ✅ Fully deployed and operational
- **Branch**: main (production-ready)
- **Commits**: 13 commits with conventional commit messages
- **Access**: Fine-grained permissions configured

## Git Command Line Usage (PRIMARY)

### Basic Git Operations
- `git add .` - Stage all changes
- `git commit -m "message"` - Commit with conventional message
- `git push origin main` - Push to GitHub repository
- `git status` - Check repository status
- `git log --oneline` - View commit history
- `git pull origin main` - Pull latest changes

### Commit Workflow
**For every feature implementation**:
1. **Implement the feature** (frontend/backend/database)
2. **Test the implementation**
3. **Stage changes**: `git add .`
4. **Commit with descriptive message**: `git commit -m "feat(ui): add new component"`
5. **Push to GitHub**: `git push origin main`

## GitHub MCP Tools (ADVANCED OPERATIONS ONLY)

### Repository Management
- `mcp_github_create_repository` - Create new repositories
- `mcp_github_fork_repository` - Fork existing repositories
- `mcp_github_get_file_contents` - Read file contents from GitHub
- `mcp_github_create_or_update_file` - Create/update files in GitHub
- `mcp_github_delete_file` - Delete files from GitHub

### Branch Management
- `mcp_github_create_branch` - Create new branches
- `mcp_github_list_branches` - List repository branches
- `mcp_github_update_pull_request_branch` - Update PR branches

### Pull Requests
- `mcp_github_create_pull_request` - Create new pull requests
- `mcp_github_update_pull_request` - Update existing pull requests
- `mcp_github_merge_pull_request` - Merge pull requests
- `mcp_github_pull_request_read` - Read PR details, diffs, files, reviews
- `mcp_github_pull_request_review_write` - Create/submit/delete reviews
- `mcp_github_add_comment_to_pending_review` - Add review comments

### Issues Management
- `mcp_github_create_issue` - Create new issues
- `mcp_github_update_issue` - Update existing issues
- `mcp_github_get_issue` - Get issue details
- `mcp_github_list_issues` - List repository issues
- `mcp_github_add_issue_comment` - Add comments to issues

### Search & Discovery
- `mcp_github_search_code` - Search code across GitHub
- `mcp_github_search_issues` - Search issues
- `mcp_github_search_pull_requests` - Search pull requests
- `mcp_github_search_repositories` - Search repositories
- `mcp_github_search_users` - Search users

### Commits & History
- `mcp_github_list_commits` - List repository commits
- `mcp_github_get_commit` - Get commit details with diffs

### Labels & Organization
- `mcp_github_list_label` - List repository labels
- `mcp_github_get_label` - Get specific label details
- `mcp_github_list_tags` - List repository tags
- `mcp_github_get_tag` - Get tag details

### Releases
- `mcp_github_list_releases` - List repository releases
- `mcp_github_get_latest_release` - Get latest release
- `mcp_github_get_release_by_tag` - Get release by tag

### User & Team Management
- `mcp_github_get_me` - Get authenticated user details
- `mcp_github_get_teams` - Get user's teams
- `mcp_github_get_team_members` - Get team members

### Commit Message Conventions
- **feat(ui)**: Frontend UI components and pages
- **feat(api)**: Backend API endpoints and Edge Functions
- **feat(db)**: Database schema changes and migrations
- **feat(dns)**: DNS monitoring and SOA detection features
- **feat(email)**: Email notification and alert systems
- **fix(ui)**: Frontend bug fixes
- **fix(api)**: Backend bug fixes
- **fix(db)**: Database bug fixes
- **docs**: Documentation updates
- **refactor**: Code refactoring and cleanup
- **chore**: Maintenance tasks

### Branch Strategy
- **main**: Production-ready code
- **develop**: Development branch for features
- **feature/**: Feature branches (e.g., `feature/user-dashboard`)
- **fix/**: Bug fix branches (e.g., `fix/dns-monitoring-error`)

### Pull Request Workflow
1. **Create feature branch** with `mcp_github_create_branch`
2. **Implement feature** with git commits
3. **Create pull request** with `mcp_github_create_pull_request`
4. **Review and merge** with `mcp_github_merge_pull_request`

### File Management
- **Use git command line** for committing changes (`git add .`, `git commit -m "message"`, `git push`)
- **Use GitHub MCP** only for advanced operations (pull requests, issues, searches)
- **Use local read_file** for reading files, NOT GitHub MCP

### Issue Tracking
- **Create issues** for bugs and feature requests using GitHub MCP
- **Link commits** to issues in commit messages
- **Use labels** for categorization
- **Close issues** automatically with commit messages

## Context-Aware GitHub Usage

### When implementing features:
1. **Frontend features** → Commit with `feat(ui):` prefix
2. **Backend features** → Commit with `feat(api):` prefix
3. **Database changes** → Commit with `feat(db):` prefix
4. **DNS features** → Commit with `feat(dns):` prefix
5. **Email features** → Commit with `feat(email):` prefix

### When fixing bugs:
1. **Identify the bug** and create issue if needed
2. **Fix the bug** in appropriate area
3. **Commit with `fix:`** prefix and reference issue
4. **Test the fix** thoroughly

### When refactoring:
1. **Identify refactoring needs**
2. **Implement improvements**
3. **Commit with `refactor:`** prefix
4. **Update documentation** if needed

### When updating documentation:
1. **Update relevant docs** in docs/ folder
2. **Update context files** in context/ folder
3. **Commit with `docs:`** prefix
4. **Ensure accuracy** of information

## Current Repository Status

### Commit History
1. **feat: initialize DNSWatcher DNS security monitoring application** - Initial README
2. **feat: add core project configuration and dependencies** - Project setup
3. **feat(app): create core application structure and homepage** - App structure
4. **feat(ui): add shadcn/ui components and registration form** - UI components
5. **feat(api): implement Supabase integration and API routes** - Backend integration
6. **docs: add comprehensive Supabase setup guide and database schema** - Documentation
7. **feat(git): integrate GitHub MCP with context-aware commit patterns** - GitHub integration
8. **docs: update project overview to reflect GitHub repository deployment** - Context update

### File Structure
- **src/**: Complete Next.js application
- **docs/**: Setup guides and documentation
- **context/**: AI context files for development
- **README.md**: Project overview and instructions
- **.cursorrules**: Context-aware development rules

### Development Workflow Integration

### Feature Development
1. **Create feature branch** from main
2. **Implement feature** with proper commits
3. **Test thoroughly** before PR
4. **Create pull request** with detailed description
5. **Review and merge** after approval
6. **Delete feature branch** after merge

### Bug Fix Workflow
1. **Create issue** for bug tracking
2. **Create fix branch** from main
3. **Implement fix** with test
4. **Commit with issue reference**
5. **Create pull request** linking issue
6. **Review and merge** fix
7. **Close issue** automatically

### Release Process
1. **Create release branch** from main
2. **Update version numbers**
3. **Update changelog**
4. **Create release** with tag
5. **Deploy to production**
6. **Monitor deployment**

## Best Practices

### Commit Messages
- **Use conventional commits** format
- **Be descriptive** and specific
- **Reference issues** when applicable
- **Keep messages concise** but informative
- **Use present tense** (e.g., "Add feature" not "Added feature")

### Pull Requests
- **Write clear descriptions** of changes
- **Include screenshots** for UI changes
- **Link related issues**
- **Request appropriate reviewers**
- **Keep PRs focused** on single features

### Code Review
- **Review thoroughly** before merging
- **Test changes** locally
- **Check for security issues**
- **Ensure documentation** is updated
- **Verify tests pass**

### Issue Management
- **Use descriptive titles**
- **Include reproduction steps** for bugs
- **Add labels** for categorization
- **Assign to appropriate team members**
- **Close issues** when resolved

## Integration with DNSWatcher Development

### Automatic Workflows
- **Feature commits** automatically trigger appropriate actions
- **Bug fixes** link to issues and close them
- **Documentation updates** maintain accuracy
- **Release process** follows standard workflow

### Quality Assurance
- **All commits** follow conventional commit format
- **Pull requests** include proper descriptions
- **Issues** are properly tracked and closed
- **Releases** are properly tagged and documented

### Team Collaboration
- **Clear commit history** for team understanding
- **Proper issue tracking** for bug management
- **Effective pull request** workflow for code review
- **Organized repository** structure for maintainability

## Current Status
- ✅ **Repository Created**: Axon-Shield/DNSWatcher
- ✅ **Initial Commits**: 13 commits with proper messages
- ✅ **Documentation**: Complete setup and development guides
- ✅ **Context Files**: AI understanding files created
- ✅ **Development Rules**: Context-aware .cursorrules configured
- ✅ **Git Integration**: Git command line for commits, GitHub MCP for advanced operations
- ✅ **Ready for Development**: All systems operational