const STORAGE_KEY = 'inventory_schema_v2';
const SESSION_KEY = 'inventory_workflow_session_v1';

const EMPLOYEE_OPTIONS = ['Alice', 'Bob', 'Carol', 'David'];

const roles = {
  Admin: { modules: 'all' },
  'Product Developer': { modules: ['productIndex', 'newProductDevelopment'] },
  Sales: { modules: ['productIndex', 'salesOrders', 'detailsSalesOrders'] },
  Purchasing: { modules: ['productIndex', 'purchaseOrders', 'detailsPurchaseOrders'] },
};

const TABLE_SCHEMAS = {
  productIndex: {
    label: 'Product Index',
    relation: 'Master source for SKU-driven options and detail-table auto-fill.',
    columns: [
      { key: 'rowId', type: 'serialText', readOnly: true },
      { key: 'date', type: 'date' },
      { key: 'isApproval', type: 'boolean' },
      { key: 'onlineDate', type: 'date' },
      { key: 'pattern', type: 'select', options: ['Solid', 'Stripe', 'Printed'] },
      { key: 'sku', type: 'text' },
      { key: 'picture', type: 'image' },
      { key: 'unitPrice', type: 'number' },
      { key: 'status', type: 'select', options: ['New', 'Sale', 'Discontinue', 'Unavailable'] },
      { key: 'category', type: 'select', options: ['Comforter', 'Sheet Set', 'Pillow'] },
      { key: 'size', type: 'select', options: ['Twin', 'Queen', 'King'] },
      { key: 'color', type: 'select', options: ['White', 'Blue', 'Gray', 'Pink'] },
      { key: 'material', type: 'select', options: ['Cotton', 'Microfiber', 'Bamboo'] },
      { key: 'packageType', type: 'select', options: ['Box', 'Bag', 'Vacuum'] },
      { key: 'lengthIn', type: 'number' },
      { key: 'widthIn', type: 'number' },
      { key: 'heightIn', type: 'number' },
      { key: 'volumeFt3', type: 'number' },
      { key: 'weightLbs', type: 'number' },
      { key: 'brand', type: 'text' },
      { key: 'productionCycleDays', type: 'number' },
    ],
  },
  newProductDevelopment: {
    label: 'New Product Development',
    relation: 'Internal development records with separate itemNumber and sellable SKU fields.',
    columns: [
      { key: 'kfId', type: 'serialText' },
      { key: 'date', type: 'date' },
      { key: 'factory', type: 'select', options: ['Factory A', 'Factory B', 'Factory C'] },
      { key: 'pattern', type: 'select', options: ['Solid', 'Stripe', 'Printed'] },
      { key: 'itemNumber', type: 'serialText' },
      { key: 'picture', type: 'image' },
      { key: 'category', type: 'select', options: ['Comforter', 'Sheet Set', 'Pillow'] },
      { key: 'material', type: 'select', options: ['Cotton', 'Microfiber', 'Bamboo'] },
      { key: 'size', type: 'number' },
      { key: 'componentSize', type: 'number' },
      { key: 'color', type: 'select', options: ['White', 'Blue', 'Gray', 'Pink'] },
      { key: 'packageType', type: 'select', options: ['Box', 'Bag', 'Vacuum'] },
      { key: 'lengthIn', type: 'number' },
      { key: 'widthIn', type: 'number' },
      { key: 'heightIn', type: 'number' },
      { key: 'volumeFt3', type: 'number' },
      { key: 'weightLbs', type: 'number' },
      { key: 'unitPriceFOB', type: 'number' },
      { key: 'referenceMarketPrice', type: 'number' },
      { key: 'leadTimeDays', type: 'number' },
      { key: 'targetMarket', type: 'select', options: ['US', 'EU', 'JP'] },
      { key: 'targetStore', type: 'select', options: ['Store A', 'Store B', 'Store C'] },
      { key: 'isSample', type: 'boolean' },
      { key: 'riskAssessment', type: 'select', options: ['High Risk - Fragile Items', 'Medium Risk - Long Lead Time', 'Low Risk - Mature Design'] },
      { key: 'riskLevel', type: 'select', options: ['High Risk', 'Medium Risk', 'Low Risk'] },
      { key: 'riskReason', type: 'select', dependentOn: 'riskLevel', optionsByValue: {
        'High Risk': ['Fragile Items', 'Complex Craft', 'Unstable Supply'],
        'Medium Risk': ['Long Lead Time', 'New Material'],
        'Low Risk': ['Mature Design'],
      }},
      { key: 'remark', type: 'select', options: ['Cost - Need cost-down', 'Design - Artwork pending', 'Quality - Lab test needed', 'Delivery - Rush order'] },
      { key: 'remarkCategory', type: 'select', options: ['Cost', 'Design', 'Quality', 'Delivery'] },
      { key: 'remarkDetail', type: 'select', dependentOn: 'remarkCategory', optionsByValue: {
        Cost: ['Need cost-down', 'FOB confirmed'],
        Design: ['Artwork pending', 'Design approved'],
        Quality: ['Lab test needed', 'Risk accepted'],
        Delivery: ['Rush order', 'Normal timeline'],
      }},
      { key: 'isApproval', type: 'select', options: ['Approved', 'isPending', 'notApproved'] },
      { key: 'applicator', type: 'text' },
    ],
  },
  salesOrders: {
    label: 'Sales Orders',
    relation: 'skuIncluded derives from Product Index SKU; poRelated derives from Purchase Orders.',
    columns: [
      { key: 'salesOrderId', type: 'serialText' },
      { key: 'date', type: 'date' },
      { key: 'store', type: 'select', options: ['Amazon', 'Walmart', 'Target'] },
      { key: 'skuIncluded', type: 'select', optionsFrom: { module: 'productIndex', field: 'sku' } },
      { key: 'quantity', type: 'number' },
      { key: 'amount', type: 'number' },
      { key: 'poRelated', type: 'select', optionsFrom: { module: 'purchaseOrders', field: 'poId' } },
      { key: 'applicator', type: 'select', options: EMPLOYEE_OPTIONS },
      { key: 'isApproved', type: 'boolean' },
    ],
  },
  detailsSalesOrders: {
    label: 'Details of Sales Orders',
    relation: 'Select SKU to auto-fill product fields from Product Index (editable after auto-fill).',
    columns: [
      { key: 'rowId', type: 'serialText' },
      { key: 'salesOrderId', type: 'reference', reference: { module: 'salesOrders', field: 'salesOrderId' } },
      { key: 'designName', type: 'select', options: ['Design A', 'Design B', 'Design C'] },
      { key: 'category', type: 'select', optionsFrom: { module: 'productIndex', field: 'category' } },
      { key: 'sku', type: 'select', optionsFrom: { module: 'productIndex', field: 'sku' } },
      { key: 'color', type: 'select', optionsFrom: { module: 'productIndex', field: 'color' } },
      { key: 'size', type: 'select', optionsFrom: { module: 'productIndex', field: 'size' } },
      { key: 'quantity', type: 'number' },
      { key: 'unit', type: 'select', options: ['pcs', 'set', 'ctn'] },
      { key: 'unitPrice', type: 'number' },
      { key: 'amount', type: 'number' },
      { key: 'material', type: 'select', optionsFrom: { module: 'productIndex', field: 'material' } },
      { key: 'packageType', type: 'select', optionsFrom: { module: 'productIndex', field: 'packageType' } },
      { key: 'picture', type: 'image' },
    ],
  },
  purchaseOrders: {
    label: 'Purchase Orders',
    relation: 'skuIncluded is currently single-select but schema-ready for multiSelect upgrade.',
    columns: [
      { key: 'poId', type: 'serialText' },
      { key: 'date', type: 'date' },
      { key: 'skuIncluded', type: 'select', optionsFrom: { module: 'productIndex', field: 'sku' }, upgradeTo: 'multiSelect' },
      { key: 'quantity', type: 'number' },
      { key: 'amount', type: 'number' },
      { key: 'edd', type: 'date' },
      { key: 'factory', type: 'select', options: ['Factory A', 'Factory B', 'Factory C'] },
      { key: 'manufacturingStatus', type: 'select', options: ['In Progress', 'not Started', 'Completed'] },
      { key: 'startDate', type: 'date' },
      { key: 'endDate', type: 'date' },
      { key: 'paymentStatus', type: 'select', options: ['Fully Paid', 'Partially Paid', 'N/A'] },
    ],
  },
  detailsPurchaseOrders: {
    label: 'Details of Purchase Orders',
    relation: 'salesOrderIncluded uses multiSelect options from Sales Orders; SKU auto-fills product fields.',
    columns: [
      { key: 'rowId', type: 'serialText' },
      { key: 'poId', type: 'reference', reference: { module: 'purchaseOrders', field: 'poId' } },
      { key: 'designName', type: 'select', options: ['Design A', 'Design B', 'Design C'] },
      { key: 'item', type: 'select', options: ['Item A', 'Item B', 'Item C'] },
      { key: 'sku', type: 'select', optionsFrom: { module: 'productIndex', field: 'sku' } },
      { key: 'color', type: 'select', optionsFrom: { module: 'productIndex', field: 'color' } },
      { key: 'size', type: 'select', optionsFrom: { module: 'productIndex', field: 'size' } },
      { key: 'quantity', type: 'number' },
      { key: 'unit', type: 'select', options: ['pcs', 'set', 'ctn'] },
      { key: 'price', type: 'number' },
      { key: 'amount', type: 'number' },
      { key: 'date', type: 'date' },
      { key: 'salesOrderIncluded', type: 'multiSelect', optionsFrom: { module: 'salesOrders', field: 'salesOrderId' } },
      { key: 'category', type: 'select', optionsFrom: { module: 'productIndex', field: 'category' } },
      { key: 'material', type: 'select', optionsFrom: { module: 'productIndex', field: 'material' } },
      { key: 'packageType', type: 'select', optionsFrom: { module: 'productIndex', field: 'packageType' } },
      { key: 'picture', type: 'image' },
    ],
  },
};

const moduleDefs = Object.entries(TABLE_SCHEMAS).map(([key, value]) => ({ key, label: value.label, relation: value.relation }));

const defaultState = {
  productIndex: { rows: [{ rowId: 'PI1', date: '2026-03-28', isApproval: 'Yes', onlineDate: '2026-03-30', pattern: 'Solid', sku: 'SKU-001', picture: '', unitPrice: '22', status: 'New', category: 'Comforter', size: 'Queen', color: 'Blue', material: 'Cotton', packageType: 'Box', lengthIn: '90', widthIn: '90', heightIn: '8', volumeFt3: '2.2', weightLbs: '8', brand: 'KF Home', productionCycleDays: '35' }] },
  newProductDevelopment: { rows: [] },
  salesOrders: { rows: [] },
  detailsSalesOrders: { rows: [] },
  purchaseOrders: { rows: [] },
  detailsPurchaseOrders: { rows: [] },
};

let appState = initState(defaultState);
let session = null;
let activeModuleKey = moduleDefs[0].key;

function initState(source) {
  const seeded = {};
  for (const moduleKey of Object.keys(TABLE_SCHEMAS)) {
    const inputRows = source[moduleKey]?.rows || [];
    const normalizedRows = inputRows.map((r) => normalizeRow(moduleKey, r));
    seeded[moduleKey] = { rows: normalizedRows.length ? normalizedRows : [buildBlankRow(moduleKey, normalizedRows)] };
  }
  return seeded;
}

function normalizeRow(moduleKey, row) {
  const next = {};
  for (const col of TABLE_SCHEMAS[moduleKey].columns) {
    next[col.key] = row?.[col.key] != null ? String(row[col.key]) : '';
  }
  return next;
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    appState = initState(JSON.parse(raw));
  } catch (_) {}
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
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
    session = { name: document.getElementById('login-name').value.trim() || 'Demo User', role: roleSelect.value };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    enterApp();
  });
  document.getElementById('logout-btn').addEventListener('click', () => {
    session = null;
    localStorage.removeItem(SESSION_KEY);
    document.getElementById('app-root').classList.add('hidden');
    document.getElementById('auth-root').classList.remove('hidden');
  });
  try {
    const parsed = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
    if (parsed.role && roles[parsed.role]) {
      session = parsed;
      enterApp();
    }
  } catch (_) {}
}

function allowedModules(roleName) {
  const role = roles[roleName];
  if (!role) return [];
  return role.modules === 'all' ? moduleDefs.map((m) => m.key) : role.modules;
}

function enterApp() {
  document.getElementById('auth-root').classList.add('hidden');
  document.getElementById('app-root').classList.remove('hidden');
  document.getElementById('current-user').textContent = `${session.name} (${session.role})`;
  activeModuleKey = allowedModules(session.role)[0] || moduleDefs[0].key;
  renderNav();
  renderPanels();
  renderLineage();
}

function renderNav() {
  const host = document.getElementById('module-nav');
  host.innerHTML = '';
  for (const mod of moduleDefs) {
    if (!allowedModules(session.role).includes(mod.key)) continue;
    const button = document.createElement('button');
    button.className = `module-tab ${activeModuleKey === mod.key ? 'active' : ''}`;
    button.textContent = mod.label;
    button.type = 'button';
    button.addEventListener('click', () => {
      activeModuleKey = mod.key;
      renderNav();
      renderPanels();
      renderLineage();
    });
    host.appendChild(button);
  }
}

function renderPanels() {
  const host = document.getElementById('module-panels');
  host.innerHTML = '';
  for (const mod of moduleDefs) {
    if (!allowedModules(session.role).includes(mod.key)) continue;
    const panel = document.createElement('div');
    panel.className = `module-panel ${activeModuleKey === mod.key ? 'active' : ''}`;
    const amountButton = mod.key === 'salesOrders' ? '<button data-action="auto-amount">Auto-calc Amounts</button>' : '';
    panel.innerHTML = `
      <div class="panel-head">
        <h3>${mod.label}</h3>
        <div class="panel-actions">
          <button data-action="add-row" data-module="${mod.key}">+ Row</button>
          ${amountButton}
        </div>
      </div>
      <div class="notice">${mod.relation}</div>
      <div class="table-wrap">${renderTable(mod.key)}</div>
    `;
    host.appendChild(panel);
  }
  bindEvents();
}

function renderTable(moduleKey) {
  const schema = TABLE_SCHEMAS[moduleKey];
  const head = `<th class="row-tools-col">Row</th>${schema.columns.map((c) => `<th>${c.key}</th>`).join('')}`;
  const body = appState[moduleKey].rows.map((row, rowIdx) => {
    const cells = schema.columns.map((col) => `<td>${renderInput(moduleKey, col, row[col.key], rowIdx)}</td>`).join('');
    const rowTools = `
      <td class="row-tools">
        <button class="inline-trash" type="button" title="Delete row" data-action="delete-row" data-module="${moduleKey}" data-row="${rowIdx}">−</button>
      </td>
    `;
    return `<tr>${rowTools}${cells}</tr>`;
  }).join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function renderInput(moduleKey, col, value, rowIdx) {
  const disabled = col.readOnly ? 'disabled' : '';
  const meta = `data-module="${moduleKey}" data-row="${rowIdx}" data-col="${col.key}" data-type="${col.type}"`;
  if (col.type === 'date') return `<input type="date" class="cell-input" value="${escapeHtml(value)}" ${meta} ${disabled}/>`;
  if (col.type === 'number') return `<input type="number" step="any" class="cell-input" value="${escapeHtml(value)}" ${meta} ${disabled}/>`;
  if (col.type === 'boolean') {
    const options = ['', 'Yes', 'No'];
    const opts = options.map((option) => {
      const label = option || '';
      return `<option value="${option}" ${option === value ? 'selected' : ''}>${label}</option>`;
    }).join('');
    return `<select class="cell-input" ${meta} ${disabled}>${opts}</select>`;
  }
  if (col.type === 'select' || col.type === 'reference') {
    const options = resolveOptions(moduleKey, col, rowIdx);
    return `<select class="cell-input" ${meta} ${disabled}>${renderOptions(options, value)}</select>`;
  }
  if (col.type === 'multiSelect') {
    const selected = new Set((value || '').split('|').filter(Boolean));
    const options = resolveOptions(moduleKey, col, rowIdx);
    const html = options.map((opt) => `<option value="${escapeHtml(opt)}" ${selected.has(opt) ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('');
    return `<select multiple size="3" class="cell-input" ${meta} ${disabled}>${html}</select>`;
  }
  if (col.type === 'image') {
    const preview = value ? `<a href="${escapeHtml(value)}" target="_blank" rel="noreferrer">preview</a>` : '';
    return `<div><input type="text" class="cell-input" placeholder="Image URL" value="${escapeHtml(value)}" ${meta} ${disabled}/>${preview}</div>`;
  }
  return `<input type="text" class="cell-input" value="${escapeHtml(value)}" ${meta} ${disabled}/>`;
}

function renderOptions(options, selected) {
  const base = ['<option value=""></option>'];
  for (const option of options) {
    base.push(`<option value="${escapeHtml(option)}" ${option === selected ? 'selected' : ''}>${escapeHtml(option)}</option>`);
  }
  return base.join('');
}

function resolveOptions(moduleKey, col, rowIdx) {
  if (col.optionsFrom) {
    return uniqueValues(col.optionsFrom.module, col.optionsFrom.field);
  }
  if (col.reference) {
    return uniqueValues(col.reference.module, col.reference.field);
  }
  if (col.optionsByValue) {
    const row = appState[moduleKey].rows[rowIdx] || {};
    const depValue = row[col.dependentOn] || '';
    return col.optionsByValue[depValue] || [];
  }
  return col.options || [];
}

function uniqueValues(moduleKey, field) {
  const values = appState[moduleKey].rows.map((r) => String(r[field] || '').trim()).filter(Boolean);
  return [...new Set(values)];
}

function bindEvents() {
  document.querySelectorAll('[data-action="add-row"]').forEach((btn) => {
    btn.onclick = () => addRow(btn.dataset.module);
  });
  document.querySelectorAll('[data-action="delete-row"]').forEach((btn) => {
    btn.onclick = () => deleteRow(btn.dataset.module, Number(btn.dataset.row));
  });
  document.querySelectorAll('[data-action="auto-amount"]').forEach((btn) => {
    btn.onclick = () => autoCalcSalesOrderAmounts();
  });
  document.querySelectorAll('.cell-input[data-module]').forEach((input) => {
    const eventName = input.tagName === 'SELECT' ? 'change' : 'blur';
    input.addEventListener(eventName, () => persistCell(input));
    if (eventName !== 'change') input.addEventListener('change', () => persistCell(input));
  });
}

function persistCell(input) {
  const moduleKey = input.dataset.module;
  const rowIdx = Number(input.dataset.row);
  const colKey = input.dataset.col;
  const colDef = TABLE_SCHEMAS[moduleKey].columns.find((c) => c.key === colKey);
  if (!colDef) return;
  let value = '';
  if (colDef.type === 'multiSelect') {
    value = [...input.selectedOptions].map((o) => o.value).filter(Boolean).join('|');
  } else {
    value = String(input.value || '').trim();
  }
  appState[moduleKey].rows[rowIdx][colKey] = value;

  if (colKey === 'sku' && (moduleKey === 'detailsSalesOrders' || moduleKey === 'detailsPurchaseOrders')) {
    hydrateFromProductIndex(moduleKey, rowIdx, value);
  }

  if ((colKey === 'quantity' || colKey === 'unitPrice' || colKey === 'price') && (moduleKey === 'detailsSalesOrders' || moduleKey === 'detailsPurchaseOrders')) {
    autoCalcDetailAmount(moduleKey, rowIdx);
  }

  saveState();
  renderPanels();
  renderLineage();
}

function hydrateFromProductIndex(moduleKey, rowIdx, sku) {
  const source = appState.productIndex.rows.find((row) => row.sku === sku);
  if (!source) return;
  const target = appState[moduleKey].rows[rowIdx];
  const copyMap = {
    category: source.category,
    color: source.color,
    size: source.size,
    material: source.material,
    packageType: source.packageType,
    picture: source.picture,
  };
  if (moduleKey === 'detailsSalesOrders') copyMap.unitPrice = source.unitPrice;
  if (moduleKey === 'detailsPurchaseOrders') copyMap.price = source.unitPrice;
  for (const [k, v] of Object.entries(copyMap)) {
    if (!Object.hasOwn(target, k) || target[k]) continue;
    target[k] = String(v || '');
  }
}

function autoCalcDetailAmount(moduleKey, rowIdx) {
  const row = appState[moduleKey].rows[rowIdx];
  const qty = Number(row.quantity || 0);
  const unitPrice = Number((moduleKey === 'detailsSalesOrders' ? row.unitPrice : row.price) || 0);
  row.amount = qty && unitPrice ? String((qty * unitPrice).toFixed(2)) : row.amount;
}

function autoCalcSalesOrderAmounts() {
  const totals = {};
  for (const row of appState.detailsSalesOrders.rows) {
    const soId = row.salesOrderId;
    if (!soId) continue;
    totals[soId] = (totals[soId] || 0) + Number(row.amount || 0);
  }
  for (const soRow of appState.salesOrders.rows) {
    if (!soRow.salesOrderId) continue;
    if (!totals[soRow.salesOrderId]) continue;
    soRow.amount = String(totals[soRow.salesOrderId].toFixed(2));
  }
  saveState();
  renderPanels();
}

function addRow(moduleKey) {
  const rows = appState[moduleKey].rows;
  appState[moduleKey].rows.push(buildBlankRow(moduleKey, rows));
  saveState();
  renderPanels();
}

function deleteRow(moduleKey, rowIdx) {
  if (!appState[moduleKey]?.rows?.length) return;
  appState[moduleKey].rows.splice(rowIdx, 1);
  if (!appState[moduleKey].rows.length) {
    appState[moduleKey].rows.push(buildBlankRow(moduleKey, appState[moduleKey].rows));
  }
  saveState();
  renderPanels();
  renderLineage();
}

function buildBlankRow(moduleKey, rows = appState[moduleKey]?.rows || []) {
  const row = {};
  for (const col of TABLE_SCHEMAS[moduleKey].columns) {
    row[col.key] = '';
    if (col.type === 'serialText') {
      row[col.key] = nextSerialText(rows, col.key);
    }
  }
  return row;
}

function nextSerialText(rows, column) {
  const last = [...rows].reverse().map((r) => String(r[column] || '').trim()).find(Boolean);
  if (!last) return `${column}_1`;
  const match = last.match(/^(.*?)(\d+)$/);
  if (!match) return `${last}_1`;
  const prefix = match[1];
  const nextNumber = Number(match[2]) + 1;
  return `${prefix}${nextNumber}`;
}

function renderLineage() {
  const panel = document.getElementById('lineage-content');
  const info = [
    'SKU options source: Product Index.sku',
    'SalesOrderIncluded source: Sales Orders.salesOrderId',
    'poRelated source: Purchase Orders.poId',
    'Detail tables auto-fill from Product Index by selected SKU.',
  ];
  panel.innerHTML = info.map((line) => `<div class="ref-chip">${escapeHtml(line)}</div>`).join('');
}

function escapeHtml(value) {
  return String(value || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

loadState();
setupAuth();
