# Fix: Add Quantum Cards to CARD_CATALOG

## Problem
The Quantum cards (quantum_control_panel, quantum_status, quantum_qubit_grid, quantum_histogram, quantum_circuit_viewer) are registered in the code but NOT listed in CARD_CATALOG, so they don't appear in the "Add Card" dialog.

## Solution
Add Quantum category and entries to CARD_CATALOG in `web/src/components/dashboard/shared/cardCatalog.ts`.

## File to Modify: `web/src/components/dashboard/shared/cardCatalog.ts`

**Location**: Find line 332 (after 'Streaming & Messaging' category) and add a new Quantum category before it.

### Step 1: Add Quantum category and cards to CARD_CATALOG

Find the 'Streaming & Messaging' entry around line 330:
```typescript
  'Streaming & Messaging': [
    { type: 'strimzi_status', title: 'Strimzi', description: 'Strimzi Kafka cluster health, topic status, and consumer group lag', visualization: 'status' },
  ],
} as const
```

**Add this new Quantum category RIGHT BEFORE the closing `} as const`:**

```typescript
  'Quantum': [
    { type: 'quantum_control_panel', title: 'Quantum Control Panel', description: 'Execute quantum circuits and manage backends', visualization: 'status' },
    { type: 'quantum_status', title: 'Quantum Status', description: 'Quantum backend status and system information', visualization: 'status' },
    { type: 'quantum_histogram', title: 'Quantum Histogram', description: 'Quantum result histogram visualization', visualization: 'bar' },
    { type: 'quantum_qubit_grid', title: 'Quantum Qubit Grid', description: 'Qubit state visualization with measurement results', visualization: 'status' },
    { type: 'quantum_circuit_viewer', title: 'Quantum Circuit Viewer', description: 'Display quantum circuit diagrams from execution results', visualization: 'status' },
  ],
} as const
```

The full section should look like:
```typescript
  'Streaming & Messaging': [
    { type: 'strimzi_status', title: 'Strimzi', description: 'Strimzi Kafka cluster health, topic status, and consumer group lag', visualization: 'status' },
  ],
  'Quantum': [
    { type: 'quantum_control_panel', title: 'Quantum Control Panel', description: 'Execute quantum circuits and manage backends', visualization: 'status' },
    { type: 'quantum_status', title: 'Quantum Status', description: 'Quantum backend status and system information', visualization: 'status' },
    { type: 'quantum_histogram', title: 'Quantum Histogram', description: 'Quantum result histogram visualization', visualization: 'bar' },
    { type: 'quantum_qubit_grid', title: 'Quantum Qubit Grid', description: 'Qubit state visualization with measurement results', visualization: 'status' },
    { type: 'quantum_circuit_viewer', title: 'Quantum Circuit Viewer', description: 'Display quantum circuit diagrams from execution results', visualization: 'status' },
  ],
} as const
```

### Step 2: Add Quantum to CATEGORY_LOCALE_KEYS

Find the CATEGORY_LOCALE_KEYS object around line 354 and add:
```typescript
  'Quantum': 'quantum',
```

It should be added at the end of the list, before the closing `}`. For example:
```typescript
  'Streaming & Messaging': 'streamingMessaging',
  'Quantum': 'quantum',
}
```

## Steps with Claude CLI

1. **Open the file**:
   ```bash
   cd /home/kproche/new-console/console
   claude --file web/src/components/dashboard/shared/cardCatalog.ts
   ```

2. **Find** line 330-333 (the 'Streaming & Messaging' section at the end)

3. **Add** the new Quantum category and cards before the `} as const` closing on line 333

4. **Find** CATEGORY_LOCALE_KEYS around line 354 and add the 'Quantum' entry

5. **Save and exit**

## Rebuild and Test

```bash
cd web && npm run build
```

Then check the "Add Card" dialog — all 5 Quantum cards should now appear in the "Quantum" category.
```

You can now copy this and run `claude --file web/src/components/dashboard/shared/cardCatalog.ts` to make the edits!

### claude-code (5/4/2026, 4:09:05 PM)

You're absolutely right! Now I can see the correct file. The quantum cards are NOT in the CARD_CATALOG. I need to add entries for them. Let me create the corrected instructions for you:

```markdown
# Fix: Add Quantum Cards to CARD_CATALOG

## Problem
The Quantum cards (quantum_control_panel, quantum_status, quantum_qubit_grid, quantum_histogram, quantum_circuit_viewer) are registered in the code but NOT listed in CARD_CATALOG, so they don't appear in the "Add Card" dialog.

## Solution
Add Quantum category and entries to CARD_CATALOG in `web/src/components/dashboard/shared/cardCatalog.ts`.

## File to Modify: `web/src/components/dashboard/shared/cardCatalog.ts`

**Location**: Find line 332 (after 'Streaming & Messaging' category) and add a new Quantum category before it.

### Step 1: Add Quantum category and cards to CARD_CATALOG

Find the 'Streaming & Messaging' entry around line 330:
```typescript
  'Streaming & Messaging': [
    { type: 'strimzi_status', title: 'Strimzi', description: 'Strimzi Kafka cluster health, topic status, and consumer group lag', visualization: 'status' },
  ],
} as const
```

**Add this new Quantum category RIGHT BEFORE the closing `} as const`:**

```typescript
  'Quantum': [
    { type: 'quantum_control_panel', title: 'Quantum Control Panel', description: 'Execute quantum circuits and manage backends', visualization: 'status' },
    { type: 'quantum_status', title: 'Quantum Status', description: 'Quantum backend status and system information', visualization: 'status' },
    { type: 'quantum_histogram', title: 'Quantum Histogram', description: 'Quantum result histogram visualization', visualization: 'bar' },
    { type: 'quantum_qubit_grid', title: 'Quantum Qubit Grid', description: 'Qubit state visualization with measurement results', visualization: 'status' },
    { type: 'quantum_circuit_viewer', title: 'Quantum Circuit Viewer', description: 'Display quantum circuit diagrams from execution results', visualization: 'status' },
  ],
} as const
```

The full section should look like:
```typescript
  'Streaming & Messaging': [
    { type: 'strimzi_status', title: 'Strimzi', description: 'Strimzi Kafka cluster health, topic status, and consumer group lag', visualization: 'status' },
  ],
  'Quantum': [
    { type: 'quantum_control_panel', title: 'Quantum Control Panel', description: 'Execute quantum circuits and manage backends', visualization: 'status' },
    { type: 'quantum_status', title: 'Quantum Status', description: 'Quantum backend status and system information', visualization: 'status' },
    { type: 'quantum_histogram', title: 'Quantum Histogram', description: 'Quantum result histogram visualization', visualization: 'bar' },
    { type: 'quantum_qubit_grid', title: 'Quantum Qubit Grid', description: 'Qubit state visualization with measurement results', visualization: 'status' },
    { type: 'quantum_circuit_viewer', title: 'Quantum Circuit Viewer', description: 'Display quantum circuit diagrams from execution results', visualization: 'status' },
  ],
} as const
```

### Step 2: Add Quantum to CATEGORY_LOCALE_KEYS

Find the CATEGORY_LOCALE_KEYS object around line 354 and add:
```typescript
  'Quantum': 'quantum',
```

It should be added at the end of the list, before the closing `}`. For example:
```typescript
  'Streaming & Messaging': 'streamingMessaging',
  'Quantum': 'quantum',
}
```

## Steps with Claude CLI

1. **Open the file**:
   ```bash
   cd /home/kproche/new-console/console
   claude --file web/src/components/dashboard/shared/cardCatalog.ts
   ```

2. **Find** line 330-333 (the 'Streaming & Messaging' section at the end)

3. **Add** the new Quantum category and cards before the `} as const` closing on line 333

4. **Find** CATEGORY_LOCALE_KEYS around line 354 and add the 'Quantum' entry

5. **Save and exit**

## Rebuild and Test

```bash
cd web && npm run build
```

Then check the "Add Card" dialog — all 5 Quantum cards should now appear in the "Quantum" category.