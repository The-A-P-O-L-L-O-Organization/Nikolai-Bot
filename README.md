# Nikolai Bot

A comprehensive Discord bot for managing Nation Roleplay (NRP) games. Handles nations, economies, military, diplomacy, research, and automatic turn processing.

## Features

### Core Systems
- **Nation Management** - Create and manage nations with detailed statistics
- **Economy System** - Multiple currencies, GDP, budgets, loans, and transactions
- **Military** - Army, Airforce, Navy units with production queues
- **Diplomacy** - Wars and treaties between nations
- **Research** - Technology trees and research progress
- **National Spirits** - Traits with mechanical effects (income bonuses, production speed, etc.)
- **Random Events** - Configurable events that can affect nations each turn
- **Turn Processing** - Automatic processing every 12 hours (configurable)
- **Comprehensive Logging** - Audit logs, transaction history, and event tracking

### Social & Roleplay
- **Press Releases** - Nations can issue official statements and propaganda
- **Reputation System** - Track nation reputation with individual nations and globally
- **Crisis Events** - GM-managed global crises with nation responses

### Advanced Gameplay
- **Infrastructure** - Build and manage national infrastructure projects
- **Wonders & Projects** - Construct mega-projects (space programs, monuments, etc.)
- **Fog of War** - Control information visibility between nations

### Economy Expansion
- **Trade Routes** - Establish and manage trade connections between nations
- **Sanctions** - Impose economic sanctions on nations
- **Black Market** - Covert transactions outside normal channels
- **Currency Exchange** - Track exchange rates between currencies
- **Economic Crises** - Model economic downturns and their effects

### Diplomacy & Politics
- **Espionage** - Intelligence operations between nations
- **Alliances** - Formal alliance organizations with membership and voting
- **World Council** - UN-style international body with resolutions
- **Government Types** - Assign government systems with mechanical modifiers
- **Coups** - Model coup attempts with success/failure mechanics

### Military Expansion
- **Battle Simulator** - Resolve combat with dice rolls and modifiers
- **Military Doctrines** - Assign combat doctrines with bonuses
- **Occupations** - Track military occupations of territories
- **Arms Treaties** - Nuclear and arms control agreements
- **Mercenaries** - Hire and manage mercenary companies

### Quality of Life
- **Turn Reminders** - Get notified before turn processing
- **Nation Profiles** - Detailed exportable nation summaries
- **Bulk Operations** - Perform batch operations across multiple nations

## Requirements

- Node.js 18+
- MongoDB 6+
- Docker & Docker Compose (recommended for deployment)

## Quick Start

### Using Docker (Recommended)

1. Clone the repository
2. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` with your Discord bot token and settings
4. Start with Docker Compose:
   ```bash
   docker-compose up -d
   ```

### Manual Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure `.env` file with your settings
3. Start the bot:
   ```bash
   npm start
   ```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DISCORD_TOKEN` | Your Discord bot token | Required |
| `DISCORD_CLIENT_ID` | Discord application client ID | Required |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/nikolai` |
| `GM_ROLE_NAME` | Role name for Game Masters | `GM` |
| `STARTING_YEAR` | Initial game year | `1960` |
| `TURN_INTERVAL_HOURS` | Hours between automatic turns | `12` |

## Commands

### Nation Commands
- `/nation create` - Create a new nation from template
- `/nation view` - View nation details
- `/nation edit` - Edit nation properties (GM)
- `/nation list` - List all nations
- `/nation stats` - Detailed statistics
- `/spirits add/remove` - Manage national spirits

### Economy Commands
- `/economy view` - View economic status
- `/economy set/add/remove` - Manage currency (GM)
- `/economy income` - Set per-turn income (GM)
- `/transfer` - Transfer resources between nations
- `/loan give/repay/view` - Loan management
- `/transactions` - View transaction history
- `/trade` - Trade route management (GM)
- `/sanction` - Economic sanctions (GM)
- `/blackmarket` - Black market transactions (GM)
- `/exchange` - Currency exchange rates (GM)
- `/econcrisis` - Economic crisis management (GM)

### Military Commands
- `/military view` - View military forces
- `/military set/add/remove` - Manage units (GM)
- `/unit produce` - Start unit production
- `/unit cancel` - Cancel production order
- `/unit queue` - View production queue
- `/resources view/set` - Resource management
- `/battle` - Battle simulator (GM)
- `/doctrine` - Military doctrine management (GM)
- `/occupation` - Territory occupation management (GM)
- `/armstreaty` - Arms control treaty management (GM)
- `/mercenary` - Mercenary company management (GM)

### Diplomacy Commands
- `/war declare` - Declare war (GM)
- `/war join` - Add nation to war (GM)
- `/war end` - End a war (GM)
- `/war view/list` - View wars
- `/treaty create/sign/dissolve` - Treaty management (GM)
- `/treaty view/list` - View treaties
- `/espionage` - Intelligence operations (GM)
- `/alliance` - Alliance management (GM)
- `/council` - World Council/UN management (GM)
- `/government` - Government type management (GM)
- `/coup` - Coup attempt management (GM)

### Social & Roleplay Commands
- `/press` - Press release management
- `/reputation` - Nation reputation system (GM)
- `/crisis` - Global crisis management (GM)

### Gameplay Commands
- `/infrastructure` - Infrastructure management (GM)
- `/project` - Wonder/project management (GM)
- `/fogofwar` - Information visibility control (GM)

### Quality of Life Commands
- `/reminder` - Turn reminder setup
- `/profile` - Nation profile export
- `/bulk` - Bulk operations (GM)

### Research Commands
- `/research start` - Begin researching technology
- `/research cancel` - Cancel current research
- `/research status` - View research progress
- `/research list` - List available technologies
- `/research view` - View technology details
- `/research grant/revoke` - Grant/revoke tech (GM)
- `/research tech create/edit/delete` - Manage tech templates (GM)

### Time & Turn Commands
- `/year view/set/advance` - Game year management
- `/turn info` - View turn information
- `/turn process` - Manually process turn (GM)
- `/turn settings` - Configure turn settings (GM)
- `/turn channel` - Set announcement channel (GM)

### Admin Commands
- `/audit view/search` - View audit logs (GM)
- `/backup create/restore` - Database backup (GM)
- `/settings view/set` - Game settings (GM)

### Info Commands
- `/help` - Command help and usage
- `/about` - Bot information and statistics

## Permissions

- **GM Role** (`@GM` by default) - Full control over all game mechanics
- **Nation Owner** - Can manage their own nation (transfers, production, research)
- **Everyone** - Can view public information

## Nation Templates

Pre-built templates for quick nation creation:

- **Great Power** - Major world power with large military and economy
- **Regional Power** - Medium-sized nation with moderate capabilities
- **Minor Nation** - Smaller nation with limited resources

## Spirit System

National spirits provide both flavor text and mechanical bonuses:

| Effect Type | Description |
|-------------|-------------|
| `income_modifier` | Percentage bonus to currency income |
| `production_speed` | Faster unit production |
| `research_speed` | Faster technology research |
| `stability_modifier` | Flat stability change per turn |
| `military_modifier` | Combat effectiveness bonus |
| `resource_income` | Bonus to specific resource income |
| `maintenance_modifier` | Cost of loan interest |
| `population_growth` | Percentage population growth |

## Turn Processing

Each turn (every 12 hours by default):

1. **Income** - Currency and resource income added (with spirit modifiers)
2. **Production** - Unit production progress advances
3. **Research** - Research progress advances
4. **Loans** - Interest accumulates on outstanding loans
5. **Spirits** - Stability and population modifiers applied
6. **Events** - Random events may trigger based on configured chance

## Random Events

Events can be positive, neutral, negative, or catastrophic. They're triggered based on:

- Configurable percentage chance per nation per turn
- Conditional requirements (stability levels, resources, etc.)
- Weighted random selection

## Database Models

### Core Models
- **Nation** - Core nation data, military, economy, spirits
- **GameState** - Current year, turn info, global settings
- **Technology** - Tech definitions and requirements
- **War** - Active and historical conflicts
- **Treaty** - Diplomatic agreements
- **Transaction** - Economic transaction history
- **AuditLog** - All modification records
- **Event** - Random event definitions
- **Resource** - Currency and resource definitions
- **Unit** - Unit type definitions
- **Template** - Nation templates

### Economy Models
- **TradeRoute** - Trade connections between nations
- **Sanction** - Economic sanctions
- **BlackMarketTransaction** - Covert transactions
- **Economy** - Currency exchange rates and economic crises

### Diplomacy Models
- **EspionageOperation** - Intelligence operations
- **Alliance** - Formal alliance organizations
- **WorldCouncil** / **Resolution** - International body and resolutions
- **GovernmentType** / **CoupAttempt** - Government systems and coups

### Military Models
- **Battle** - Battle simulation records
- **Doctrine** - Military doctrine templates
- **Occupation** - Territory occupations
- **NuclearTreaty** - Arms control treaties
- **MercenaryCompany** / **MercenaryContract** - Mercenary companies

### Social/RP Models
- **PressRelease** - Official nation statements
- **Reputation** - Nation reputation tracking
- **Crisis** - Global crisis events

### Gameplay Models
- **Infrastructure** - Infrastructure projects
- **Project** - Wonders and mega-projects
- **FogOfWar** - Information visibility
- **TurnReminder** - Turn notification settings

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Deploy slash commands
npm run deploy

# Run linter
npm run lint
```

## License

MIT

## Support

For issues and feature requests, please open an issue on GitHub.
