# Templates

Module README templates for use when creating implementation directories.

## Usage

When creating a new module directory, copy the corresponding template:

```bash
# When creating backend/
mkdir -p backend
cp templates/backend-README.md backend/README.md

# When creating frontend/
mkdir -p frontend
cp templates/frontend-README.md frontend/README.md

# When creating docker/
mkdir -p docker
cp templates/docker-README.md docker/README.md
```

## Available Templates

| Template | Target | Purpose |
|----------|--------|---------|
| `backend-README.md` | `backend/README.md` | FastAPI backend overview |
| `frontend-README.md` | `frontend/README.md` | React PWA overview |
| `docker-README.md` | `docker/README.md` | Container configuration |

## Customization

After copying, update the README to reflect:
- Actual file structure (as you create files)
- Specific dependencies (versions, libraries)
- Any deviations from the template structure

## Guidelines

Keep module READMEs:
- Short (20-50 lines)
- Focused on "what's here" and "how it connects"
- Up to date when adding significant files
- Free of duplication with AGENTS.md
