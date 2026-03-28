# InventoryWebsite MVP (Local-First)

Local MVP admin system for a bedding inventory/order workflow.

## Scope in this phase

- **No real-time sync / cloud sync / collaboration sync**.
- Editable table modules with local state (`localStorage`).
- Role-based login mock (local only).
- Relational workflow links across modules.
- Simple Excel import (`.xlsx/.xls/.csv`) with preview before apply.

## Modules

1. Product Development
2. Product Index
3. Sales Orders
4. Purchase Orders
5. Work Orders
6. Quality Check
7. Payment Center
8. Logistic Order

## Run locally

```bash
python3 server.py
```

Open <http://localhost:8000>.

## Notes

- Data is stored only in browser local storage under `inventory_workflow_mvp_v1`.
- This is intended for stable local editing and workflow demoing.
