const STORAGE_KEY = 'inventory_workflow_mvp_v1';
const SESSION_KEY = 'inventory_workflow_session_v1';

const roles = {
  Admin: { modules: 'all', editable: 'all' },
  'Product Developer': { modules: ['productDevelopment', 'productIndex'], editable: ['productDevelopment', 'productIndex'] },
  Sales: { modules: ['productIndex', 'salesOrders'], editable: ['salesOrders'] },
  Purchasing: { modules: ['productIndex', 'purchaseOrders', 'workOrders'], editable: ['purchaseOrders', 'workOrders'] },
  QC: { modules: ['workOrders', 'qualityCheck'], editable: ['qualityCheck'] },
  Finance: { modules: ['paymentCenter'], editable: ['paymentCenter'] },
  Logistics: { modules: ['logisticOrder'], editable: ['logisticOrder'] },
};

const moduleDefs = [
  { key: 'productDevelopment', label: 'Product Development', relation: 'Approved rows can be pushed to Product Index.' },
  { key: 'productIndex', label: 'Product Index', relation: 'Master SKU source for all downstream modules.' },
  { key: 'salesOrders', label: 'Sales Orders', relation: 'Line items reference Product Index rowId + SKU.' },
  { key: 'purchaseOrders', label: 'Purchase Orders', relation: 'PO lines reference source SO rowId.' },
  { key: 'workOrders', label: 'Work Orders', relation: 'WO keeps links to source PO rows + factory assignment.' },
  { key: 'qualityCheck', label: 'Quality Check', relation: 'QC links to WO rows. PASS unlocks payment/logistics eligibility.' },
  { key: 'paymentCenter', label: 'Payment Center', relation: 'Payments reference PO/WO/supplier/qty/price/amount.' },
  { key: 'logisticOrder', label: 'Logistic Order', relation: 'Shipment rows reference PO/WO/SKU rows.' },
];

const defaultState = {
  productDevelopment: {
    columns: ['rowId', 'draftName', 'sku', 'category', 'material', 'approval', 'remark'],
    rows: [
      { rowId: 'PD-1', draftName: 'Summer Cooling Set', sku: 'BED-COOL-Q-001', category: 'Comforter Set', material: 'Microfiber', approval: 'Approved', remark: 'Ready for index' },
      { rowId: 'PD-2', draftName: 'Winter Plush Set', sku: 'BED-PLUSH-K-002', category: 'Comforter Set', material: 'Fleece', approval: 'Pending', remark: 'Sampling' },
    ],
  },
  productIndex: {
    columns: ['rowId', 'sku', 'name', 'category', 'size', 'color', 'unitPrice', 'status'],
    rows: [
      { rowId: 'PI-1', sku: 'BED-CORE-Q-100', name: 'Core Stripe Set', category: 'Comforter Set', size: 'Queen', color: 'Blue', unitPrice: '22.00', status: 'Active' },
    ],
  },
  salesOrders: {
    columns: ['rowId', 'soNo', 'soDate', 'customer', 'productRowId', 'sku', 'qty', 'unitPrice', 'sourceProductIndexRowId'],
    rows: [
      { rowId: 'SO-1-L1', soNo: 'SO-1001', soDate: '2026-03-24', customer: 'US Retailer A', productRowId: 'PI-1', sku: 'BED-CORE-Q-100', qty: '600', unitPrice: '22.00', sourceProductIndexRowId: 'PI-1' },
    ],
  },
  purchaseOrders: {
    columns: ['rowId', 'poNo', 'supplier', 'sourceSoRowId', 'sku', 'qty', 'status'],
    rows: [
      { rowId: 'PO-1-L1', poNo: 'PO-7001', supplier: 'Factory Alpha', sourceSoRowId: 'SO-1-L1', sku: 'BED-CORE-Q-100', qty: '600', status: 'Open' },
    ],
  },
  workOrders: {
    columns: ['rowId', 'woNo', 'factory', 'sourcePoRowId', 'sku', 'qty', 'status'],
    rows: [
      { rowId: 'WO-1-L1', woNo: 'WO-9001', factory: 'Factory Alpha', sourcePoRowId: 'PO-1-L1', sku: 'BED-CORE-Q-100', qty: '600', status: 'In Production' },
    ],
  },
  qualityCheck: {
    columns: ['rowId', 'qcNo', 'sourceWoRowId', 'sku', 'qtyChecked', 'qcStatus', 'remark'],
    rows: [
      { rowId: 'QC-1', qcNo: 'QC-3001', sourceWoRowId: 'WO-1-L1', sku: 'BED-CORE-Q-100', qtyChecked: '600', qcStatus: 'PASS', remark: 'Ready for payment/logistics' },
    ],
  },
  paymentCenter: {
    columns: ['rowId', 'paymentNo', 'supplier', 'sourcePoRowId', 'sourceWoRowId', 'sku', 'qty', 'unitPrice', 'amountDue', 'eligibility'],
    rows: [],
  },
  logisticOrder: {
    columns: ['rowId', 'logNo', 'carrier', 'sourcePoRowId', 'sourceWoRowId', 'sku', 'qty', 'shipStatus', 'etd', 'eta'],
    rows: [],
  },
};

let appState = structuredClone(defaultState);
let session = null;
let activeModuleKey = null;
const selectedRows = {};
const selectedColumns = {};
const importPreviews = {};

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      appState = mergeState(parsed);
    }
  } catch (_) {}
}

function mergeState(candidate) {
  const merged = structuredClone(defaultState);
  for (const moduleKey of Object.keys(merged)) {
    const source = candidate[moduleKey];
    if (!source || !Array.isArray(source.columns) || !Array.isArray(source.rows)) continue;
    merged[moduleKey].columns = source.columns.map(String);
    merged[moduleKey].rows = source.rows.map((row) => normalizeRow(moduleKey, row));
  }
  return merged;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function normalizeRow(moduleKey, row) {
  const columns = appState[moduleKey].columns;
  const result = {};
  for (const col of columns) {
    result[col] = row && row[col] != null ? String(row[col]) : '';
  }
  return result;
}

function setupAuth() {
  const roleSelect = document.getElementById('login-role');
  for (const role of Object.keys(roles)) {
    const option = document.createElement('option');
    option.value = role;
    option.textContent = role;
    roleSelect.appendChild(option);
  }

  document.getElementById('login-btn').addEventListener('click', () => {
    const name = document.getElementById('login-name').value.trim() || 'Demo User';
    const role = roleSelect.value;
    session = { name, role };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    enterApp();
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
    session = null;
    localStorage.removeItem(SESSION_KEY);
    document.getElementById('app-root').classList.add('hidden');
    document.getElementById('auth-root').classList.remove('hidden');
  });

  const saved = localStorage.getItem(SESSION_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed?.role && roles[parsed.role]) {
        session = parsed;
        enterApp();
      }
    } catch (_) {}
  }
}

function allowedModules(roleName) {
  const conf = roles[roleName];
  if (!conf) return [];
  if (conf.modules === 'all') return moduleDefs.map((m) => m.key);
  return conf.modules;
}

function canEdit(roleName, moduleKey) {
  const conf = roles[roleName];
  if (!conf) return false;
  if (conf.editable === 'all') return true;
  return conf.editable.includes(moduleKey);
}

function enterApp() {
  document.getElementById('auth-root').classList.add('hidden');
  document.getElementById('app-root').classList.remove('hidden');
  document.getElementById('current-user').textContent = `${session.name} (${session.role})`;

  renderNav();
  const mods = allowedModules(session.role);
  activeModuleKey = mods[0] || null;
  renderPanels();
  renderLineage();
}

function renderNav() {
  const nav = document.getElementById('module-nav');
  nav.innerHTML = '';
  for (const mod of moduleDefs) {
    if (!allowedModules(session.role).includes(mod.key)) continue;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `module-tab ${mod.key === activeModuleKey ? 'active' : ''}`;
    btn.textContent = mod.label;
    btn.addEventListener('click', () => {
      activeModuleKey = mod.key;
      renderNav();
      renderPanels();
      renderLineage();
    });
    nav.appendChild(btn);
  }
}

function moduleLabel(key) {
  return moduleDefs.find((m) => m.key === key)?.label || key;
}

function renderPanels() {
  const host = document.getElementById('module-panels');
  host.innerHTML = '';

  for (const mod of moduleDefs) {
    if (!allowedModules(session.role).includes(mod.key)) continue;
    const panel = document.createElement('div');
    panel.className = `module-panel ${mod.key === activeModuleKey ? 'active' : ''}`;

    const editable = true;
    panel.innerHTML = `
      <div class="panel-head">
        <h3>${mod.label}</h3>
        <div class="panel-actions">
          <button data-action="add-row" data-module="${mod.key}" ${!editable ? 'disabled class="locked"' : ''}>+ Row</button>
          <button data-action="add-col" data-module="${mod.key}" ${!editable ? 'disabled class="locked"' : ''}>+ Column</button>
          ${actionButton(mod.key)}
        </div>
      </div>
      <div class="notice">${mod.relation}</div>
      <div class="import-area">
        <strong>Excel Import (local only)</strong>
        <div>
          <input type="file" data-import-module="${mod.key}" accept=".xlsx,.xls,.csv" />
          <button data-action="apply-import" data-module="${mod.key}">Apply Import</button>
        </div>
        <div class="preview" id="preview-${mod.key}">No imported data yet.</div>
      </div>
      <div class="table-wrap">${renderTableHtml(mod.key, editable)}</div>
    `;

    host.appendChild(panel);
  }

  bindPanelEvents();
  updatePreviewBlocks();
}

function actionButton(moduleKey) {
  if (moduleKey === 'productDevelopment') return '<button data-action="push-approved" data-module="productDevelopment">Push Approved ➜ Product Index</button>';
  if (moduleKey === 'salesOrders') return '<button data-action="to-po" data-module="salesOrders">SO Rows ➜ Purchase Orders</button>';
  if (moduleKey === 'purchaseOrders') return '<button data-action="to-wo" data-module="purchaseOrders">PO Rows ➜ Work Orders</button>';
  if (moduleKey === 'qualityCheck') return '<button data-action="sync-qc" data-module="qualityCheck">Sync QC ➜ Payment/Logistics</button>';
  return '';
}

function renderTableHtml(moduleKey, editable) {
  const state = appState[moduleKey];
  const selectedCol = selectedColumns[moduleKey];
  const head = state.columns.map((col) => {
    const isSelected = selectedCol === col;
    const canDelete = editable && col !== 'rowId' && isSelected;
    return `
      <th
        contenteditable="${editable}"
        class="${isSelected ? 'selected-col' : ''}"
        data-cell-type="header"
        data-module="${moduleKey}"
        data-col="${col}"
        data-select-col="${col}"
      >
        <span>${col}</span>
        ${canDelete ? `<button type="button" class="inline-trash" data-action="delete-col" data-module="${moduleKey}" data-column="${col}" title="Delete column ${col}">🗑</button>` : ''}
      </th>
    `;
  }).join('');
  const body = state.rows.map((row, idx) => {
    const rowClass = selectedRows[moduleKey] === idx ? 'selected' : '';
    const cells = state.columns.map((col) => `<td contenteditable="${editable}" data-cell-type="body" data-module="${moduleKey}" data-row="${idx}" data-col="${col}">${escapeHtml(row[col] || '')}</td>`).join('');
    const rowTrash = editable && selectedRows[moduleKey] === idx
      ? `<button type="button" class="inline-trash" data-action="delete-row" data-module="${moduleKey}" data-row="${idx}" title="Delete row ${idx + 1}">🗑</button>`
      : '';
    return `<tr class="${rowClass}" data-select-row="${idx}" data-module="${moduleKey}">${cells}<td class="row-tools">${rowTrash}</td></tr>`;
  }).join('');
  return `<table><thead><tr>${head}<th class="row-tools-col">Row</th></tr></thead><tbody>${body}</tbody></table>`;
}

function escapeHtml(v) {
  return v
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function bindPanelEvents() {
  document.querySelectorAll('[data-action]').forEach((node) => {
    node.addEventListener('click', (event) => {
      const btn = event.currentTarget;
      const action = btn.dataset.action;
      const moduleKey = btn.dataset.module;
      if (action === 'add-row') addRow(moduleKey);
      if (action === 'add-col') addColumn(moduleKey);
      if (action === 'delete-row') removeRow(moduleKey, Number(btn.dataset.row));
      if (action === 'delete-col') removeColumn(moduleKey, btn.dataset.column);
      if (action === 'push-approved') pushApprovedToIndex();
      if (action === 'to-po') convertSoToPo();
      if (action === 'to-wo') convertPoToWo();
      if (action === 'sync-qc') syncQcToDownstream();
      if (action === 'apply-import') applyImport(moduleKey);
    });
  });

  document.querySelectorAll('th[contenteditable="true"], td[contenteditable="true"]').forEach((cell) => {
    cell.addEventListener('focus', onCellFocus);
    cell.addEventListener('keydown', onCellKeydown);
    cell.addEventListener('blur', onCellBlur);
  });

  document.querySelectorAll('tr[data-select-row]').forEach((rowNode) => {
    rowNode.addEventListener('click', (event) => {
      if (event.target.closest('td[data-cell-type="body"][contenteditable="true"]')) return;
      selectedRows[rowNode.dataset.module] = Number(rowNode.dataset.selectRow);
      renderPanels();
      renderLineage();
    });
  });

  document.querySelectorAll('th[data-select-col]').forEach((headerNode) => {
    headerNode.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      const moduleKey = headerNode.dataset.module;
      selectedColumns[moduleKey] = headerNode.dataset.selectCol;
      renderPanels();
    });
  });

  document.querySelectorAll('input[type="file"][data-import-module]').forEach((input) => {
    input.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const moduleKey = input.dataset.importModule;
      await previewImport(moduleKey, file);
      updatePreviewBlocks();
    });
  });
}

function onCellBlur(event) {
  const cell = event.currentTarget;
  const moduleKey = cell.dataset.module;
  const col = cell.dataset.col;
  if (!moduleKey || !col) return;
  if (cell.dataset.cancelEdit === 'true') {
    cell.dataset.cancelEdit = 'false';
    return;
  }

  if (cell.dataset.cellType === 'header') {
    const oldCol = col;
    const newCol = (cell.textContent || '').trim() || oldCol;
    if (newCol === oldCol) return;
    renameColumn(moduleKey, oldCol, newCol);
    return;
  }

  const rowIdx = Number(cell.dataset.row);
  appState[moduleKey].rows[rowIdx][col] = (cell.textContent || '').trim();
  saveState();
}

function onCellFocus(event) {
  const cell = event.currentTarget;
  cell.dataset.originalValue = cell.textContent || '';
}

function onCellKeydown(event) {
  const cell = event.currentTarget;
  if (event.key === 'Escape') {
    event.preventDefault();
    cell.textContent = cell.dataset.originalValue || '';
    cell.dataset.cancelEdit = 'true';
    cell.blur();
    return;
  }

  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    cell.blur();
  }
}

function renameColumn(moduleKey, oldName, newName) {
  const mod = appState[moduleKey];
  if (mod.columns.includes(newName) && newName !== oldName) {
    alert('Column already exists.');
    renderPanels();
    return;
  }
  mod.columns = mod.columns.map((col) => (col === oldName ? newName : col));
  mod.rows.forEach((row) => {
    row[newName] = row[oldName] ?? '';
    if (newName !== oldName) delete row[oldName];
  });
  saveState();
  renderPanels();
}

function addRow(moduleKey) {
  const mod = appState[moduleKey];
  const row = {};
  for (const col of mod.columns) row[col] = '';
  mod.rows.push(row);
  selectedRows[moduleKey] = mod.rows.length - 1;
  saveState();
  renderPanels();
  renderLineage();
}

function removeRow(moduleKey, forcedIdx = null) {
  const mod = appState[moduleKey];
  const idx = forcedIdx ?? selectedRows[moduleKey];
  if (idx == null || idx < 0 || idx >= mod.rows.length) {
    alert('Select a row first.');
    return;
  }
  mod.rows.splice(idx, 1);
  selectedRows[moduleKey] = Math.max(0, idx - 1);
  saveState();
  renderPanels();
  renderLineage();
}

function addColumn(moduleKey) {
  const mod = appState[moduleKey];
  const name = prompt('New column name:');
  if (!name) return;
  if (mod.columns.includes(name)) return alert('Column exists.');
  mod.columns.push(name);
  mod.rows.forEach((row) => { row[name] = ''; });
  saveState();
  renderPanels();
}

function removeColumn(moduleKey, columnName = null) {
  const mod = appState[moduleKey];
  const name = columnName ?? prompt(`Column to remove:\n${mod.columns.join(', ')}`);
  if (!name) return;
  if (!mod.columns.includes(name)) return alert('Column not found.');
  if (name === 'rowId') return alert('rowId cannot be removed.');
  mod.columns = mod.columns.filter((c) => c !== name);
  mod.rows.forEach((row) => { delete row[name]; });
  if (selectedColumns[moduleKey] === name) selectedColumns[moduleKey] = null;
  saveState();
  renderPanels();
}

function nextId(prefix, moduleKey) {
  const rows = appState[moduleKey].rows;
  return `${prefix}-${rows.length + 1}-${Date.now().toString().slice(-4)}`;
}

function pushApprovedToIndex() {
  const pdRows = appState.productDevelopment.rows;
  const idx = appState.productIndex;

  let count = 0;
  for (const row of pdRows) {
    if ((row.approval || '').toLowerCase() !== 'approved') continue;
    const exists = idx.rows.some((r) => r.sku === row.sku);
    if (exists) continue;
    idx.rows.push(normalizeRow('productIndex', {
      rowId: nextId('PI', 'productIndex'),
      sku: row.sku,
      name: row.draftName,
      category: row.category,
      size: '',
      color: '',
      unitPrice: '',
      status: 'Draft from PD',
    }));
    count += 1;
  }
  saveState();
  renderPanels();
  alert(`Pushed ${count} approved item(s) into Product Index.`);
}

function convertSoToPo() {
  const soIdx = selectedRows.salesOrders;
  if (soIdx == null) return alert('Select an SO row first.');
  const soRow = appState.salesOrders.rows[soIdx];
  if (!soRow) return;

  appState.purchaseOrders.rows.push(normalizeRow('purchaseOrders', {
    rowId: nextId('PO', 'purchaseOrders'),
    poNo: `PO-${Date.now().toString().slice(-6)}`,
    supplier: 'Factory Alpha',
    sourceSoRowId: soRow.rowId,
    sku: soRow.sku,
    qty: soRow.qty,
    status: 'Open',
  }));
  saveState();
  renderPanels();
}

function convertPoToWo() {
  const poIdx = selectedRows.purchaseOrders;
  if (poIdx == null) return alert('Select a PO row first.');
  const poRow = appState.purchaseOrders.rows[poIdx];
  if (!poRow) return;

  appState.workOrders.rows.push(normalizeRow('workOrders', {
    rowId: nextId('WO', 'workOrders'),
    woNo: `WO-${Date.now().toString().slice(-6)}`,
    factory: poRow.supplier,
    sourcePoRowId: poRow.rowId,
    sku: poRow.sku,
    qty: poRow.qty,
    status: 'Assigned',
  }));
  saveState();
  renderPanels();
}

function syncQcToDownstream() {
  const passedWoIds = new Set(
    appState.qualityCheck.rows
      .filter((row) => (row.qcStatus || '').toUpperCase() === 'PASS')
      .map((row) => row.sourceWoRowId),
  );

  const woById = Object.fromEntries(appState.workOrders.rows.map((wo) => [wo.rowId, wo]));

  for (const woId of passedWoIds) {
    const wo = woById[woId];
    if (!wo) continue;
    const existingPay = appState.paymentCenter.rows.some((r) => r.sourceWoRowId === woId);
    const existingLog = appState.logisticOrder.rows.some((r) => r.sourceWoRowId === woId);

    if (!existingPay) {
      const unitPrice = 12;
      const qty = Number(wo.qty || 0);
      appState.paymentCenter.rows.push(normalizeRow('paymentCenter', {
        rowId: nextId('PAY', 'paymentCenter'),
        paymentNo: `PAY-${Date.now().toString().slice(-6)}`,
        supplier: wo.factory,
        sourcePoRowId: wo.sourcePoRowId,
        sourceWoRowId: wo.rowId,
        sku: wo.sku,
        qty: String(qty),
        unitPrice: String(unitPrice),
        amountDue: String((qty * unitPrice).toFixed(2)),
        eligibility: 'QC_PASS',
      }));
    }

    if (!existingLog) {
      appState.logisticOrder.rows.push(normalizeRow('logisticOrder', {
        rowId: nextId('LOG', 'logisticOrder'),
        logNo: `LOG-${Date.now().toString().slice(-6)}`,
        carrier: 'OceanLine',
        sourcePoRowId: wo.sourcePoRowId,
        sourceWoRowId: wo.rowId,
        sku: wo.sku,
        qty: wo.qty,
        shipStatus: 'Ready',
        etd: '',
        eta: '',
      }));
    }
  }

  saveState();
  renderPanels();
  alert('QC sync complete. PASS rows are available in Payment Center and Logistic Order.');
}

async function previewImport(moduleKey, file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    const text = await file.text();
    const rows = text.split(/\r?\n/).filter(Boolean).map((line) => line.split(','));
    capturePreview(moduleKey, rows);
    return;
  }

  if (!window.XLSX) {
    alert('XLSX parser not loaded.');
    return;
  }

  const data = await file.arrayBuffer();
  const wb = window.XLSX.read(data);
  const firstSheet = wb.SheetNames[0];
  const sheet = wb.Sheets[firstSheet];
  const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
  capturePreview(moduleKey, rows);
}

function capturePreview(moduleKey, rows2d) {
  if (!rows2d.length) return;
  const [header, ...rest] = rows2d;
  const columns = header.map((c) => String(c || '').trim()).filter(Boolean);
  const rows = rest
    .filter((r) => r.some((x) => String(x || '').trim() !== ''))
    .map((r) => {
      const obj = {};
      columns.forEach((col, i) => {
        obj[col] = r[i] != null ? String(r[i]) : '';
      });
      return obj;
    });

  importPreviews[moduleKey] = { columns, rows };
}

function updatePreviewBlocks() {
  for (const moduleKey of Object.keys(appState)) {
    const div = document.getElementById(`preview-${moduleKey}`);
    if (!div) continue;
    const preview = importPreviews[moduleKey];
    if (!preview) {
      div.textContent = 'No imported data yet.';
      continue;
    }

    const sampleRows = preview.rows.slice(0, 5)
      .map((r) => `<tr>${preview.columns.map((col) => `<td>${escapeHtml(r[col] || '')}</td>`).join('')}</tr>`)
      .join('');

    div.innerHTML = `<table><thead><tr>${preview.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>${sampleRows}</tbody></table>`;
  }
}

function applyImport(moduleKey) {
  const preview = importPreviews[moduleKey];
  if (!preview) return alert('No import preview found.');

  const baseColumns = preview.columns.includes('rowId') ? preview.columns : ['rowId', ...preview.columns];
  appState[moduleKey].columns = baseColumns;
  appState[moduleKey].rows = preview.rows.map((row, i) => {
    const mapped = {};
    for (const col of baseColumns) mapped[col] = row[col] ?? '';
    if (!mapped.rowId) mapped.rowId = `${moduleKey}-${i + 1}`;
    return mapped;
  });

  saveState();
  renderPanels();
  alert(`${moduleLabel(moduleKey)} import applied.`);
}

function lineageFor(moduleKey, row) {
  if (!row) return ['No row selected.'];

  const refs = [`Module: ${moduleLabel(moduleKey)}`];
  const keys = ['rowId', 'sku', 'sourceProductIndexRowId', 'sourceSoRowId', 'sourcePoRowId', 'sourceWoRowId', 'qcStatus', 'eligibility'];

  for (const key of keys) {
    if (row[key]) refs.push(`${key}: ${row[key]}`);
  }

  if (moduleKey === 'qualityCheck') {
    refs.push((row.qcStatus || '').toUpperCase() === 'PASS' ? 'Downstream: Eligible for payment/logistics' : 'Downstream: Not eligible');
  }

  return refs;
}

function renderLineage() {
  const panel = document.getElementById('lineage-content');
  if (!activeModuleKey) {
    panel.textContent = 'No module selected.';
    return;
  }

  const idx = selectedRows[activeModuleKey];
  const row = appState[activeModuleKey].rows[idx];
  const refs = lineageFor(activeModuleKey, row);
  panel.innerHTML = refs.map((r) => {
    const cls = r.includes('PASS') || r.includes('Eligible') ? 'status-pass' : r.includes('FAIL') || r.includes('Not eligible') ? 'status-fail' : '';
    return `<div class="ref-chip ${cls}">${escapeHtml(r)}</div>`;
  }).join('');
}

loadState();
setupAuth();
