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
9. [Social & Roleplay](#social--roleplay)
10. [Advanced Gameplay](#advanced-gameplay)
11. [Advanced Economy](#advanced-economy)
12. [Advanced Diplomacy](#advanced-diplomacy)
13. [Advanced Military](#advanced-military)
14. [Administration](#administration)
15. [Player Permissions](#player-permissions)

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

## Social & Roleplay

### Press Releases

Nations can issue official statements and propaganda.

**Issue press release:**
```
/press release nation:Germany title:War Declaration content:Germany declares war on Poland!
/press release nation:Germany title:Peace Offer content:We offer terms... type:diplomatic
```

Press types: `announcement`, `propaganda`, `diplomatic`, `economic`, `military`, `crisis`

**View press releases:**
```
/press view nation:Germany
/press list
/press list type:diplomatic
```

**Delete press release (GM):**
```
/press delete id:abc123
```

### Reputation System

Track nation reputation with other nations and globally.

**Set reputation (GM):**
```
/reputation set nation:Germany target:France value:25 reason:Historic rivalry
/reputation set nation:Germany global:true value:50 reason:International standing
```

**Modify reputation:**
```
/reputation add nation:Germany target:France amount:-10 reason:Border incident
/reputation remove nation:Germany target:France amount:5 reason:Apology issued
```

**View reputation:**
```
/reputation view nation:Germany
```

### Crisis Events

Manage global crises that nations can respond to.

**Create crisis (GM):**
```
/crisis create name:Cuban Missile Crisis description:Nuclear standoff severity:critical
```

Severity levels: `minor`, `moderate`, `major`, `critical`

**Nation response:**
```
/crisis respond crisis:Cuban Missile Crisis nation:USA response:Naval blockade type:diplomatic
```

Response types: `support`, `oppose`, `neutral`, `diplomatic`, `military`, `economic`

**Resolve crisis:**
```
/crisis resolve crisis:Cuban Missile Crisis resolution:Peaceful agreement outcome:success
```

**View crises:**
```
/crisis view crisis:Cuban Missile Crisis
/crisis list
/crisis list status:active
```

---

## Advanced Gameplay

### Infrastructure

Manage national infrastructure projects.

**Create infrastructure project (GM):**
```
/infrastructure create nation:Germany name:Autobahn type:transportation level:3
```

Types: `transportation`, `energy`, `communications`, `healthcare`, `education`, `industrial`, `military`, `agricultural`

**Upgrade infrastructure:**
```
/infrastructure upgrade nation:Germany name:Autobahn
```

**Damage infrastructure (from war, etc.):**
```
/infrastructure damage nation:Germany name:Autobahn amount:50 reason:Allied bombing
```

**Repair infrastructure:**
```
/infrastructure repair nation:Germany name:Autobahn amount:25
```

**View infrastructure:**
```
/infrastructure view nation:Germany
/infrastructure list
```

### Wonders & Projects

Construct mega-projects like space programs, monuments, etc.

**Create project template (GM):**
```
/project template create name:Apollo Program category:space description:Moon landing program
```

Categories: `military`, `economic`, `scientific`, `cultural`, `infrastructure`, `space`, `wonder`

**Set project requirements:**
```
/project template requirements name:Apollo Program cost:50B currency:Dollars turns:10
```

**Start project for nation:**
```
/project start nation:USA project:Apollo Program
```

**Advance/complete project:**
```
/project progress nation:USA project:Apollo Program turns:2
/project complete nation:USA project:Apollo Program
```

**View projects:**
```
/project view nation:USA
/project list
```

### Fog of War

Control information visibility between nations.

**Set visibility (GM):**
```
/fogofwar set observer:USA target:USSR category:military visibility:partial
```

Categories: `military`, `economy`, `research`, `diplomacy`, `all`
Visibility levels: `none`, `partial`, `full`

**Grant full intelligence:**
```
/fogofwar reveal observer:USA target:USSR category:all
```

**Hide information:**
```
/fogofwar hide observer:USA target:USSR category:military
```

**View visibility settings:**
```
/fogofwar view observer:USA target:USSR
/fogofwar list nation:USA
```

### Turn Reminders

Set up notifications before turn processing.

**Enable reminder:**
```
/reminder set nation:Germany minutes:30 channel:#germany-alerts
```

**View reminders:**
```
/reminder view nation:Germany
/reminder list
```

**Disable reminder:**
```
/reminder remove nation:Germany
```

### Nation Profiles

Export detailed nation summaries.

**Generate profile:**
```
/profile view nation:Germany
/profile export nation:Germany
```

### Bulk Operations (GM)

Perform batch operations across multiple nations.

**Add to multiple nations:**
```
/bulk add type:currency name:Dollars amount:1B nations:Germany,France,UK reason:Marshall Plan
/bulk add type:stability amount:10 nations:all reason:Global peace
```

**Remove from multiple nations:**
```
/bulk remove type:resource name:Oil amount:1000 nations:Germany,Japan reason:Embargo
```

---

## Advanced Economy

### Trade Routes

Establish and manage trade connections.

**Create trade route (GM):**
```
/trade create from:Germany to:Italy resource:Steel amount:5000 frequency:per_turn
```

**View trade routes:**
```
/trade view nation:Germany
/trade list
```

**Suspend/resume trade:**
```
/trade suspend from:Germany to:Italy resource:Steel reason:Diplomatic tensions
/trade resume from:Germany to:Italy resource:Steel
```

**Delete trade route:**
```
/trade delete from:Germany to:Italy resource:Steel
```

### Sanctions

Impose economic sanctions on nations.

**Create sanction (GM):**
```
/sanction create target:Germany type:trade_embargo reason:Aggression
/sanction create target:Germany type:asset_freeze imposed_by:USA,UK,France
```

Sanction types: `trade_embargo`, `arms_embargo`, `financial`, `travel_ban`, `asset_freeze`, `partial`, `comprehensive`

**View sanctions:**
```
/sanction view nation:Germany
/sanction list
```

**Lift sanction:**
```
/sanction lift target:Germany type:trade_embargo reason:Peace treaty signed
```

### Black Market

Manage covert transactions outside normal channels.

**Create black market transaction (GM):**
```
/blackmarket create seller:USSR buyer:Cuba type:arms_deal amount:50M description:Missile shipment
```

Types: `arms_deal`, `contraband`, `intelligence`, `technology`, `resources`, `currency`

**Discover transaction:**
```
/blackmarket discover id:abc123 discovered_by:USA
```

**View transactions:**
```
/blackmarket view nation:USSR
/blackmarket list
/blackmarket list discovered:true
```

### Currency Exchange

Track exchange rates between currencies.

**Set exchange rate (GM):**
```
/exchange rate set from:Reichsmarks to:Dollars rate:0.4
```

**View rates:**
```
/exchange rate view from:Reichsmarks to:Dollars
/exchange rate list
```

**Fluctuate rates:**
```
/exchange fluctuate currency:Reichsmarks change:-10 reason:War uncertainty
```

### Economic Crises

Model economic downturns and their effects.

**Create crisis (GM):**
```
/econcrisis create name:Great Depression severity:severe region:global
```

Severity: `minor`, `moderate`, `severe`, `catastrophic`

**Apply to nation:**
```
/econcrisis apply crisis:Great Depression nation:Germany effects:gdp:-20,stability:-15
```

**Resolve crisis:**
```
/econcrisis resolve crisis:Great Depression outcome:Recovery began
```

**View crises:**
```
/econcrisis view crisis:Great Depression
/econcrisis list
```

---

## Advanced Diplomacy

### Espionage

Intelligence operations between nations.

**Launch operation (GM):**
```
/espionage launch operator:USA target:USSR type:intelligence mission:Gather military intel
```

Operation types: `intelligence`, `sabotage`, `assassination`, `propaganda`, `counter_intelligence`, `cyber`, `theft`

**Set operation parameters:**
```
/espionage resources operation_id:abc123 agents:5 funding:10M
```

**Resolve operation:**
```
/espionage resolve operation_id:abc123 success:true discovered:false
```

**View operations:**
```
/espionage view nation:USA
/espionage list status:active
```

### Alliances

Formal alliance organizations with membership and voting.

**Create alliance (GM):**
```
/alliance create name:NATO type:military description:North Atlantic Treaty Organization
```

Types: `military`, `economic`, `political`, `defensive`

**Add/remove members:**
```
/alliance member add alliance:NATO nation:USA role:founder
/alliance member remove alliance:NATO nation:France
```

**Create proposal:**
```
/alliance proposal create alliance:NATO type:expansion proposal:Admit West Germany
```

**Vote on proposal:**
```
/alliance proposal vote alliance:NATO proposal_id:abc123 nation:USA vote:yes
```

**View alliance:**
```
/alliance view alliance:NATO
/alliance list
```

### World Council

UN-style international body with resolutions.

**Create council (GM):**
```
/council create name:United Nations type:general description:International organization
```

**Add members:**
```
/council member add council:United Nations nation:USA role:permanent
```

**Propose resolution:**
```
/council resolution propose council:United Nations title:Sanctions on Aggressor type:sanction description:Economic sanctions against...
```

Resolution types: `sanction`, `peacekeeping`, `humanitarian`, `declaration`, `membership`, `condemnation`

**Vote on resolution:**
```
/council resolution vote council:United Nations resolution_id:abc123 nation:USA vote:yes
```

**Pass/fail resolution:**
```
/council resolution pass council:United Nations resolution_id:abc123
/council resolution fail council:United Nations resolution_id:abc123
```

**View council:**
```
/council view council:United Nations
/council resolution view resolution_id:abc123
```

### Government Types

Assign government systems with mechanical modifiers.

**Create template (GM):**
```
/government template create name:Federal Republic category:democracy succession:election
```

Categories: `democracy`, `republic`, `monarchy`, `constitutional_monarchy`, `dictatorship`, `communist`, `fascist`, `socialist`, `theocracy`, `oligarchy`, `military_junta`, `parliamentary`, `presidential`, `anarchy`, `custom`

**Set modifiers:**
```
/government modifiers set template:Federal Republic stability:10 economy_growth:5 freedom:80 coup_resistance:70
```

**Assign to nation:**
```
/government assign nation:Germany template:Federal Republic
```

**View government:**
```
/government view nation:Germany
/government template list
```

### Coups

Model coup attempts with success/failure mechanics.

**Plan coup (GM):**
```
/coup plan target:Chile leader:General Pinochet type:military backer:USA
```

Coup types: `military`, `political`, `popular`, `palace`, `foreign_backed`, `self_coup`

**Set factors:**
```
/coup factors target:Chile military:60 popular:30 elite:70 foreign:20
```

**Set resources:**
```
/coup resources target:Chile troops:5000 funding:10M
```

**Execute coup (roll for success):**
```
/coup execute target:Chile
```

**Manually resolve:**
```
/coup resolve target:Chile success:true leader_survived:true new_leader:Pinochet new_government:Military Junta
```

**View coup:**
```
/coup view target:Chile
/coup list
```

---

## Advanced Military

### Battle Simulator

Resolve combat with dice rolls and modifiers.

**Create battle (GM):**
```
/battle create name:Battle of Stalingrad attacker:Germany defender:USSR terrain:urban type:siege
```

Terrain: `plains`, `forest`, `mountains`, `urban`, `desert`, `jungle`, `arctic`, `coastal`, `river`, `marsh`, `hills`
Types: `pitched`, `siege`, `ambush`, `naval`, `aerial`, `amphibious`, `defensive`, `pursuit`, `skirmish`

**Set forces:**
```
/battle forces battle:Battle of Stalingrad side:attacker unit_type:Infantry quantity:300000 quality:70
/battle forces battle:Battle of Stalingrad side:defender unit_type:Infantry quantity:500000 quality:60
```

**Set modifiers:**
```
/battle modifiers battle:Battle of Stalingrad side:attacker supply:-20 morale:10
/battle modifiers battle:Battle of Stalingrad side:defender fortifications:30 terrain:20
```

**Set commanders:**
```
/battle commander battle:Battle of Stalingrad side:attacker name:Friedrich Paulus
/battle commander battle:Battle of Stalingrad side:defender name:Vasily Chuikov
```

**Simulate battle:**
```
/battle simulate battle:Battle of Stalingrad
```

**Manually resolve:**
```
/battle resolve battle:Battle of Stalingrad victor:defender decisiveness:decisive attacker_casualties:90 defender_casualties:40
```

**View battles:**
```
/battle view battle:Battle of Stalingrad
/battle list
/battle list nation:Germany
```

### Military Doctrines

Assign combat doctrines with bonuses.

**Create template (GM):**
```
/doctrine template create name:Blitzkrieg category:mobile description:Lightning war tactics
```

Categories: `offensive`, `defensive`, `mobile`, `guerrilla`, `combined_arms`, `naval`, `aerial`, `nuclear`, `irregular`, `siege`, `custom`

**Set modifiers:**
```
/doctrine modifiers set template:Blitzkrieg attack:20 mobility:30 morale:10 casualties:-10
```

**Add ability:**
```
/doctrine ability template:Blitzkrieg name:Encirclement description:Can surround enemy units effect:+25% casualty infliction
```

**Assign to nation:**
```
/doctrine assign nation:Germany template:Blitzkrieg
```

**View doctrine:**
```
/doctrine view nation:Germany
/doctrine template list
```

### Occupations

Track military occupations of territories.

**Create occupation (GM):**
```
/occupation create occupier:Germany occupied:France type:military territory:Northern France size:partial
```

Types: `military`, `administrative`, `colonial`, `protective`, `peacekeeping`, `annexation`

**Set garrison:**
```
/occupation garrison occupier:Germany occupied:France troops:500000 quality:60 maintenance:100M
```

**Set resistance:**
```
/occupation resistance occupier:Germany occupied:France level:40 type:armed partisans:50000 support:60
```

**Set policies:**
```
/occupation policy occupier:Germany occupied:France governance:military_admin civilian:strict economic:exploitation
```

**Set extraction:**
```
/occupation extraction occupier:Germany occupied:France resources:10000 wealth:500M level:heavy
```

**Record event:**
```
/occupation event occupier:Germany occupied:France type:Massacre description:Civilian reprisals civilian_casualties:500
```

**End occupation:**
```
/occupation end occupier:Germany occupied:France
```

**View occupation:**
```
/occupation view occupier:Germany occupied:France
/occupation list
```

### Arms Treaties

Nuclear and arms control agreements.

**Create treaty (GM):**
```
/armstreaty create name:SALT I type:arms_limitation description:Strategic Arms Limitation Treaty
```

Types: `nuclear_nonproliferation`, `arms_limitation`, `test_ban`, `disarmament`, `demilitarization`, `weapons_ban`, `custom`

**Set terms:**
```
/armstreaty terms treaty:SALT I nuclear_ban:false max_warheads:2400 inspections:true
```

**Ban weapons:**
```
/armstreaty ban treaty:Geneva Protocol weapon:Chemical Weapons
```

**Invite/sign/ratify:**
```
/armstreaty invite treaty:SALT I nation:USA
/armstreaty sign treaty:SALT I nation:USA
/armstreaty ratify treaty:SALT I nation:USA
```

**Record violation:**
```
/armstreaty violation treaty:NPT nation:Iran description:Secret enrichment facility severity:major
```

**Activate/collapse:**
```
/armstreaty activate treaty:SALT I
/armstreaty collapse treaty:SALT I
```

**View treaty:**
```
/armstreaty view treaty:SALT I
/armstreaty list
```

### Mercenaries

Hire and manage mercenary companies.

**Create company (GM):**
```
/mercenary company create name:Wagner Group type:private_military description:Russian PMC motto:Blood and Honor
```

Types: `private_military`, `mercenary_band`, `security_contractor`, `foreign_legion`, `volunteer_corps`, `pirates`, `rebel_fighters`, `custom`

**Set forces:**
```
/mercenary forces set company:Wagner Group infantry:5000 armor:50 special:500
```

**Set ratings:**
```
/mercenary ratings set company:Wagner Group combat:70 discipline:50 loyalty:60 morale:65 equipment:60
```

**Set pricing:**
```
/mercenary pricing set company:Wagner Group hire_cost:100M monthly:20M combat_bonus:5M currency:Dollars
```

**Set commander:**
```
/mercenary commander company:Wagner Group name:Dmitry Utkin background:Former GRU officer
```

**Add specialization:**
```
/mercenary specialization company:Wagner Group spec:urban
```

**Hire company:**
```
/mercenary hire company:Wagner Group nation:Syria duration:12 mission:Counter-insurgency operations
```

**Release company:**
```
/mercenary release company:Wagner Group reason:completed
```

**View company:**
```
/mercenary company view name:Wagner Group
/mercenary company list
/mercenary contracts nation:Syria
```

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
