# Nikolai Bot - GM Usage Guide

A complete guide for Game Masters running Nation Roleplay games with Nikolai Bot.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Nation Management](#nation-management)
3. [Economy & Resources](#economy--resources)
4. [Military & Production](#military--production)
5. [Diplomacy](#diplomacy)
6. [Research & Technology](#research--technology)
7. [Turns & Time](#turns--time)
8. [Events & Spirits](#events--spirits)
9. [Administration](#administration)
10. [Player Permissions](#player-permissions)

---

## Getting Started

### Initial Setup

1. **Set the game year:**
   ```
   /year set year:1936
   ```

2. **Configure turn settings:**
   ```
   /turn settings interval:12 auto_year:true year_per_turn:1
   ```

3. **Set announcement channel:**
   ```
   /turn channel channel:#game-updates
   ```

4. **Create your first nation:**
   ```
   /nation create name:Germany template:Great Power
   ```

### Templates

Three templates are available for quick nation creation:

| Template | Description | Starting Treasury | Military |
|----------|-------------|-------------------|----------|
| **Great Power** | Major world power | 50B primary currency | Large standing army |
| **Regional Power** | Medium nation | 10B primary currency | Moderate forces |
| **Minor Nation** | Small country | 1B primary currency | Small defense force |

---

## Nation Management

### Creating Nations

**From template:**
```
/nation create name:Germany template:Great Power
```

**Blank nation:**
```
/nation create name:Germany
```

### Viewing Nations

**Overview:**
```
/nation view nation:Germany
```

**Detailed stats:**
```
/nation stats nation:Germany
```

**List all nations:**
```
/nation list
```

### Editing Nations

**Edit basic properties:**
```
/nation edit nation:Germany field:leader value:Adolf Hitler
/nation edit nation:Germany field:population value:80M
/nation edit nation:Germany field:stability value:75
/nation edit nation:Germany field:description value:The German Reich
/nation edit nation:Germany field:flag value:https://example.com/flag.png
```

Available fields: `name`, `leader`, `population`, `stability`, `description`, `flag`, `gdp`, `budget`, `inflation`, `primary_currency`, `nukes`

### Assigning Nations to Players

```
/nation assign nation:Germany player:@PlayerName
```

To unassign:
```
/nation assign nation:Germany player:@PlayerName
```
(Run again with same player to toggle off, or assign to a different player)

### Deleting Nations

```
/nation delete nation:Germany
```

---

## Economy & Resources

### Viewing Economy

```
/economy view nation:Germany
```

### Managing Currency

**Set balance:**
```
/economy set nation:Germany currency:Reichsmarks amount:50B
```

**Add funds:**
```
/economy add nation:Germany currency:Reichsmarks amount:5B reason:War reparations received
```

**Remove funds:**
```
/economy remove nation:Germany currency:Reichsmarks amount:2B reason:Military spending
```

### Setting Income

Income is automatically added each turn:
```
/economy income nation:Germany currency:Reichsmarks amount:500M
```

For expenses (negative income):
```
/economy income nation:Germany currency:Reichsmarks amount:-100M
```

### Resources

**View resources:**
```
/resources view nation:Germany
```

**Set resource amount:**
```
/resources set nation:Germany resource:Oil amount:10000
```

**Add resources:**
```
/resources add nation:Germany resource:Steel amount:5000 reason:New mines opened
```

**Set resource income (per turn):**
```
/resources income nation:Germany resource:Oil amount:500
```

### Loans

**Nation gives loan to another:**
```
/loan give from:Germany to:Italy amount:1B currency:Reichsmarks interest:5
```

**View loans:**
```
/loan view nation:Italy
```

**Repay loan:**
```
/loan repay nation:Italy creditor:Germany amount:500M
```

**Forgive loan (GM):**
```
/loan forgive nation:Italy creditor:Germany
```

### Transfers

Players can transfer between nations they own, or GMs can transfer anything:
```
/transfer from:Germany to:Italy type:currency name:Reichsmarks amount:100M
/transfer from:Germany to:Italy type:resource name:Oil amount:500
```

### Transaction History

```
/transactions nation:Germany
/transactions nation:Germany type:transfer
```

---

## Military & Production

### Viewing Military

```
/military view nation:Germany
```

### Setting Unit Counts

**Standard units:**
```
/military set nation:Germany branch:army unit:troops amount:1000000
/military set nation:Germany branch:army unit:tanks amount:5000
/military set nation:Germany branch:airforce unit:jets amount:500
/military set nation:Germany branch:navy unit:submarines amount:50
```

**Available branches and units:**

| Branch | Units |
|--------|-------|
| **army** | troops, reserves, tanks, artillery, armored_vehicles, special_forces |
| **airforce** | jets, bombers, recon_planes, transport_planes, helicopters |
| **navy** | carriers, submarines, destroyers, frigates, corvettes, battleships |

**Add/remove units:**
```
/military add nation:Germany branch:army unit:tanks amount:100 reason:New production
/military remove nation:Germany branch:army unit:tanks amount:50 reason:Combat losses
```

### Production Queue

**Start production:**
```
/unit produce nation:Germany unit:Tanks quantity:500 turns:3
```

**View queue:**
```
/unit queue nation:Germany
```

**Cancel production:**
```
/unit cancel nation:Germany index:1
```

---

## Diplomacy

### Wars

**Declare war:**
```
/war declare name:World War II aggressor:Germany defender:Poland reason:Territorial expansion
```

**Add nations to existing war:**
```
/war join war:World War II nation:France side:defender
/war join war:World War II nation:Italy side:aggressor
```

**View war:**
```
/war view war:World War II
```

**List wars:**
```
/war list
/war list status:active
/war list status:ended
```

**End war:**
```
/war end war:World War II outcome:aggressor_victory
```

Outcomes: `aggressor_victory`, `defender_victory`, `white_peace`, `stalemate`

### Treaties

**Create treaty:**
```
/treaty create name:Molotov-Ribbentrop Pact type:non_aggression
/treaty create name:NATO type:alliance description:North Atlantic Treaty Organization
```

Treaty types: `alliance`, `non_aggression`, `trade`, `defense`, `peace`, `other`

**Add signatories:**
```
/treaty sign treaty:NATO nation:USA role:leader
/treaty sign treaty:NATO nation:UK role:member
```

**View treaty:**
```
/treaty view treaty:NATO
```

**List treaties:**
```
/treaty list
/treaty list status:active
```

**End treaty:**
```
/treaty dissolve treaty:Molotov-Ribbentrop Pact reason:Germany invaded USSR
```

---

## Research & Technology

### Managing Technologies

**Create a technology:**
```
/research tech create name:Jet Engines category:military research_time:4 description:Advanced propulsion for aircraft
```

**With prerequisites:**
```
/research tech create name:Nuclear Weapons category:military research_time:8 prerequisites:Nuclear Fission,Uranium Enrichment
```

**Edit technology:**
```
/research tech edit technology:Jet Engines field:research_time value:3
```

**Delete technology:**
```
/research tech delete technology:Obsolete Tech
```

Categories: `military`, `economy`, `infrastructure`, `science`, `social`, `special`

### Nation Research

**Start research (players can do this for their own nation):**
```
/research start nation:Germany technology:Jet Engines
```

**View status:**
```
/research status nation:Germany
```

**Cancel research:**
```
/research cancel nation:Germany
```

**List available technologies:**
```
/research list
/research list category:military
```

**View technology details:**
```
/research view technology:Jet Engines
```

### GM Research Commands

**Grant technology instantly:**
```
/research grant nation:Germany technology:Jet Engines
```

**Revoke technology:**
```
/research revoke nation:Germany technology:Jet Engines
```

---

## Turns & Time

### Game Year

**View current year:**
```
/year view
```

**Set year:**
```
/year set year:1939
```

**Advance year manually:**
```
/year advance amount:1
```

### Turn System

**View turn info:**
```
/turn info
```

Shows current turn number, time until next turn, and recent changes.

**Process turn manually:**
```
/turn process
```

**Configure turn settings:**
```
/turn settings interval:12 auto_year:true year_per_turn:1
```

| Setting | Description | Default |
|---------|-------------|---------|
| `interval` | Hours between turns | 12 |
| `auto_year` | Advance year each turn | true |
| `year_per_turn` | Years to advance | 1 |

**Set announcement channel:**
```
/turn channel channel:#game-updates
```

### What Happens Each Turn

1. **Income** - All nations receive their per-turn currency income
2. **Resources** - Resource income is added
3. **Production** - Production queue advances, completed units are delivered
4. **Research** - Research progress advances, completed techs are unlocked
5. **Loans** - Interest accumulates on outstanding loans
6. **Spirits** - Stability/population modifiers from spirits are applied
7. **Events** - Random events may trigger based on configured chance

---

## Events & Spirits

### National Spirits

Spirits are national traits that provide both flavor and mechanical bonuses.

**Add a preset spirit:**
```
/spirits add nation:Germany spirit:Militarism
```

**Add custom spirit:**
```
/spirits add nation:Germany spirit:Custom name:Blitzkrieg Doctrine description:Revolutionary mobile warfare tactics
```

**View available spirits:**
```
/spirits list
```

**Remove spirit:**
```
/spirits remove nation:Germany spirit:Militarism
```

### Spirit Effects

Spirits can have these mechanical effects:

| Effect | Description | Example |
|--------|-------------|---------|
| `income_modifier` | % bonus to currency income | +10% income |
| `production_speed` | % faster production | 20% faster builds |
| `research_speed` | % faster research | 15% faster research |
| `stability_modifier` | Flat stability change/turn | +2 stability/turn |
| `military_modifier` | Combat effectiveness | +10% combat power |
| `resource_income` | % bonus to specific resource | +25% oil income |
| `maintenance_modifier` | Loan interest modifier | -10% interest |
| `population_growth` | % population growth/turn | +0.5% pop/turn |

### Random Events

Events are configured in the game settings:

**View/change event settings:**
```
/settings view
/settings set setting:random_event_chance value:15
```

Events range from positive (Economic Boom) to catastrophic (Civil Unrest) and can affect:
- Currency (% or flat amounts)
- Resources
- Stability
- Population
- Military units

---

## Administration

### Audit Logs

**View recent changes for a nation:**
```
/audit view nation:Germany
```

**Search all logs:**
```
/audit search action:create
/audit search action:update
/audit search action:delete
```

### Game Settings

**View all settings:**
```
/settings view
```

**Change settings:**
```
/settings set setting:auto_advance_year value:true
/settings set setting:random_event_chance value:10
/settings set setting:year_per_turn value:1
```

### Backups

**Create backup:**
```
/backup create
```

**List backups:**
```
/backup list
```

**Restore from backup:**
```
/backup restore
```

---

## Player Permissions

### What Players Can Do (for their own nation)

- `/nation view` - View any nation
- `/nation stats` - View any nation's stats
- `/economy view` - View any economy
- `/military view` - View any military
- `/research start` - Start research for their nation
- `/research cancel` - Cancel their research
- `/research status` - View their research
- `/research list` - View available technologies
- `/unit produce` - Start production for their nation
- `/unit cancel` - Cancel their production
- `/unit queue` - View their queue
- `/transfer` - Transfer from their nation to others
- `/loan repay` - Repay loans their nation owes
- `/transactions` - View transaction history

### GM-Only Commands

All commands marked with `[GM]` in `/help` require the `@GM` role:

- Creating/editing/deleting nations
- Setting currency, resources, military units
- Declaring wars, creating treaties
- Granting/revoking technologies
- Processing turns manually
- Changing game settings
- Viewing audit logs
- Creating backups

---

## Quick Reference

### Number Formats

The bot accepts abbreviated numbers:
- `1K` = 1,000
- `1M` = 1,000,000
- `1B` = 1,000,000,000
- `1T` = 1,000,000,000,000
- `1.5B` = 1,500,000,000

### Common Workflows

**Setting up a new game:**
1. `/year set year:1936`
2. `/turn settings interval:12 auto_year:true`
3. `/turn channel channel:#announcements`
4. Create technologies with `/research tech create`
5. Create nations with `/nation create`
6. Assign players with `/nation assign`

**After a battle:**
1. `/military remove` for losses on both sides
2. `/economy remove` for war costs
3. `/war end` if the war is over
4. Create peace treaty if needed

**Economic crisis event:**
1. `/economy remove` affected nations
2. `/nation edit` to lower stability
3. Consider adding a negative spirit

---

## Getting Help

- `/help` - Overview of all commands
- `/help category:nation` - Detailed help for nation commands
- `/help category:economy` - Detailed help for economy commands
- `/about` - Bot information and statistics
