/**
 * CSV Generator Implementation - Pro Version
 */

// --- i18n ---

const TRANSLATIONS = {
    es: {
        title: "Generador de CSV",
        subtitle: "Herramienta rápida y segura para generar datos de prueba",
        columnSeparator: "Separador de Columnas",
        quoteChar: "Caracter de Comillas",
        segmentRows: "Filas del Segmento",
        addSegment: "+ Segmento",
        segmentColumns: "Columnas del Segmento",
        addColumn: "Agregar Columna",
        importConfig: "📂 Cargar Config",
        exportConfig: "💾 Guardar Config",
        downloadCSV: "Descargar CSV",
        downloadJSON: "Descargar JSON",
        downloadSQL: "Descargar SQL",
        colName: "Nombre de Columna",
        colType: "Tipo de Dato",
        config: "Configuración",
        preview: "Vista Previa",
        tableName: "Nombre de la Tabla SQL",
        exportFormat: "Formato de Exportación",
        types: {
            number: "Número",
            text: "Texto",
            fullname: "Nombre Completo",
            email: "Email",
            phone: "Teléfono",
            city: "Ciudad",
            country: "País",
            address: "Dirección",
            date: "Fecha",
            datetime: "Fecha y Hora",
            categorical: "Categórico (Grupos)",
            boolean: "Booleano",
            uuid: "UUID"
        }
    },
    en: {
        title: "CSV Generator",
        subtitle: "Fast and secure tool to generate test data",
        columnSeparator: "Column Separator",
        quoteChar: "Quote Character",
        segmentRows: "Segment Rows",
        addSegment: "+ Segment",
        segmentColumns: "Segment Columns",
        addColumn: "Add Column",
        importConfig: "📂 Load Config",
        exportConfig: "💾 Save Config",
        downloadCSV: "Download CSV",
        downloadJSON: "Download JSON",
        downloadSQL: "Download SQL",
        colName: "Column Name",
        colType: "Data Type",
        config: "Configuration",
        preview: "Preview",
        tableName: "SQL Table Name",
        exportFormat: "Export Format",
        types: {
            number: "Number",
            text: "Text",
            fullname: "Full Name",
            email: "Email",
            phone: "Phone",
            city: "City",
            country: "Country",
            address: "Address",
            date: "Date",
            datetime: "Date & Time",
            categorical: "Categorical (Groups)",
            boolean: "Boolean",
            uuid: "UUID"
        }
    }
};

let currentLang = 'es';

function t(key) {
    const keys = key.split('.');
    let result = TRANSLATIONS[currentLang];
    for (const k of keys) {
        if (!result) break;
        result = result[k];
    }
    return result || key;
}

function updateUILanguage() {
    document.title = t('title') + " Pro";
    document.querySelector('h1').textContent = t('title');
    document.querySelector('.subtitle').textContent = t('subtitle');

    document.getElementById('export-format-label').textContent = t('exportFormat');
    document.getElementById('sql-table-label').textContent = t('tableName');

    const globalLabels = document.querySelectorAll('#csv-settings .input-group label');
    if (globalLabels.length >= 2) {
        globalLabels[0].textContent = t('columnSeparator');
        globalLabels[1].textContent = t('quoteChar');
    }

    document.querySelector('label[for="row-count"]').textContent = t('segmentRows');

    const addSegBtn = document.getElementById('add-segment-btn');
    addSegBtn.innerHTML = `+ ${t('addSegment').replace('+ ', '')}`;

    document.querySelector('.controls-header h3').textContent = t('segmentColumns');

    const addColBtn = document.getElementById('add-column-btn');
    addColBtn.innerHTML = `<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg> ${t('addColumn')}`;

    document.getElementById('import-btn').textContent = t('importConfig');
    document.getElementById('export-btn').textContent = t('exportConfig');
    document.getElementById('preview-title').textContent = t('preview');

    // Update Template
    const colTemplate = document.getElementById('column-template').content;
    colTemplate.querySelectorAll('label')[0].textContent = t('colName');
    colTemplate.querySelectorAll('label')[1].textContent = t('colType');
    colTemplate.querySelectorAll('label')[2].textContent = t('config');

    const typeSelect = colTemplate.querySelector('.col-type');
    Array.from(typeSelect.options).forEach(opt => {
        opt.textContent = t(`types.${opt.value}`);
    });

    toggleFormatSettings();
    renderSegmentTabs();
    renderColumns();
    requestPreviewUpdate();
}

// --- State Management ---

let appState = {
    segments: [
        { id: 'seg-1', name: 'Segmento 1', rows: 100, columns: [] }
    ],
    activeSegmentId: 'seg-1'
};

const DEFAULT_COLUMNS = [
    { name: 'ID', type: 'number', config: { min: 1, max: 10000, decimals: 0, separator: '.' } },
    { name: 'Descripción', type: 'text', config: {} },
    { name: 'Fecha', type: 'date', config: { format: 'YYYY-MM-DD' } }
];

appState.segments[0].columns = JSON.parse(JSON.stringify(DEFAULT_COLUMNS));

// --- DOM Elements ---

const addColumnBtn = document.getElementById('add-column-btn');
const generateBtn = document.getElementById('generate-btn');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importInput = document.getElementById('import-config-file');

const columnsContainer = document.getElementById('columns-container');
const template = document.getElementById('column-template');
const rowCountInput = document.getElementById('row-count');
const globalSeparatorSelect = document.getElementById('global-separator');
const globalQuoteSelect = document.getElementById('global-quote');
const segmentsTabs = document.getElementById('segments-tabs');
const addSegmentBtn = document.getElementById('add-segment-btn');
const deleteSegmentBtn = document.getElementById('delete-segment-btn');

const exportFormatSelect = document.getElementById('export-format');
const csvSettings = document.getElementById('csv-settings');
const sqlSettings = document.getElementById('sql-settings');
const sqlTableNameInput = document.getElementById('sql-table-name');

const previewHeader = document.getElementById('preview-header');
const previewBody = document.getElementById('preview-body');

// --- Configuration Templates ---

const configTemplates = {
    number: `
        <input type="number" name="min" placeholder="Min" value="0" title="Mínimo">
        <input type="number" name="max" placeholder="Max" value="1000" title="Máximo">
        <input type="number" name="decimals" placeholder="Dec" value="0" min="0" max="10" style="width: 70px;" title="Decimales">
        <select name="separator" title="Separador">
            <option value=".">1.0</option>
            <option value=",">1,0</option>
        </select>
    `,
    text: `
        <div class="config-group">
            <div class="config-row">
                <input type="text" name="prefix" placeholder="Prefijo" class="w-sm" title="Texto al inicio">
                <select name="coreMethod" class="w-md" onchange="toggleCoreMethod(this)" title="Método de generación principal">
                    <option value="random">Aleatorio</option>
                    <option value="mask">Máscara</option>
                    <option value="increment">Secuencia</option>
                    <option value="fixed">Fijo</option>
                </select>
                <input type="text" name="suffix" placeholder="Sufijo" class="w-sm" title="Texto al final">
            </div>
            <div class="core-settings mt-1">
                <div class="method-panel method-random">
                    <input type="number" name="length" placeholder="Longitud" value="12" class="w-full" title="Cantidad de caracteres">
                </div>
                <div class="method-panel method-mask hidden">
                    <input type="text" name="mask" placeholder="Ej: ###-AAA" value="###-AAA" class="w-full" title="#=Num, A=Letra, *=Alfanum">
                </div>
                <div class="method-panel method-increment hidden config-row">
                    <label>Inicia:</label>
                    <input type="number" name="incStart" value="1" class="w-sm">
                    <label>Paso:</label>
                    <input type="number" name="incStep" value="1" class="w-sm">
                </div>
                <div class="method-panel method-fixed hidden">
                    <input type="text" name="fixedValue" placeholder="Valor fijo" class="w-full">
                </div>
            </div>
            <div class="config-row mt-1" style="justify-content: space-between;">
                <select name="pos" title="Posición Caracteres" class="w-md">
                    <option value="rnd">Pos. Esp: Aleat.</option>
                    <option value="start">Pos. Esp: Inicio</option>
                    <option value="end">Pos. Esp: Fin</option>
                </select>
                <div class="special-char-toggles">
                    <button type="button" class="toggle-btn" data-val="sp" title="Espacio">SPC</button>
                    <button type="button" class="toggle-btn" data-val="tab" title="Tabulador">TAB</button>
                    <button type="button" class="toggle-btn" data-val="nl" title="Nueva Línea">NL</button>
                    <button type="button" class="toggle-btn" data-val="qt" title="Comilla">QT</button>
                    <button type="button" class="toggle-btn" data-val="cm" title="Coma">CM</button>
                </div>
            </div>
        </div>
    `,
    categorical: `
        <div class="config-group">
            <label>Valores (separados por coma)</label>
            <textarea name="values" class="config-area" placeholder="Ej: Rojo, Verde, Azul"></textarea>
            <div class="config-row">
                <select name="catMode" class="w-md" onchange="toggleCatMode(this)">
                    <option value="random">Aleatorio</option>
                    <option value="sequential">Secuencial / Bloques</option>
                </select>
                <input type="number" name="blockSize" placeholder="Filas" value="1" class="hidden cat-block-input w-sm" title="Repetir valor N veces">
            </div>
        </div>
    `,
    date: `
        <div class="config-group">
            <div class="config-row">
                 <select name="mode" class="w-md" onchange="toggleDateMode(this)">
                    <option value="random">Rango Aleatorio</option>
                    <option value="fixed">Fecha Fija</option>
                </select>
                <select name="format" class="format-select">
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                     <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY/MM/DD">YYYY/MM/DD</option>
                </select>
            </div>

            <div class="mode-panel mode-random config-row mt-1">
                 <input type="date" name="start" title="Inicio" value="2023-01-01">
                 <input type="date" name="end" title="Fin" value="${new Date().toISOString().split('T')[0]}">
                 <input type="number" name="blockSize" placeholder="Bloque (filas)" value="1" title="Repetir fecha generada N veces" class="w-sm">
            </div>
            <div class="mode-panel mode-fixed hidden mt-1">
                 <input type="date" name="fixedValue" class="w-full">
            </div>
        </div>
    `,
    datetime: `
        <div class="config-group">
            <div class="config-row">
                 <select name="mode" class="w-md" onchange="toggleDateMode(this)">
                    <option value="random">Rango Aleatorio</option>
                    <option value="fixed">Fecha Fija</option>
                </select>
                <select name="format" class="format-select">
                    <option value="YYYY-MM-DD HH:mm:ss">YYYY-MM-DD HH:mm:ss</option>
                    <option value="DD/MM/YYYY HH:mm:ss">DD/MM/YYYY HH:mm:ss</option>
                    <option value="YYYY-MM-DDTHH:mm:ss">ISO 8601</option>
                </select>
            </div>

            <div class="mode-panel mode-random config-row mt-1">
                 <input type="date" name="start" title="Inicio" value="2023-01-01">
                 <input type="date" name="end" title="Fin" value="${new Date().toISOString().split('T')[0]}">
                 <input type="number" name="blockSize" placeholder="Bloque" value="1" title="Repetir N veces" class="w-sm">
            </div>
            <div class="mode-panel mode-fixed hidden mt-1">
                <input type="datetime-local" name="fixedValue" class="w-full">
            </div>
        </div>
    `,
    boolean: `
        <div class="config-group">
            <div class="config-row">
                 <select name="mode" class="w-md" onchange="toggleBoolMode(this)">
                    <option value="random">Aleatorio (50/50)</option>
                    <option value="fixed">Valor Fijo</option>
                </select>
            </div>
            <div class="mode-panel mode-random mt-1">
                 <label>Tamaño de Bloque:</label>
                 <input type="number" name="blockSize" placeholder="1" value="1" class="w-sm">
            </div>
            <div class="mode-panel mode-fixed hidden mt-1">
                 <select name="fixedValue" class="w-full">
                    <option value="true">Verdadero / True</option>
                    <option value="false">Falso / False</option>
                </select>
            </div>
        </div>
    `,
    phone: `
        <div class="config-row">
            <input type="text" name="countryCode" placeholder="+34" value="+34" class="w-sm" title="Código de país">
            <input type="number" name="length" placeholder="9" value="9" class="w-sm" title="Longitud del número">
        </div>
    `,
    fullname: '', email: '', city: '', country: '', address: '', uuid: ''
};

// --- Web Worker Setup ---
const worker = new Worker('worker.js');

worker.onmessage = function(e) {
    const { result, format } = e.data;
    const extension = format;
    const type = format === 'csv' ? 'text/csv' : (format === 'json' ? 'application/json' : 'text/sql');
    downloadFile(result, `data_${new Date().getTime()}.${extension}`, type);

    // Reset button state
    generateBtn.disabled = false;
    generateBtn.style.opacity = '1';
};

// --- Drag & Drop Logic ---

let draggedItem = null;

function handleDragStart(e) {
    draggedItem = this;
    this.style.opacity = '0.4';
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    this.style.opacity = '1';
    columnsContainer.querySelectorAll('.column-item').forEach(item => {
        item.classList.remove('over');
    });
    saveCurrentSegmentState();
    requestPreviewUpdate();
}

function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    return false;
}

function handleDragEnter(e) {
    this.classList.add('over');
}

function handleDragLeave(e) {
    this.classList.remove('over');
}

function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();

    if (draggedItem !== this) {
        const allItems = Array.from(columnsContainer.querySelectorAll('.column-item'));
        const fromIndex = allItems.indexOf(draggedItem);
        const toIndex = allItems.indexOf(this);

        // Sync across all segments
        appState.segments.forEach(seg => {
            const col = seg.columns.splice(fromIndex, 1)[0];
            seg.columns.splice(toIndex, 0, col);
        });

        renderColumns();
        requestPreviewUpdate();
    }
    return false;
}

function addDragEvents(item) {
    item.draggable = true;
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragenter', handleDragEnter);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('dragleave', handleDragLeave);
    item.addEventListener('drop', handleDrop);
    item.addEventListener('dragend', handleDragEnd);
}

// --- UI Logic Helpers ---

window.toggleFormatSettings = () => {
    const format = exportFormatSelect.value;
    csvSettings.classList.toggle('hidden', format !== 'csv');
    sqlSettings.classList.toggle('hidden', format !== 'sql');

    const text = format === 'csv' ? t('downloadCSV') : (format === 'json' ? t('downloadJSON') : t('downloadSQL'));
    generateBtn.innerHTML = `
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        ${text}
    `;
}

window.toggleCoreMethod = (select) => {
    const container = select.closest('.config-group');
    const method = select.value;
    container.querySelectorAll('.method-panel').forEach(el => el.classList.add('hidden'));
    if (method === 'random') container.querySelector('.method-random').classList.remove('hidden');
    else if (method === 'mask') container.querySelector('.method-mask').classList.remove('hidden');
    else if (method === 'increment') container.querySelector('.method-increment').classList.remove('hidden');
    else if (method === 'fixed') container.querySelector('.method-fixed').classList.remove('hidden');
}

window.toggleCatMode = (select) => {
    const container = select.closest('.config-group');
    const input = container.querySelector('.cat-block-input');
    if (select.value === 'sequential') input.classList.remove('hidden');
    else input.classList.add('hidden');
}

window.toggleDateMode = (select) => {
    const container = select.closest('.config-group');
    if (select.value === 'fixed') {
        container.querySelector('.mode-random').classList.add('hidden');
        container.querySelector('.mode-fixed').classList.remove('hidden');
    } else {
        container.querySelector('.mode-random').classList.remove('hidden');
        container.querySelector('.mode-fixed').classList.add('hidden');
    }
}

window.toggleBoolMode = (select) => {
    const container = select.closest('.config-group');
    if (select.value === 'fixed') {
        container.querySelector('.mode-random').classList.add('hidden');
        container.querySelector('.mode-fixed').classList.remove('hidden');
    } else {
        container.querySelector('.mode-random').classList.remove('hidden');
        container.querySelector('.mode-fixed').classList.add('hidden');
    }
}

let previewDebounceTimer;
function requestPreviewUpdate() {
    clearTimeout(previewDebounceTimer);
    previewDebounceTimer = setTimeout(updatePreview, 300);
}

function updatePreview() {
    saveCurrentSegmentState();
    const segment = getActiveSegment();
    if (!segment) return;

    // Update Header
    previewHeader.innerHTML = '';
    segment.columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col.name;
        previewHeader.appendChild(th);
    });

    // Update Body (first 10 rows)
    previewBody.innerHTML = '';
    const rowsToShow = Math.min(10, segment.rows);
    for (let i = 0; i < rowsToShow; i++) {
        const tr = document.createElement('tr');
        segment.columns.forEach(col => {
            const td = document.createElement('td');
            const context = { index: i, segment: segment };
            td.textContent = generators[col.type](col.config, context);
            tr.appendChild(td);
        });
        previewBody.appendChild(tr);
    }
}

// --- State & Rendering ---

function getActiveSegment() {
    return appState.segments.find(s => s.id === appState.activeSegmentId);
}

function renderSegmentTabs() {
    segmentsTabs.innerHTML = '';
    appState.segments.forEach(seg => {
        const btn = document.createElement('button');
        btn.className = `segment-tab ${seg.id === appState.activeSegmentId ? 'active' : ''}`;
        btn.textContent = seg.name;
        btn.onclick = () => {
            saveCurrentSegmentState();
            appState.activeSegmentId = seg.id;
            renderSegmentTabs();
            renderColumns();
            requestPreviewUpdate();
        };
        segmentsTabs.appendChild(btn);
    });
    const active = getActiveSegment();
    if (active) rowCountInput.value = active.rows;
    deleteSegmentBtn.disabled = appState.segments.length === 1;
}

function renderColumns() {
    const segment = getActiveSegment();
    if (!segment) return;
    columnsContainer.innerHTML = '';

    segment.columns.forEach((col, index) => {
        const colNode = createColumnNode(col, index);
        columnsContainer.appendChild(colNode);
        updateConfigUI(col.type, colNode.querySelector('.config-options'));
        restoreConfigValues(colNode, col.config);

        // Restore dynamic UI states
        const confOpts = colNode.querySelector('.config-options');
        if (col.type === 'text') {
            const methodSel = confOpts.querySelector('[name="coreMethod"]');
            if (methodSel) window.toggleCoreMethod(methodSel);
        }
        if (col.type === 'categorical') {
            const catSel = confOpts.querySelector('[name="catMode"]');
            if (catSel) window.toggleCatMode(catSel);
        }
        if (col.type === 'date' || col.type === 'datetime') {
            const dMode = confOpts.querySelector('[name="mode"]');
            if (dMode) window.toggleDateMode(dMode);
        }
        if (col.type === 'boolean') {
            const bMode = confOpts.querySelector('[name="mode"]');
            if (bMode) window.toggleBoolMode(bMode);
        }
    });
}

function createColumnNode(colData, index) {
    const clone = template.content.cloneNode(true);
    const item = clone.querySelector('.column-item');
    addDragEvents(item);

    const nameInput = item.querySelector('.col-name');
    nameInput.value = colData.name;
    nameInput.oninput = (e) => {
        const newVal = e.target.value;
        appState.segments.forEach(seg => {
            if (seg.columns[index]) seg.columns[index].name = newVal;
        });
        requestPreviewUpdate();
    };

    const typeSelect = item.querySelector('.col-type');
    typeSelect.value = colData.type;
    typeSelect.onchange = (e) => {
        saveCurrentSegmentState();
        const newType = e.target.value;
        appState.segments.forEach(seg => {
            if (seg.columns[index]) {
                seg.columns[index].type = newType;
                seg.columns[index].config = {};
            }
        });
        renderColumns();
        requestPreviewUpdate();
    };

    item.querySelector('.remove-col-btn').onclick = () => {
        saveCurrentSegmentState();
        appState.segments.forEach(seg => {
            seg.columns.splice(index, 1);
        });
        renderColumns();
        requestPreviewUpdate();
    };

    return item;
}

function updateConfigUI(type, container) {
    container.innerHTML = configTemplates[type] || '';
}

function saveCurrentSegmentState() {
    const segment = getActiveSegment();
    if (!segment) return;
    const itemNodes = columnsContainer.querySelectorAll('.column-item');
    const newColumns = [];
    itemNodes.forEach((item) => {
        const name = item.querySelector('.col-name').value;
        const type = item.querySelector('.col-type').value;
        const configContainer = item.querySelector('.config-options');
        const config = {};
        configContainer.querySelectorAll('input, select, textarea').forEach(input => {
            if (!input.dataset.listenerAdded) {
                input.addEventListener('input', requestPreviewUpdate);
                input.dataset.listenerAdded = 'true';
            }
            config[input.name] = input.value;
        });
        const activeToggles = configContainer.querySelectorAll('.toggle-btn.active');
        if (activeToggles.length > 0) {
            config.specialChars = Array.from(activeToggles).map(btn => btn.dataset.val);
        }
        newColumns.push({ name, type, config });
    });
    segment.columns = newColumns;
    segment.rows = parseInt(rowCountInput.value) || 0;
}

function restoreConfigValues(node, config) {
    const configContainer = node.querySelector('.config-options');
    for (const key in config) {
        if (key === 'specialChars') continue;
        const input = configContainer.querySelector(`[name="${key}"]`);
        if (input) input.value = config[key];
    }
    if (config.specialChars) {
        config.specialChars.forEach(val => {
            const btn = configContainer.querySelector(`.toggle-btn[data-val="${val}"]`);
            if (btn) btn.classList.add('active');
        });
    }
}

// --- Generation ---

function generateData() {
    saveCurrentSegmentState();
    const format = exportFormatSelect.value;

    // Visual feedback
    generateBtn.disabled = true;
    generateBtn.style.opacity = '0.7';

    worker.postMessage({
        action: 'generate',
        appState: appState,
        config: {
            separator: globalSeparatorSelect.value === 'tab' ? '\t' : globalSeparatorSelect.value,
            quoteChar: globalQuoteSelect.value === 'none' ? '' : globalQuoteSelect.value,
            format: format,
            tableName: sqlTableNameInput.value || 'my_table'
        }
    });
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type: type + ';charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- Event Listeners ---

addColumnBtn.addEventListener('click', () => {
    saveCurrentSegmentState();
    appState.segments.forEach(seg => {
        seg.columns.push({ name: 'Nueva Columna', type: 'text', config: {} });
    });
    renderColumns();
    requestPreviewUpdate();
});

generateBtn.addEventListener('click', generateData);

exportBtn.addEventListener('click', () => {
    saveCurrentSegmentState();
    const exportData = {
        version: 1,
        createdAt: new Date().toISOString(),
        global: {
            separator: globalSeparatorSelect.value,
            quote: globalQuoteSelect.value
        },
        segments: appState.segments
    };
    const jsonStr = JSON.stringify(exportData, null, 2);
    downloadFile(jsonStr, `config_csv_generator_${new Date().getTime()}.json`, 'application/json');
});

importBtn.addEventListener('click', () => {
    importInput.click();
});

importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            if (data.segments) {
                appState.segments = data.segments;
                appState.activeSegmentId = data.segments[0].id;
                if (data.global) {
                    globalSeparatorSelect.value = data.global.separator || ',';
                    globalQuoteSelect.value = data.global.quote || '"';
                }
                renderSegmentTabs();
                renderColumns();
                requestPreviewUpdate();
                alert('Configuración importada exitosamente.');
            } else {
                alert('Archivo de configuración inválido.');
            }
        } catch (err) {
            console.error(err);
            alert('Error al leer el archivo de configuración.');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
});

addSegmentBtn.addEventListener('click', () => {
    saveCurrentSegmentState();
    const newId = `seg-${appState.segments.length + 1}`;
    const current = getActiveSegment();
    const clonedCols = JSON.parse(JSON.stringify(current.columns));
    appState.segments.push({
        id: newId,
        name: `Segmento ${appState.segments.length + 1}`,
        rows: 50,
        columns: clonedCols
    });
    appState.activeSegmentId = newId;
    renderSegmentTabs();
    renderColumns();
    requestPreviewUpdate();
});

deleteSegmentBtn.addEventListener('click', () => {
    if (appState.segments.length <= 1) return;
    const idx = appState.segments.findIndex(s => s.id === appState.activeSegmentId);
    appState.segments.splice(idx, 1);
    appState.activeSegmentId = appState.segments[Math.max(0, idx - 1)].id;
    renderSegmentTabs();
    renderColumns();
    requestPreviewUpdate();
});

rowCountInput.addEventListener('change', () => {
    saveCurrentSegmentState();
    requestPreviewUpdate();
});

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('toggle-btn')) {
        e.target.classList.toggle('active');
        saveCurrentSegmentState();
        requestPreviewUpdate();
    }
});

window.setLanguage = (lang) => {
    currentLang = lang;
    document.getElementById('lang-es').classList.toggle('active', lang === 'es');
    document.getElementById('lang-en').classList.toggle('active', lang === 'en');
    updateUILanguage();
};

// --- Start ---
setLanguage('es');
