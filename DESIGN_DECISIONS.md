# Claude Dev Container - Design Decisions

## Original Requirements

### Project Goal
I'm on a minipc at home behind Tailscale (also on phone). I want to go on my phone, select a project I'm working on (maybe through my GitHub repositories), or start a new project and add it to my GitHub, and kick off things easily.

### Key Requirements
1. **Beads for issue tracking**: Using Steve Yegge's beads (https://github.com/steveyegge/beads)
   - Requires CLI install
   - Usually need to run `bd doctor --fix` on setup
   - Set up beads sync branch: https://github.com/steveyegge/beads/blob/main/docs/PROTECTED_BRANCHES.md
   - Install instructions: https://github.com/steveyegge/beads/blob/main/docs/INSTALLING.md (includes /commands and marketplace)

2. **Containerization**: Run Claude in yolo mode in containers
   - Nothing gets broken outside project repository
   - Safe experimentation environment

3. **Claude Access**: CLI only (no API access)

4. **Project Types**: Various - PWAs, web apps, CLI tools, etc.

5. **Architecture**: Mini PC at home behind Tailscale, Tailscale on phone

### Phone UX Flow
1. Open App (PWA?) and select project or create new one
2. See open issues (beads) and make Claude CLI work on it in a container
3. Tell agent to review bead that was just worked on, or repository in general (press of a button!)
4. Reviewers open new issues and prioritize them accordingly
5. Tell it to open a PR once satisfied with: initiate task → review work → initiate review issues → repeat loop

### Git Workflow
- Protected main branch
- Create PRs for merging

---

## Infrastructure
- **Mini PC**: R9 6800HX, 32GB RAM, 1TB SSD
- **Network**: Tailscale VPN (access from phone when out and about, PC when home)
- **Stack**: FastAPI (backend) + React (frontend PWA)

## Architecture Decisions

### 3. Container Persistence
**Choice: A - Long-running project containers**
- Keep project containers warm for faster task startup
- Preserve build caches and installed dependencies
- Implement manual cleanup (can add auto-cleanup per-project later)

### 4. Claude CLI Strategy
**Choice: A - Mount host Claude CLI + config**
- Single Claude installation shared across containers
- Volume mount `/usr/local/bin/claude` and `~/.claude` config
- Simpler updates and consistent versioning

### 5. Project Structure
**Choice: A - Workspace directory auto-discovery**
- Scan `~/projects/` for git repos
- Auto-discover projects with `.beads/` directories
- No database needed initially
- Can upgrade to hybrid with metadata DB later

### 6. Real-time Feedback
**Choice: B - Poll for updates (every 5-10 sec)**
- Reliable over cellular/VPN when remote
- Better battery life than WebSockets
- Works well on PC at home too
- Shows near-real-time progress without connection issues

### 7. Authentication
**Choice: A - Tailscale network = trusted**
- Zero config - Tailscale membership is authorization
- No extra login/password needed

### 8. Task Initiation
**Choice: B - Optional context/instructions**
- Can add custom instructions when starting a bead
- Defaults to "just run" if no context provided
- Good balance of speed and flexibility

### 9. Review Workflow
**Choice: A - Claude reviews its own work (upgrade to C later)**
- Fresh Claude session analyzes PR/changes
- Automatically creates new beads for issues found
- Start simple, add human-in-the-loop approval later

### 10. Review Trigger
**Choice: B + C - Manual button + auto before PR**
- "Review" button available anytime
- Auto-triggers review before PR creation
- Can batch review multiple completed beads

### 11. Branch Strategy
**Choice: A - Branch per bead**
- Each bead gets own branch: `beads-xxx-feature-name`
- Easy to trace PR back to specific bead
- Multiple beads can be merged into one PR

### 12. PR Creation
**Choice: B - Accumulate work, one PR per session**
- Group related beads into single PR
- Ability to create interim PRs for completed chunks
- Cleaner than one PR per bead

### 13. Container Restrictions
**Choice: A - Full network + package manager access**
- Can install deps, hit package registries, research docs
- Resource limits: 4 CPU cores, 8GB RAM per container
- Can run ~3 concurrent containers with 32GB total

### 14. Container Lifecycle
**Choice: A - Manual cleanup (add auto per-project later)**
- Keep containers running until manually deleted
- Fast re-use, preserves caches
- Can add 24h auto-cleanup per project config later

## Key Workflows

### 1. Project Selection
- Scan `~/projects/` for repos
- Display on mobile UI
- Select → ensure container running

### 2. Work on Bead
- Select bead from list
- Optionally add context
- Backend execs Claude in container
- Poll for status updates
- Auto-update bead status on completion

### 3. Review
- Manual: click "Review" button
- Auto: before PR creation
- Claude analyzes changes, creates new beads
- Iterate until satisfied

### 4. PR Creation
- Click "Create PR"
- Auto-review if not done
- Generate PR from commits + bead context
- Push and create via GitHub API

## Git Workflow
- Protected main branch
- Work happens on `beads-xxx` branches
- PRs required for merge to main

## Beads Integration
- Requires CLI install + `bd doctor --fix`
- Set up beads sync branch (protected branches guide)
- Install commands and marketplace per docs
- Read `.beads/` data for UI
- Use `bd` CLI for creating issues from reviews

## Future Enhancements
- Hybrid project discovery (workspace + DB metadata)
- Human-in-the-loop review approval (Option C)
- Per-project auto-cleanup settings
- WebSocket streaming for home network use
