/**
 * Web Worker for Data Generation
 */

importScripts('shared.js');

self.onmessage = function(e) {
    const { action, appState, config } = e.data;

    if (action === 'generate') {
        let result = '';
        if (config.format === 'csv') {
            result = generateCSV(appState, config);
        } else if (config.format === 'json') {
            result = generateJSON(appState);
        } else if (config.format === 'sql') {
            result = generateSQL(appState, config);
        }

        self.postMessage({ result, format: config.format });
    }
};

function generateCSV(appState, config) {
    const { separator, quoteChar } = config;
    let csv = '';

    // Header (from first segment)
    const header = appState.segments[0].columns.map(col => {
        let name = col.name;
        if (quoteChar) name = `${quoteChar}${name}${quoteChar}`;
        return name;
    }).join(separator);
    csv += header + '\n';

    // Body
    appState.segments.forEach(segment => {
        for (let i = 0; i < segment.rows; i++) {
            const row = segment.columns.map(col => {
                const context = { index: i, segment: segment };
                let val = generators[col.type](col.config, context);
                if (quoteChar) val = `${quoteChar}${val}${quoteChar}`;
                return val;
            }).join(separator);
            csv += row + '\n';
        }
    });

    return csv;
}

function generateJSON(appState) {
    const allData = [];
    appState.segments.forEach(segment => {
        for (let i = 0; i < segment.rows; i++) {
            const rowObj = {};
            segment.columns.forEach(col => {
                const context = { index: i, segment: segment };
                rowObj[col.name] = generators[col.type](col.config, context);
            });
            allData.push(rowObj);
        }
    });
    return JSON.stringify(allData, null, 2);
}

function generateSQL(appState, config) {
    const tableName = config.tableName || 'my_table';
    let sql = '';

    appState.segments.forEach(segment => {
        for (let i = 0; i < segment.rows; i++) {
            const colNames = segment.columns.map(col => `\`${col.name}\``).join(', ');
            const colValues = segment.columns.map(col => {
                const context = { index: i, segment: segment };
                let val = generators[col.type](col.config, context);
                // Basic SQL escaping
                val = val.replace(/'/g, "''");
                return `'${val}'`;
            }).join(', ');

            sql += `INSERT INTO \`${tableName}\` (${colNames}) VALUES (${colValues});\n`;
        }
    });

    return sql;
}
