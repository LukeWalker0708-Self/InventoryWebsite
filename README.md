# InventoryWebsite

Initial front-end framework for:

- Product Development table
- Product Index table

Now includes a lightweight Python API so table edits are shared for all users connected to the same deployed server.

## Run locally

```bash
python3 server.py
```

Open <http://localhost:8000>.


## Multi-user sync behavior

- Edit rows/columns in the browser as usual.
- Click **Apply Changes** to push your edits to shared server state.
- If two users edit the same row before applying, both versions are preserved by the merge logic (conflicting local row is appended as a new row).
