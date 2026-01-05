/**
 * CSV Generator Implementation
 */

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

const NAMES = ['Juan', 'Maria', 'Carlos', 'Ana', 'Luis', 'Sofia', 'Pedro', 'Laura', 'Diego', 'Elena'];
const SURNAMES = ['Perez', 'Garcia', 'Lopez', 'Martinez', 'Rodriguez', 'Gonzalez', 'Fernandez', 'Gomez'];
const DOMAINS = ['gmail.com', 'hotmail.com', 'outlook.com', 'company.com'];
const SPECIAL_CHARS_MAP = { 'sp': ' ', 'tab': '\t', 'nl': '\n', 'cr': '\r', 'qt': '"', 'cm': ',' };

// --- Generators ---

function getSeededRandom(seedStr) {
    let h = 0x811c9dc5;
    for (let i = 0; i < seedStr.length; i++) {
        h ^= seedStr.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    h >>>= 0;
    return (h / 4294967296);
}

const generators = {
    number: (config) => {
        const min = parseInt(config.min) || 0;
        const max = parseInt(config.max) || 100;
        const decimals = parseInt(config.decimals) || 0;
        const separator = config.separator || '.';
        let val = Math.random() * (max - min) + min;
        let str = val.toFixed(decimals);
        if (separator === ',') str = str.replace('.', ',');
        return str;
    },
    text: (config, context) => {
        const coreMethod = config.coreMethod || 'random';
        const prefix = config.prefix || '';
        const suffix = config.suffix || '';

        let core = '';
        if (coreMethod === 'random') {
            core = generateRandomString(parseInt(config.length) || 12);
        } else if (coreMethod === 'mask') {
            core = generateFromMask(config.mask || '###-AAA');
        } else if (coreMethod === 'increment') {
            const start = parseInt(config.incStart) || 1;
            const step = parseInt(config.incStep) || 1;
            core = String(start + (context.index * step));
        } else if (coreMethod === 'fixed') {
            core = config.fixedValue || '';
        }

        let result = prefix + core + suffix;

        if (config.specialChars && config.specialChars.length > 0) {
            config.specialChars.forEach(code => {
                const char = SPECIAL_CHARS_MAP[code];
                if (char) {
                    const posType = config.pos || 'rnd';
                    let pos;
                    if (posType === 'start') pos = 0;
                    else if (posType === 'end') pos = result.length;
                    else pos = Math.floor(Math.random() * (result.length + 1));
                    result = result.slice(0, pos) + char + result.slice(pos);
                }
            });
        }
        return result;
    },
    categorical: (config, context) => {
        const rawValues = config.values || '';
        const values = rawValues.split(',').map(s => s.trim()).filter(s => s !== '');
        if (values.length === 0) return '';

        const mode = config.catMode || 'random';
        if (mode === 'sequential') {
            const blockSize = parseInt(config.blockSize) || 1;
            const valueIndex = Math.floor(context.index / blockSize) % values.length;
            return values[valueIndex];
        } else {
            return values[Math.floor(Math.random() * values.length)];
        }
    },
    email: () => {
        const name = NAMES[Math.floor(Math.random() * NAMES.length)].toLowerCase();
        const surname = SURNAMES[Math.floor(Math.random() * SURNAMES.length)].toLowerCase();
        const domain = DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
        return `${name}.${surname}${Math.floor(Math.random() * 100)}@${domain}`;
    },
    date: (config, context) => generateDate(config, false, context),
    datetime: (config, context) => generateDate(config, true, context),
    boolean: (config, context) => {
        const mode = config.mode || 'random';

        if (mode === 'fixed') {
            return config.fixedValue === 'true' ? 'true' : 'false';
        } else {
            // Random or Blocked
            const blockSize = parseInt(config.blockSize) || 1;
            let rnd;
            if (blockSize > 1) {
                const blockKey = `bool_${Math.floor(context.index / blockSize)}`;
                rnd = getSeededRandom(blockKey + (config.seedSalt || ''));
            } else {
                rnd = Math.random();
            }
            return rnd < 0.5 ? 'true' : 'false';
        }
    },
    uuid: () => crypto.randomUUID()
};

function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
}

function generateFromMask(mask) {
    let result = '';
    for (let char of mask) {
        if (char === '#') result += Math.floor(Math.random() * 10);
        else if (char === 'A') result += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.charAt(Math.floor(Math.random() * 26));
        else if (char === 'a') result += 'abcdefghijklmnopqrstuvwxyz'.charAt(Math.floor(Math.random() * 26));
        else if (char === '*') result += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.charAt(Math.floor(Math.random() * 36));
        else result += char;
    }
    return result;
}

function generateDate(config, withTime, context) {
    const mode = config.mode || 'random';
    const defaultFmt = withTime ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD';

    if (mode === 'fixed') {
        const dateStr = config.fixedValue || new Date().toISOString();
        return formatDate(new Date(dateStr), config.format || defaultFmt);
    } else {
        const start = config.start ? new Date(config.start) : new Date(2020, 0, 1);
        const end = config.end ? new Date(config.end) : new Date();

        const blockSize = parseInt(config.blockSize) || 1;
        let rnd;
        if (blockSize > 1) {
            const blockKey = `date_${Math.floor(context.index / blockSize)}`;
            rnd = getSeededRandom(blockKey + (config.seedSalt || ''));
        } else {
            rnd = Math.random();
        }

        const date = new Date(start.getTime() + rnd * (end.getTime() - start.getTime()));
        return formatDate(date, config.format || defaultFmt);
    }
}

function formatDate(date, format) {
    const map = {
        'YYYY': date.getFullYear(),
        'MM': String(date.getMonth() + 1).padStart(2, '0'),
        'DD': String(date.getDate()).padStart(2, '0'),
        'HH': String(date.getHours()).padStart(2, '0'),
        'mm': String(date.getMinutes()).padStart(2, '0'),
        'ss': String(date.getSeconds()).padStart(2, '0')
    };
    let result = format;
    for (const [key, val] of Object.entries(map)) result = result.replace(key, val);
    return result;
}

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
    email: '', uuid: ''
};


// --- Initialization ---

// Initialization moved to end of file to ensure all functions are defined


// --- Event Listeners ---

addColumnBtn.addEventListener('click', () => {
    saveCurrentSegmentState();

    // Add new column to ALL segments to maintain consistency
    appState.segments.forEach(seg => {
        seg.columns.push({ name: 'Nueva Columna', type: 'text', config: {} });
    });

    renderColumns();
});

generateBtn.addEventListener('click', generateCSV);

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
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `config_csv_generator_${new Date().getTime()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                // Reset active to first
                appState.activeSegmentId = data.segments[0].id;

                // Restore global settings
                if (data.global) {
                    globalSeparatorSelect.value = data.global.separator || ',';
                    globalQuoteSelect.value = data.global.quote || '"';
                }

                renderSegmentTabs();
                renderColumns();
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
    e.target.value = ''; // Reset for re-use
});


addSegmentBtn.addEventListener('click', () => {
    saveCurrentSegmentState();
    const newId = `seg-${appState.segments.length + 1}`;

    // Get columns structure from the first segment (or any, since they are synced)
    // We deep clone to avoid reference issues, but we want empty configs for new segment?
    // Usually new segment should have same structure but maybe default configs or copied?
    // For consistency with "new segment", let's copy the structure but reset configs potentially?
    // For simplicity and utility: Copy structure AND config from current segment is often best.
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
});

deleteSegmentBtn.addEventListener('click', () => {
    if (appState.segments.length <= 1) return;
    const idx = appState.segments.findIndex(s => s.id === appState.activeSegmentId);
    appState.segments.splice(idx, 1);
    appState.activeSegmentId = appState.segments[Math.max(0, idx - 1)].id;
    renderSegmentTabs();
    renderColumns();
});

rowCountInput.addEventListener('change', (e) => {
    const seg = getActiveSegment();
    seg.rows = parseInt(e.target.value) || 0;
});

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('toggle-btn')) {
        e.target.classList.toggle('active');
    }
});

// --- UI Logic Helpers ---

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
        };
        segmentsTabs.appendChild(btn);
    });
    const active = getActiveSegment();
    if (active) rowCountInput.value = active.rows;
    deleteSegmentBtn.disabled = appState.segments.length === 1;
}

function renderColumns() {
    const segment = getActiveSegment();
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

    const nameInput = item.querySelector('.col-name');
    nameInput.value = colData.name;
    nameInput.oninput = (e) => {
        const newVal = e.target.value;
        // Sync name across all segments
        appState.segments.forEach(seg => {
            if (seg.columns[index]) seg.columns[index].name = newVal;
        });
    };

    const typeSelect = item.querySelector('.col-type');
    typeSelect.value = colData.type;
    typeSelect.onchange = (e) => {
        saveCurrentSegmentState();
        const newType = e.target.value;

        // Sync type across all segments and reset config
        appState.segments.forEach(seg => {
            if (seg.columns[index]) {
                seg.columns[index].type = newType;
                seg.columns[index].config = {}; // Reset config on type change
            }
        });

        renderColumns();
    };

    item.querySelector('.remove-col-btn').onclick = () => {
        saveCurrentSegmentState();

        // Remove column from ALL segments
        appState.segments.forEach(seg => {
            seg.columns.splice(index, 1);
        });

        renderColumns();
    };

    return item;
}

function updateConfigUI(type, container) {
    container.innerHTML = configTemplates[type] || '';
}

function saveCurrentSegmentState() {
    const segment = getActiveSegment();
    const itemNodes = columnsContainer.querySelectorAll('.column-item');
    const newColumns = [];
    itemNodes.forEach((item, idx) => {
        const name = item.querySelector('.col-name').value;
        const type = item.querySelector('.col-type').value;

        // We only really need to save the CONFIG here, 
        // because name and type are synced in real-time/on-change events now.
        // BUT, `saveCurrentSegmentState` is also used to rebuild `segment.columns` 
        // entirely in some flows (like addSegmentBtn in original code, though we fixed that).
        // Let's keep it robust but acknowledge that for name/type we rely on sync.

        const configContainer = item.querySelector('.config-options');
        const config = {};
        configContainer.querySelectorAll('input, select, textarea').forEach(input => {
            config[input.name] = input.value;
        });
        const activeToggles = configContainer.querySelectorAll('.toggle-btn.active');
        if (activeToggles.length > 0) {
            config.specialChars = Array.from(activeToggles).map(btn => btn.dataset.val);
        }

        // We shouldn't construct newColumns array from scratch if we want to preserve 
        // refs, but `segment.columns` is replaced anyway.
        // IMPORTANT: We must ensure we don't accidentally revert the synchronization 
        // if this runs after a sync operation but before a render.
        // However, this is usually called BEFORE an operation.

        newColumns.push({ name, type, config });
    });

    // Update ONLY the CURRENT segment configuration
    // The structural properties (name, type) are assumed to be consistent 
    // because we sync them. But `saveCurrentSegmentState` primarily captures 
    // the user's *input values* (config) for the active view.
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

function generateCSV() {
    saveCurrentSegmentState();

    const separator = globalSeparatorSelect.value === 'tab' ? '\t' : globalSeparatorSelect.value;
    const quoteChar = globalQuoteSelect.value === 'none' ? '' : globalQuoteSelect.value;

    const allRows = [];
    const headerSeg = appState.segments[0];
    const headerRow = headerSeg.columns.map(c => escapeCSV(c.name, separator, quoteChar)).join(separator);
    allRows.push(headerRow);

    appState.segments.forEach(seg => {
        for (let i = 0; i < seg.rows; i++) {
            const rowData = seg.columns.map(col => {
                const context = { index: i, segment: seg };
                const val = generators[col.type](col.config, context);
                return escapeCSV(String(val), separator, quoteChar);
            });
            allRows.push(rowData.join(separator));
        }
    });

    const csvString = allRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `etl_data_${new Date().getTime()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function escapeCSV(str, separator, quoteChar) {
    if (!quoteChar) return str;
    if (str.includes(separator) || str.includes(quoteChar) || str.includes('\n') || str.includes('\r')) {
        const escapedContent = str.split(quoteChar).join(quoteChar + quoteChar);
        return `${quoteChar}${escapedContent}${quoteChar}`;
    }
    return str;
}


// --- Start ---
renderSegmentTabs();
renderColumns();
