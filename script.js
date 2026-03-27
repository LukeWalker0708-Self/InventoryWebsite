const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((node) => node.classList.remove('is-active'));
    panels.forEach((node) => node.classList.remove('is-active'));

    tab.classList.add('is-active');
    const target = document.getElementById(tab.dataset.target);
    if (target) target.classList.add('is-active');
  });
});

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

function saveTableState(tableId, data) {
  const table = document.getElementById(tableId);
  if (!table) return;

  const storageKey = table.dataset.storageKey;
  if (!storageKey) return;

  localStorage.setItem(storageKey, JSON.stringify(data));
}

function loadTableState(table) {
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

function ensureRowShape(data) {
  data.rows = data.rows.map((row) => {
    const normalized = Array.isArray(row) ? [...row] : [];

    if (normalized.length > data.columns.length) {
      normalized.length = data.columns.length;
    }

    while (normalized.length < data.columns.length) {
      normalized.push('');
    }

    return normalized;
  });
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
            `<td contenteditable="true" data-row-index="${rowIndex}" data-col-index="${columnIndex}">${cell ?? ''}</td>`,
        )
        .join('');

      return `<tr>${cells}</tr>`;
    })
    .join('');

  tbody.innerHTML = bodyHtml;
}

const tableStates = {};
const tableIds = ['product-development-table', 'product-index-table'];

tableIds.forEach((tableId) => {
  const table = document.getElementById(tableId);
  if (!table) return;

  const stateFromDom = parseTableFromDom(table);
  const stateFromStorage = loadTableState(table);
  tableStates[tableId] = stateFromStorage || stateFromDom;

  ensureRowShape(tableStates[tableId]);
  renderTable(tableId, tableStates[tableId]);
  saveTableState(tableId, tableStates[tableId]);
});

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
    saveTableState(tableId, state);
    return;
  }

  const rowIndex = Number(cellElement.dataset.rowIndex);
  state.rows[rowIndex][colIndex] = cellElement.textContent.trim();
  saveTableState(tableId, state);
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
  saveTableState(tableId, state);
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
  saveTableState(tableId, state);
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
  saveTableState(tableId, state);
}

document.querySelectorAll('[data-action]').forEach((button) => {
  button.addEventListener('click', () => {
    const action = button.dataset.action;
    const tableId = button.dataset.table;

    if (!tableId) return;

    if (action === 'add-row') addRow(tableId);
    if (action === 'add-column') addColumn(tableId);
    if (action === 'remove-column') removeColumn(tableId);
  });
});
