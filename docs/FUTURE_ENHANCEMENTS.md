# Future Enhancements

**Status**: Deferred - implement after MVP is working

This document captures features from the original detailed plan that are deferred until the simplified MVP is complete and in use.

---

## Tier 1: Quality of Life (~4 beads)

### 1.1 SSE Streaming for Real-time Output

**Current MVP**: Blocking request, wait for full output
**Enhancement**: Stream output as Claude works

```python
# Backend
from sse_starlette.sse import EventSourceResponse

@app.get("/api/projects/{project_id}/work/{bead_id}/stream")
async def work_stream(project_id: str, bead_id: str):
    async def generate():
        for chunk in containers.exec_claude_streaming(project_id, prompt):
            yield {"data": chunk}
    return EventSourceResponse(generate())
```

```typescript
// Frontend
const eventSource = new EventSource(`/api/projects/${id}/work/${beadId}/stream`);
eventSource.onmessage = (e) => appendOutput(e.data);
```

**Effort**: 1 bead

---

### 1.2 Execution History & Logs

**Current MVP**: Output shown once, then gone
**Enhancement**: Persist execution logs for review

```python
# Store logs per execution
logs/
├── {project_id}/
│   ├── {bead_id}/
│   │   ├── 2025-01-15T10:30:00-work.log
│   │   └── 2025-01-15T11:00:00-review.log
```

```python
@app.get("/api/projects/{project_id}/logs")
def list_logs(project_id: str):
    return log_service.list_logs(project_id)

@app.get("/api/projects/{project_id}/logs/{log_id}")
def get_log(project_id: str, log_id: str):
    return log_service.get_log(project_id, log_id)
```

**Effort**: 1 bead

---

### 1.3 Bead Status Auto-Update

**Current MVP**: Manually update bead status
**Enhancement**: Auto-update after successful work

```python
def work_on_bead(project_id: str, bead_id: str):
    output = containers.exec_claude(project_id, prompt)

    # Check if work completed successfully
    if "committed" in output.lower() and "pushed" in output.lower():
        beads.update_status(project_path, bead_id, "done")
        beads.sync(project_path)  # bd sync

    return {"output": output, "status_updated": True}
```

**Effort**: 0.5 bead (add to existing endpoint)

---

### 1.4 bd close Integration

**Current MVP**: Manual `bd close` after work
**Enhancement**: Close button in UI after successful work

```python
@app.post("/api/projects/{project_id}/beads/{bead_id}/close")
def close_bead(project_id: str, bead_id: str, reason: str = None):
    beads.close(project_path, bead_id, reason)
    beads.sync(project_path)
    return {"status": "closed"}
```

**Effort**: 0.5 bead

---

## Tier 2: Automation (~6 beads)

### 2.1 ContextBuilder for Richer Prompts

**Current MVP**: Simple prompt templates
**Enhancement**: Auto-detect tech stack, test commands, project structure

See `BACKEND_PLAN.md` section on `context_builder.py` for full implementation.

Key features:
- Detect package.json/requirements.txt/etc.
- Find test commands automatically
- Include README summary
- Show project structure tree
- Include recent commits

**Effort**: 2 beads

---

### 2.2 Execution Timeout Enforcement

**Current MVP**: No timeout, cancel manually
**Enhancement**: 6-hour automatic timeout with cleanup

```python
import asyncio
from datetime import datetime, timedelta

class ExecutionManager:
    async def execute_with_timeout(
        self, project_id: str, prompt: str, timeout_hours: int = 6
    ):
        execution_id = str(uuid4())
        deadline = datetime.now() + timedelta(hours=timeout_hours)

        self.active_executions[execution_id] = {
            "project_id": project_id,
            "started_at": datetime.now(),
            "deadline": deadline,
            "status": "running",
        }

        try:
            result = await asyncio.wait_for(
                self._run_claude(project_id, prompt),
                timeout=timeout_hours * 3600
            )
            self.active_executions[execution_id]["status"] = "completed"
            return result
        except asyncio.TimeoutError:
            self.active_executions[execution_id]["status"] = "timeout"
            await self._cleanup_execution(project_id)
            return {"error": "Execution timed out after 6 hours"}
```

**Effort**: 1 bead

---

### 2.3 Quality Gates (Test Must Pass)

**Current MVP**: Human verifies tests passed
**Enhancement**: Automated test verification before marking done

```python
def verify_quality_gates(project_path: str) -> tuple[bool, str]:
    """Run tests and check they pass"""
    test_cmd = detect_test_command(project_path)
    if not test_cmd:
        return True, "No test command detected"

    result = subprocess.run(
        test_cmd.split(), cwd=project_path, capture_output=True
    )

    if result.returncode == 0:
        return True, "Tests passed"
    else:
        return False, f"Tests failed:\n{result.stderr.decode()}"

@app.post("/api/projects/{project_id}/beads/{bead_id}/close")
def close_bead(project_id: str, bead_id: str, skip_gates: bool = False):
    if not skip_gates:
        passed, message = verify_quality_gates(project_path)
        if not passed:
            return {"error": message, "can_force": True}

    beads.close(project_path, bead_id)
    return {"status": "closed"}
```

**Effort**: 1 bead

---

### 2.4 Review → Auto-Create Beads

**Current MVP**: Human reads review, creates beads manually
**Enhancement**: Parse review output and create beads automatically

```python
REVIEW_PROMPT_JSON = """
Review the changes on this branch compared to main.

Output your findings as JSON:
{
  "issues": [
    {
      "title": "Brief title",
      "description": "Detailed description",
      "priority": 2,
      "type": "bug|task|feature",
      "file": "path/to/file.py",
      "line": 42
    }
  ],
  "summary": "Overall summary",
  "pr_ready": true/false
}
"""

def parse_review_output(output: str) -> dict:
    """Extract JSON from Claude's output"""
    # Try to find JSON block
    import re
    json_match = re.search(r'\{[\s\S]*\}', output)
    if json_match:
        try:
            return json.loads(json_match.group())
        except:
            pass
    return {"issues": [], "summary": output, "pr_ready": False}

@app.post("/api/projects/{project_id}/review")
def review_work(project_id: str, auto_create_beads: bool = False):
    output = containers.exec_claude(project_id, REVIEW_PROMPT_JSON)
    parsed = parse_review_output(output)

    if auto_create_beads and parsed["issues"]:
        for issue in parsed["issues"]:
            beads.create(
                project_path,
                title=issue["title"],
                description=issue["description"],
                priority=issue["priority"],
                type=issue["type"],
            )
        beads.sync(project_path)

    return {
        "output": output,
        "parsed": parsed,
        "beads_created": len(parsed["issues"]) if auto_create_beads else 0,
    }
```

**Effort**: 2 beads

---

## Tier 3: Full Orchestration (~8 beads)

### 3.1 Execution State Machine

**Current MVP**: Blocking request
**Enhancement**: Full state tracking with background execution

```python
from enum import Enum

class ExecutionState(Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"
    CANCELLED = "cancelled"

class ExecutionOrchestrator:
    def __init__(self):
        self.executions = {}  # id -> ExecutionRecord

    async def queue_execution(self, project_id: str, bead_id: str) -> str:
        execution_id = str(uuid4())
        self.executions[execution_id] = ExecutionRecord(
            id=execution_id,
            project_id=project_id,
            bead_id=bead_id,
            state=ExecutionState.QUEUED,
            queued_at=datetime.now(),
        )
        asyncio.create_task(self._run_execution(execution_id))
        return execution_id

    async def get_status(self, execution_id: str) -> dict:
        record = self.executions.get(execution_id)
        return record.to_dict() if record else None
```

**Effort**: 2 beads

---

### 3.2 Concurrent Execution

**Current MVP**: One execution at a time
**Enhancement**: Multiple beads executing in parallel

```python
class ConcurrencyManager:
    def __init__(self, max_concurrent: int = 3):
        self.max_concurrent = max_concurrent
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.active = {}

    async def acquire(self, project_id: str) -> bool:
        if len(self.active) >= self.max_concurrent:
            return False
        await self.semaphore.acquire()
        self.active[project_id] = datetime.now()
        return True

    def release(self, project_id: str):
        self.active.pop(project_id, None)
        self.semaphore.release()
```

**Effort**: 1 bead

---

### 3.3 Error Recovery Automation

**Current MVP**: Drop into container manually
**Enhancement**: Automated retry, pause/resume, input channel

```python
class ErrorRecovery:
    async def handle_blocked(self, execution_id: str, reason: str):
        """Handle BLOCKED: output from agent"""
        execution = self.executions[execution_id]

        # Create bead for the blocker
        blocker_bead = beads.create(
            execution.project_path,
            title=f"Blocker: {reason[:50]}",
            description=reason,
            priority=1,
            type="bug",
        )

        # Mark original bead as blocked
        beads.add_dependency(
            execution.project_path,
            execution.bead_id,
            blocker_bead,
        )

        execution.state = ExecutionState.BLOCKED
        execution.blocked_by = blocker_bead

    async def retry_execution(self, execution_id: str):
        """Retry a failed execution"""
        old = self.executions[execution_id]

        # Create new execution
        new_id = await self.queue_execution(
            old.project_id, old.bead_id
        )

        old.retry_id = new_id
        return new_id
```

**Effort**: 2 beads

---

### 3.4 Background Execution with Notifications

**Current MVP**: Wait for result synchronously
**Enhancement**: Push notifications when done

```python
# Using web push notifications
from pywebpush import webpush

class NotificationService:
    def __init__(self):
        self.subscriptions = {}  # user_id -> subscription

    def subscribe(self, user_id: str, subscription: dict):
        self.subscriptions[user_id] = subscription

    def notify(self, user_id: str, title: str, body: str):
        sub = self.subscriptions.get(user_id)
        if sub:
            webpush(
                subscription_info=sub,
                data=json.dumps({"title": title, "body": body}),
                vapid_private_key=settings.vapid_private_key,
            )
```

```typescript
// Frontend service worker
self.addEventListener('push', (event) => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icon-192.png',
  });
});
```

**Effort**: 2 beads

---

### 3.5 Dependency Validation

**Current MVP**: Human checks bd ready
**Enhancement**: Auto-check before execution

```python
@app.post("/api/projects/{project_id}/work/{bead_id}")
def work_on_bead(project_id: str, bead_id: str, force: bool = False):
    bead = beads.get_bead(project_path, bead_id)

    # Check if blocked
    if bead["blocked_by"] and not force:
        return {
            "error": "Bead is blocked",
            "blocked_by": bead["blocked_by"],
            "can_force": True,
        }

    # Proceed with execution
    ...
```

**Effort**: 0.5 bead

---

## Implementation Priority

| Tier | Features | Effort | When to Add |
|------|----------|--------|-------------|
| 1 | QoL improvements | ~4 beads | After using MVP for a week |
| 2 | Automation | ~6 beads | When manual steps feel tedious |
| 3 | Full orchestration | ~8 beads | When you want to walk away |

**Total deferred**: ~18 beads

---

## Migration Path

1. **MVP works** → Use it for real work
2. **Pain points emerge** → Identify which Tier 1/2 features would help
3. **Incrementally add** → Each enhancement is independent
4. **Eventually** → Full orchestration if needed

The key insight: you may never need Tier 3. If you're checking in every 20-30 minutes anyway, the MVP + Tier 1/2 is likely sufficient.

---

## See Also

- **SIMPLIFIED_PLAN.md** - The MVP implementation plan
- **AGENT_CHALLENGES.md** - Technical challenges (many addressed by Tier 2/3)
- **BACKEND_PLAN.md** - Original detailed backend (reference for Tier 2/3)
- **FRONTEND_PLAN.md** - Original detailed frontend (reference for Tier 2/3)
