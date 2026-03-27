const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');

const API_BASE = '/api/tables';

const tableStates = {};
const tableBaseStates = {};
const tableIds = ['product-development-table', 'product-index-table'];

function deepCopy(data) {
  return JSON.parse(JSON.stringify(data));
}

function rowsEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return false;
  }

  return a.every((cell, index) => String(cell) === String(b[index]));
}

function stateEquals(a, b) {
  if (!a || !b) return false;
  if (!rowsEqual(a.columns, b.columns)) return false;
  if (!Array.isArray(a.rows) || !Array.isArray(b.rows) || a.rows.length !== b.rows.length) return false;

  return a.rows.every((row, index) => rowsEqual(row, b.rows[index]));
}

function normalizeRow(row, columnCount) {
  const normalized = Array.isArray(row) ? row.map((cell) => String(cell == null ? '' : cell)) : [];

  if (normalized.length > columnCount) {
    normalized.length = columnCount;
  }

  while (normalized.length < columnCount) {
    normalized.push('');
  }

  return normalized;
}

function ensureRowShape(data) {
  data.rows = data.rows.map((row) => normalizeRow(row, data.columns.length));
}

function mergeColumns(baseColumns, localColumns, remoteColumns) {
  const result = [...remoteColumns];
  const maxLength = Math.max(baseColumns.length, localColumns.length, remoteColumns.length);

  for (let index = 0; index < maxLength; index += 1) {
    const baseValue = baseColumns[index];
    const localValue = localColumns[index];
    const remoteValue = result[index];

    if (localValue === undefined && remoteValue === undefined) continue;
    if (remoteValue === undefined && localValue !== undefined) {
      result[index] = localValue;
      continue;
    }
    if (localValue === undefined || localValue === remoteValue) continue;

    const localChanged = baseValue === undefined ? true : localValue !== baseValue;
    const remoteChanged = baseValue === undefined ? true : remoteValue !== baseValue;

    if (localChanged && !remoteChanged) {
      result[index] = localValue;
      continue;
    }

    if (localChanged && remoteChanged && !result.includes(localValue)) {
      result.push(localValue);
    }
  }

  return result.map((column, index) => String(column == null ? `Column ${index + 1}` : column));
}

function mergeRows(baseRows, localRows, remoteRows, columnCount) {
  const result = remoteRows.map((row) => normalizeRow(row, columnCount));
  const maxLength = Math.max(baseRows.length, localRows.length, remoteRows.length);

  for (let index = 0; index < maxLength; index += 1) {
    const baseRow = index < baseRows.length ? normalizeRow(baseRows[index], columnCount) : null;
    const localRow = index < localRows.length ? normalizeRow(localRows[index], columnCount) : null;
    const remoteRow = index < remoteRows.length ? normalizeRow(remoteRows[index], columnCount) : null;

    if (!localRow) continue;

    if (!remoteRow) {
      if (!result.some((row) => rowsEqual(row, localRow))) {
        result.push(localRow);
      }
      continue;
    }

    if (rowsEqual(localRow, remoteRow)) continue;

    const localChanged = !baseRow || !rowsEqual(localRow, baseRow);
    const remoteChanged = !baseRow || !rowsEqual(remoteRow, baseRow);

    if (localChanged && !remoteChanged) {
      result[index] = localRow;
      continue;
    }

    if (localChanged && remoteChanged && !result.some((row) => rowsEqual(row, localRow))) {
      result.push(localRow);
    }
  }

  return result;
}

function mergeStates(baseState, localState, remoteState) {
  const baseColumns = baseState && Array.isArray(baseState.columns) ? baseState.columns : [];
  const localColumns = localState && Array.isArray(localState.columns) ? localState.columns : [];
  const remoteColumns = remoteState && Array.isArray(remoteState.columns) ? remoteState.columns : [];

  const columns = mergeColumns(baseColumns, localColumns, remoteColumns);

  const baseRows = baseState && Array.isArray(baseState.rows) ? baseState.rows : [];
  const localRows = localState && Array.isArray(localState.rows) ? localState.rows : [];
  const remoteRows = remoteState && Array.isArray(remoteState.rows) ? remoteState.rows : [];

  const rows = mergeRows(baseRows, localRows, remoteRows, columns.length);

  return { columns, rows };
}

function getApplyButton(tableId) {
  return document.querySelector(`[data-action="apply-changes"][data-table="${tableId}"]`);
}

function setApplyButtonState(tableId, disabled, text) {
  const button = getApplyButton(tableId);
  if (!button) return;

  button.disabled = disabled;
  if (text) {
    button.dataset.defaultText = button.dataset.defaultText || button.textContent;
    button.textContent = text;
  } else if (button.dataset.defaultText) {
    button.textContent = button.dataset.defaultText;
  }
}


function hasTableContent(state) {
  if (!state || !Array.isArray(state.columns) || !Array.isArray(state.rows)) {
    return false;
  }

  return state.columns.length > 0 || state.rows.length > 0;
}

function parseTableFromDom(table) {
  const columns = [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim());
  const rows = [...table.querySelectorAll('tbody tr')].map((tr) => {
    const cells = [...tr.querySelectorAll('td')].map((td) => td.textContent.trim());

    while (cells.length < columns.length) {
      cells.push('');
    }

    return cells;
  });

  return { columns, rows };
}

function loadTableStateFromLocal(table) {
  const storageKey = table.dataset.storageKey;
  if (!storageKey) return null;

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.columns) || !Array.isArray(parsed.rows)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function cacheTableStateLocally(tableId, data) {
  const table = document.getElementById(tableId);
  if (!table) return;

  const storageKey = table.dataset.storageKey;
  if (!storageKey) return;

  localStorage.setItem(storageKey, JSON.stringify(data));
}

async function loadTableStateFromApi(tableId) {
  try {
    const response = await fetch(`${API_BASE}/${encodeURIComponent(tableId)}`);
    if (!response.ok) return null;

    const payload = await response.json();
    if (!payload || !Array.isArray(payload.columns) || !Array.isArray(payload.rows)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

async function saveTableStateToApi(tableId, data) {
  const response = await fetch(`${API_BASE}/${encodeURIComponent(tableId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  return response.ok;
}

function renderTable(tableId, data) {
  const table = document.getElementById(tableId);
  if (!table) return;

  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');

  const headerHtml = data.columns
    .map(
      (column, index) =>
        `<th contenteditable="true" data-col-index="${index}">${column || `Column ${index + 1}`}</th>`,
    )
    .join('');

  thead.innerHTML = `<tr>${headerHtml}</tr>`;

  const bodyHtml = data.rows
    .map((row, rowIndex) => {
      const cells = row
        .map(
          (cell, columnIndex) =>
            `<td contenteditable="true" data-row-index="${rowIndex}" data-col-index="${columnIndex}">${cell == null ? '' : cell}</td>`,
        )
        .join('');

      return `<tr>${cells}</tr>`;
    })
    .join('');

  tbody.innerHTML = bodyHtml;
}

function persistLocalDraft(tableId) {
  const state = tableStates[tableId];
  if (!state) return;

  ensureRowShape(state);
  cacheTableStateLocally(tableId, state);
}

function updateCellValue(cellElement) {
  const table = cellElement.closest('table');
  if (!table) return;

  const tableId = table.id;
  const state = tableStates[tableId];
  if (!state) return;

  const colIndex = Number(cellElement.dataset.colIndex);

  if (cellElement.tagName === 'TH') {
    state.columns[colIndex] = cellElement.textContent.trim() || `Column ${colIndex + 1}`;
    renderTable(tableId, state);
    persistLocalDraft(tableId);
    return;
  }

  const rowIndex = Number(cellElement.dataset.rowIndex);
  state.rows[rowIndex][colIndex] = cellElement.textContent.trim();
  persistLocalDraft(tableId);
}

document.querySelectorAll('table').forEach((table) => {
  table.addEventListener('focusout', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.matches('[contenteditable="true"]')) return;

    updateCellValue(target);
  });
});

function addRow(tableId) {
  const state = tableStates[tableId];
  if (!state) return;

  state.rows.push(new Array(state.columns.length).fill(''));
  renderTable(tableId, state);
  persistLocalDraft(tableId);
}

function addColumn(tableId) {
  const state = tableStates[tableId];
  if (!state) return;

  const newName = window.prompt('New column name:', `Column ${state.columns.length + 1}`);
  if (newName === null) return;

  const finalName = newName.trim() || `Column ${state.columns.length + 1}`;
  state.columns.push(finalName);
  state.rows.forEach((row) => row.push(''));

  renderTable(tableId, state);
  persistLocalDraft(tableId);
}

function removeColumn(tableId) {
  const state = tableStates[tableId];
  if (!state || state.columns.length === 0) return;

  const choice = window.prompt(
    `Enter column number to remove (1-${state.columns.length}):`,
    String(state.columns.length),
  );

  if (choice === null) return;

  const index = Number(choice) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= state.columns.length) {
    window.alert('Invalid column number.');
    return;
  }

  state.columns.splice(index, 1);
  state.rows.forEach((row) => row.splice(index, 1));

  renderTable(tableId, state);
  persistLocalDraft(tableId);
}

async function applyChanges(tableId) {
  const localState = tableStates[tableId];
  if (!localState) return;

  setApplyButtonState(tableId, true, 'Applying...');

  try {
    const remoteState = await loadTableStateFromApi(tableId);
    if (!remoteState) {
      window.alert('Cannot reach shared server. Please retry after connection is restored.');
      return;
    }

    const baseState = tableBaseStates[tableId] || { columns: [], rows: [] };
    const merged = mergeStates(baseState, localState, remoteState);
    ensureRowShape(merged);

    const saveOk = await saveTableStateToApi(tableId, merged);
    if (!saveOk) {
      window.alert('Apply failed on server. Please retry.');
      return;
    }

    tableStates[tableId] = deepCopy(merged);
    tableBaseStates[tableId] = deepCopy(merged);
    renderTable(tableId, merged);
    cacheTableStateLocally(tableId, merged);

    if (!stateEquals(localState, merged)) {
      window.alert('Conflict detected. Both edits were kept in separate rows/columns and merged.');
    } else {
      window.alert('Changes applied to shared table.');
    }
  } catch {
    window.alert('Unexpected error while applying changes. Please retry.');
  } finally {
    setApplyButtonState(tableId, false);
  }
}

document.querySelectorAll('[data-action]').forEach((button) => {
  button.addEventListener('click', () => {
    const action = button.dataset.action;
    const tableId = button.dataset.table;

    if (!tableId) return;

    if (action === 'add-row') addRow(tableId);
    if (action === 'add-column') addColumn(tableId);
    if (action === 'remove-column') removeColumn(tableId);
    if (action === 'apply-changes') applyChanges(tableId);
  });
});

async function initializeTables() {
  for (const tableId of tableIds) {
    const table = document.getElementById(tableId);
    if (!table) continue;

    const stateFromDom = parseTableFromDom(table);
    const stateFromApi = await loadTableStateFromApi(tableId);
    const stateFromLocal = loadTableStateFromLocal(table);

    const preferredRemote = hasTableContent(stateFromApi) ? stateFromApi : null;
    const initial = preferredRemote || stateFromLocal || stateFromDom;
    ensureRowShape(initial);

    tableStates[tableId] = deepCopy(initial);
    tableBaseStates[tableId] = deepCopy(preferredRemote || initial);

    renderTable(tableId, tableStates[tableId]);
    cacheTableStateLocally(tableId, tableStates[tableId]);
  }
}

initializeTables();
