# Phase 1: Optional Staging Database Configuration

## Overview

When in-memory storage mode is enabled (`STORAGE_TYPE=memory`), the staging database configuration should be optional. The system should not repeatedly prompt users to configure databases when they're using in-memory storage.

## Current State Analysis

### Problem Statement
1. Users in memory storage mode are repeatedly prompted to configure staging DB
2. Setup modal shows "Database configuration Required" even in memory mode
3. `EnhancedConfigCheck` blocks users when `requireDbConfig=true` in memory mode
4. `checkConfigBeforeWorkflow()` redirects to config page even in memory mode
5. Welcome modal shows DB as "Required" badge instead of "Optional" in memory mode

### Files Affected
```
app/src/hooks/useSetupCheck.ts         - Already handles isMemoryStorage
app/src/hooks/useUserConfig.ts         - Already handles isMemoryStorage
app/src/components/setup/enhanced-config-check.tsx
app/src/components/setup/setup-welcome-modal.tsx
app/src/components/layouts/dashboard-layout.tsx
app/src/app/config/page.tsx
```

## Functional Requirements

### FR-1: Setup Status Should Reflect Memory Mode
```
WHEN storage_type == "memory"
THEN hasDbConfig should be TRUE (or dbConfigOptional should be TRUE)
AND isFullyConfigured = hasAiConfig (DB not required)
```

### FR-2: Welcome Modal Should Show DB as Optional
```
WHEN isMemoryStorage == true
THEN Database card shows badge "Optional" instead of "Required"
AND Database description mentions "Using in-memory storage"
AND canSkip should be TRUE regardless of DB config
```

### FR-3: Config Check Should Not Block in Memory Mode
```
WHEN requireDbConfig == true AND isMemoryStorage == true
THEN treat as requireDbConfig == false
AND do not redirect to config page for missing DB
```

### FR-4: Workflow Checks Should Respect Memory Mode
```
WHEN checkConfigBeforeWorkflow() is called
AND isMemoryStorage == true
THEN only require AI config for workflows
AND do not redirect for missing DB config
```

### FR-5: Config Page Should Clearly Show Mode
```
WHEN isMemoryStorage == true
THEN show prominent "In-Memory Mode" indicator
AND show DB forms as "Optional - for persistent storage"
AND update workflow redirect message
```

## Pseudocode

### Module: useSetupCheck.ts (Updates)

```pseudocode
INTERFACE SetupStatus:
  isLoading: boolean
  hasDbConfig: boolean
  hasAiConfig: boolean
  isFullyConfigured: boolean
  isMemoryStorage: boolean
  dbConfigOptional: boolean  // NEW: explicit flag

FUNCTION checkSetupStatus():
  // Fetch system info first
  systemInfo = AWAIT fetch('/api/system-info')
  isMemoryStorage = systemInfo.storage_type == 'memory'

  // Fetch DB config
  dbConfig = AWAIT fetchDbConfig()
  hasDbConfig = dbConfig?.stagingDb?.uri AND dbConfig?.prodDb?.uri

  // In memory mode, DB config is optional
  IF isMemoryStorage:
    dbConfigOptional = TRUE
    effectiveHasDbConfig = TRUE  // Treat as configured for gating
  ELSE:
    dbConfigOptional = FALSE
    effectiveHasDbConfig = hasDbConfig

  // Fetch AI config
  aiConfig = AWAIT fetchAiConfig()
  hasAiConfig = aiConfig?.api_key_masked AND aiConfig?.default_model_name

  // Fully configured depends on mode
  IF isMemoryStorage:
    isFullyConfigured = hasAiConfig  // Only AI required
  ELSE:
    isFullyConfigured = effectiveHasDbConfig AND hasAiConfig

  RETURN {
    isLoading: FALSE,
    hasDbConfig: effectiveHasDbConfig,
    hasAiConfig,
    isFullyConfigured,
    isMemoryStorage,
    dbConfigOptional,
    dbConfig,
    aiConfig
  }
```

### Module: setup-welcome-modal.tsx (Updates)

```pseudocode
FUNCTION SetupWelcomeModal(props):
  { setupStatus } = props

  // Calculate steps based on mode
  IF setupStatus.isMemoryStorage:
    totalSteps = 1  // Only AI config
    requiredSteps = [setupStatus.hasAiConfig]
  ELSE:
    totalSteps = 2  // DB + AI
    requiredSteps = [setupStatus.hasDbConfig, setupStatus.hasAiConfig]

  completedSteps = COUNT(requiredSteps WHERE step == TRUE)

  // Build checklist
  setupChecklist = []

  IF NOT setupStatus.isMemoryStorage:
    setupChecklist.PUSH({
      label: 'Database connections',
      completed: setupStatus.hasDbConfig,
      required: TRUE
    })
  ELSE:
    setupChecklist.PUSH({
      label: 'Database connections',
      completed: setupStatus.hasDbConfig,
      required: FALSE,
      note: 'Optional - using in-memory storage'
    })

  setupChecklist.PUSH({
    label: 'AI integration',
    completed: setupStatus.hasAiConfig,
    required: TRUE
  })

  // Can skip if memory mode OR db configured
  canSkip = setupStatus.isMemoryStorage OR setupStatus.hasDbConfig

  RENDER:
    // Progress bar
    Progress(value: completedSteps / totalSteps * 100)

    // Database Card
    DatabaseCard:
      IF setupStatus.isMemoryStorage:
        badge: "Optional"
        description: "Using in-memory storage. Configure databases for persistent storage."
        showConfigButton: TRUE but not urgent
      ELSE IF setupStatus.hasDbConfig:
        badge: "Configured"
        showConnectedStatus: TRUE
      ELSE:
        badge: "Required"
        description: "Connect staging and production databases"
        showConfigButton: TRUE, urgent

    // AI Card (unchanged logic)
    AICard:
      badge: setupStatus.hasAiConfig ? "Configured" : "Required"

    // Action buttons
    IF canSkip AND NOT isFullyConfigured:
      SHOW "Skip for now" button
```

### Module: enhanced-config-check.tsx (Updates)

```pseudocode
FUNCTION EnhancedConfigCheck(props):
  { requireDbConfig, requireAiConfig, children } = props
  { setupStatus } = useSetupCheck()

  // Effective requirements based on storage mode
  effectiveRequireDbConfig = requireDbConfig AND NOT setupStatus.isMemoryStorage

  // Check what's actually missing
  missingDbConfig = effectiveRequireDbConfig AND NOT setupStatus.hasDbConfig
  missingAiConfig = requireAiConfig AND NOT setupStatus.hasAiConfig

  shouldBlock = (missingDbConfig OR missingAiConfig) AND NOT isConfigPage

  IF shouldBlock AND NOT lightweight:
    RENDER blocking card:
      IF missingDbConfig:
        "Database configuration required"
      ELSE IF missingAiConfig:
        "AI configuration required"
  ELSE:
    RENDER children
    IF showSetupModal:
      RENDER SetupWelcomeModal(setupStatus)
```

### Module: useUserConfig.ts (Updates)

```pseudocode
FUNCTION checkConfigBeforeWorkflow():
  IF NOT isLoaded OR loading:
    RETURN { success: FALSE, error: 'Loading...' }

  IF NOT user:
    redirect('/sign-in')
    RETURN { success: FALSE, error: 'Not authenticated' }

  // In memory mode, only AI config is required
  IF isMemoryStorage:
    IF NOT hasAiConfig:
      redirect('/config?tab=ai&reason=workflow')
      RETURN { success: FALSE, error: 'AI configuration required' }
    RETURN { success: TRUE }

  // In neo4j mode, both required
  IF NOT hasConfig:
    redirect('/config?reason=workflow')
    RETURN { success: FALSE, error: 'Database configuration required' }

  IF NOT hasAiConfig:
    redirect('/config?tab=ai&reason=workflow')
    RETURN { success: FALSE, error: 'AI configuration required' }

  RETURN { success: TRUE }
```

### Module: config/page.tsx (Updates)

```pseudocode
FUNCTION ConfigPage():
  { isMemoryStorage } = useSystemInfo()

  RENDER:
    // Mode indicator at top
    IF isMemoryStorage:
      Alert(type: "info"):
        "In-Memory Storage Mode Active"
        "Database configuration is optional. Data will be stored temporarily."

    // Workflow redirect message
    IF isWorkflowRedirect:
      IF isMemoryStorage:
        Alert: "AI Configuration Required for workflows"
      ELSE:
        Alert: "Database & AI Configuration Required for workflows"

    // Database tab content
    DatabaseTab:
      StatusCard:
        IF isMemoryStorage:
          badge: "Optional"
          description: "Using in-memory storage. Configure for persistent data."
        ELSE IF config:
          badge: "Configured"
        ELSE:
          badge: "Setup Required"

      // Forms always available but messaging differs
      DatabaseForms:
        IF isMemoryStorage:
          title: "Optional: Persistent Storage"
          subtitle: "Connect databases to persist data across sessions"
        ELSE:
          title: "Required: Database Connections"
          subtitle: "Configure staging and production databases"
```

## Test Anchors (TDD)

```pseudocode
// useSetupCheck tests
TEST "returns dbConfigOptional=true when memory storage":
  MOCK systemInfo = { storage_type: 'memory' }
  MOCK dbConfig = null
  result = useSetupCheck()
  ASSERT result.dbConfigOptional == TRUE
  ASSERT result.hasDbConfig == TRUE  // Treated as configured
  ASSERT result.isMemoryStorage == TRUE

TEST "isFullyConfigured only requires AI in memory mode":
  MOCK systemInfo = { storage_type: 'memory' }
  MOCK dbConfig = null
  MOCK aiConfig = { api_key_masked: '***', default_model_name: 'gemini' }
  result = useSetupCheck()
  ASSERT result.isFullyConfigured == TRUE

TEST "isFullyConfigured requires both in neo4j mode":
  MOCK systemInfo = { storage_type: 'neo4j' }
  MOCK dbConfig = null
  MOCK aiConfig = { api_key_masked: '***', default_model_name: 'gemini' }
  result = useSetupCheck()
  ASSERT result.isFullyConfigured == FALSE

// setup-welcome-modal tests
TEST "shows DB as Optional badge in memory mode":
  RENDER SetupWelcomeModal({ setupStatus: { isMemoryStorage: true } })
  ASSERT badge.text == "Optional"

TEST "allows skip in memory mode without DB config":
  RENDER SetupWelcomeModal({
    setupStatus: { isMemoryStorage: true, hasDbConfig: false }
  })
  ASSERT skipButton.visible == TRUE

// enhanced-config-check tests
TEST "does not block for missing DB in memory mode":
  RENDER EnhancedConfigCheck({
    requireDbConfig: true,
    children: <Content />
  })
  WITH setupStatus = { isMemoryStorage: true, hasDbConfig: false }
  ASSERT Content.rendered == TRUE
  ASSERT blockingCard.visible == FALSE

// useUserConfig tests
TEST "checkConfigBeforeWorkflow only requires AI in memory mode":
  setupHook({ isMemoryStorage: true, hasConfig: false, hasAiConfig: true })
  result = checkConfigBeforeWorkflow()
  ASSERT result.success == TRUE
  ASSERT redirect.notCalled

TEST "checkConfigBeforeWorkflow redirects for AI even in memory mode":
  setupHook({ isMemoryStorage: true, hasConfig: false, hasAiConfig: false })
  result = checkConfigBeforeWorkflow()
  ASSERT result.success == FALSE
  ASSERT redirect.calledWith('/config?tab=ai&reason=workflow')
```

## Implementation Order

1. **useSetupCheck.ts** - Add `dbConfigOptional` flag, fix `isFullyConfigured` logic
2. **useUserConfig.ts** - Fix `checkConfigBeforeWorkflow()` to respect memory mode
3. **enhanced-config-check.tsx** - Use effective requirements
4. **setup-welcome-modal.tsx** - Show optional badge, fix canSkip, update copy
5. **config/page.tsx** - Already mostly done, minor copy updates

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Memory mode, no DB, no AI | Show AI as required, DB as optional |
| Memory mode, has DB, no AI | Show AI as required, DB as configured |
| Memory mode, no DB, has AI | Fully configured, no prompts |
| Neo4j mode, no DB, has AI | DB required, redirect to config |
| Neo4j mode, has DB, no AI | AI required, redirect to AI tab |
| Switch from memory to neo4j | Re-evaluate requirements on next check |

## Security Considerations

- No changes to authentication flow
- No changes to credential storage
- Memory mode flag comes from trusted backend `/system-info`

## Rollback Plan

If issues arise:
1. Set `STORAGE_TYPE=neo4j` in backend to disable memory mode
2. Revert frontend changes (all in 4-5 files)
3. Users will see standard DB required flow
