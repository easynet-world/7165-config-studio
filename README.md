# DotEnv Studio

> **The simplest way to visualize your .env**

![DotEnv Studio](public/images/dotenv-studio.png)

## Quick Start

| Step | Command |
|------|---------|
| **1. Install** | `npm install -g dotenv-studio` |
| **2. Navigate** | `cd /path/to/your/project` |
| **3. Start** | `dotenv-studio` |
| **4. Open** | `http://localhost:8880` |

That's it! Your `.env` file will appear in the browser.

## Examples

| Scenario | Command |
|---------|---------|
| **Basic usage** | `npm install -g dotenv-studio`<br>`cd ~/my-project`<br>`dotenv-studio` |
| **Custom port** | `dotenv-studio --port 3000` |
| **Local install** | `npm install dotenv-studio`<br>`npx dotenv-studio` |
| **Environment port** | `DOTENV_UI_PORT=8080 dotenv-studio` |

## How It Works

### Organize into Tabs

Separate sections with empty lines in your `.env`:

```env
# Server
PORT=3000
HOST=localhost

# Database
DB_HOST=localhost
DB_PORT=5432
```

Each section becomes a tab.

### Add Help Text

Put comments above settings:

```env
# Port number for the server
PORT=3000
```

### Add Validation

Add rules in parentheses:

```env
# Server port (required, type:number, min:1, max:65535)
PORT=3000

# API URL (required, type:url)
API_URL=https://api.example.com

# Environment (enum:dev|staging|prod)
ENV=dev
```

## Validation Rules

| Rule | Syntax | Example |
|------|--------|---------|
| **Required** | `required` | `# API Key (required)` |
| **Number type** | `type:number` | `# Port (type:number)` |
| **URL type** | `type:url` | `# URL (type:url)` |
| **Email type** | `type:email` | `# Email (type:email)` |
| **Min/Max** | `min:1, max:100` | `# Count (min:1, max:100)` |
| **Pattern** | `pattern:^[A-Z]+$` | `# Code (pattern:^[A-Z]+$)` |
| **Enum** | `enum:dev\|staging\|prod` | `# Env (enum:dev\|staging\|prod)` |

## Features

| Feature | Description |
|---------|-------------|
| **Auto Tabs** | Organizes settings into tabs by empty lines |
| **Search** | Find any setting instantly |
| **Validation** | Validates inputs with custom rules |
| **Backup** | Creates backup before saving |
| **Live Updates** | Automatically reloads when `.env` changes |

## Common Tasks

| Task | How To |
|------|--------|
| **View settings** | Start UI → Open browser → Browse tabs |
| **Edit settings** | Click field → Change value → Click "Save Settings" |
| **Search settings** | Type in search box (top left) → Results filter instantly |
| **Add new setting** | Edit `.env` file directly |

## Configuration

### Port Options

| Method | Command | Port |
|--------|---------|------|
| **Default** | `dotenv-studio` | 8880 |
| **Command-line** | `dotenv-studio --port 8080` | 8080 |
| **Environment** | `DOTENV_UI_PORT=8080 dotenv-studio` | 8080 |

### Working Directory

| Location | Result |
|----------|--------|
| **Correct** | Run from project directory → Finds `.env` |
| **Wrong** | Run from different directory → Won't find `.env` |

**Example:**
```bash
# Correct
cd ~/my-project
dotenv-studio

# Wrong
cd ~
dotenv-studio  # Won't find .env in ~/my-project
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **Command not found** | Run `npm install -g dotenv-studio` |
| **Port already in use** | Use `dotenv-studio --port 8080` |
| **Can't find .env** | Make sure you're in the project directory |
| **Settings not saving** | Check `.env` file permissions |
| **Tabs not showing** | Add empty lines between sections in `.env` |

## Security

⚠️ **No authentication by default.** If you expose this to a network, add authentication.

| Option | Description |
|--------|-------------|
| **nginx** | Use nginx with basic auth (recommended) |
| **Basic Auth** | Add `express-basic-auth` middleware |
| **Local only** | Only run on localhost (default) |

## Example .env File

```env
# Server
# Port number (required, type:number, min:1, max:65535)
PORT=3000
# Hostname
HOST=localhost

# Database
# Database URL (required, type:url)
DATABASE_URL=postgresql://user:pass@localhost/db
# Pool size (type:number, min:1, max:100)
DB_POOL_SIZE=10

# API
# API Key (required, pattern:^[A-Z0-9_]+$)
API_KEY=MY_SECRET_KEY
# Environment (enum:dev|staging|prod)
ENVIRONMENT=dev
```

## Installation Options

| Method | Command | Use Case |
|--------|---------|----------|
| **Global** | `npm install -g dotenv-studio`<br>`dotenv-studio` | Use from anywhere |
| **Local** | `npm install dotenv-studio`<br>`npx dotenv-studio` | Project-specific |
| **Source** | `git clone ...`<br>`npm install`<br>`npm start` | Development |

## License

MIT
