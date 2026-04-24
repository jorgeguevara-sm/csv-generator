/**
 * Shared Data and Generation Logic for CSV Generator
 */

const NAMES = ['Juan', 'Maria', 'Carlos', 'Ana', 'Luis', 'Sofia', 'Pedro', 'Laura', 'Diego', 'Elena', 'Jose', 'Isabel', 'Ricardo', 'Lucia', 'Fernando', 'Carmen', 'Javier', 'Adriana', 'Miguel', 'Beatriz', 'Alejandro', 'Valentina', 'Mateo', 'Camila', 'Sebastian', 'Martina', 'Nicolas', 'Ximena', 'Daniel', 'Natalia', 'Andres', 'Paula', 'Gabriel', 'Daniela', 'Tomas', 'Victoria', 'Lucas', 'Gabriela', 'Felipe', 'Sara'];
const SURNAMES = ['Perez', 'Garcia', 'Lopez', 'Martinez', 'Rodriguez', 'Gonzalez', 'Fernandez', 'Gomez', 'Sanchez', 'Diaz', 'Torres', 'Ramirez', 'Cruz', 'Flores', 'Guzman', 'Vargas', 'Romero', 'Suarez', 'Castro', 'Ruiz', 'Hernandez', 'Jimenez', 'Moreno', 'Muñoz', 'Alvarez', 'Castillo', 'Villalobos', 'Pacheco', 'Soto', 'Valdez', 'Reyes', 'Morales', 'Mendoza', 'Aguilar', 'Ortega', 'Delgado', 'Rios', 'Navarro', 'Ramos', 'Ibarra'];
const DOMAINS = ['gmail.com', 'hotmail.com', 'outlook.com', 'company.com', 'yahoo.com', 'icloud.com', 'protonmail.com', 'mail.com', 'example.com', 'test.com'];
const CITIES = ['Madrid', 'Barcelona', 'Bogotá', 'Buenos Aires', 'Ciudad de México', 'Lima', 'Santiago', 'Quito', 'Montevideo', 'San José', 'Miami', 'Nueva York', 'Londres', 'París', 'Berlín', 'Roma', 'Tokio', 'Sídney', 'Toronto', 'Ámsterdam', 'Lisboa', 'São Paulo', 'México DF', 'Valencia', 'Sevilla', 'Málaga', 'Bilbao', 'Zaragoza', 'Medellín', 'Cali', 'Barranquilla', 'Guayaquil', 'Rosario', 'Córdoba', 'La Paz', 'Asunción', 'Panamá', 'Santo Domingo', 'Caracas', 'San Juan'];
const COUNTRIES = ['España', 'Colombia', 'Argentina', 'México', 'Perú', 'Chile', 'Ecuador', 'Uruguay', 'Costa Rica', 'Estados Unidos', 'Reino Unido', 'Francia', 'Alemania', 'Italia', 'Japón', 'Australia', 'Canadá', 'Países Bajos', 'Brasil', 'Portugal', 'Paraguay', 'Bolivia', 'Panamá', 'República Dominicana', 'Venezuela', 'Puerto Rico', 'Bélgica', 'Suiza', 'Austria', 'Suecia', 'Noruega', 'Dinamarca', 'Irlanda', 'Nueva Zelanda', 'Corea del Sur', 'China', 'India', 'Sudáfrica', 'Egipto', 'Marruecos'];
const STREET_TYPES = ['Calle', 'Avenida', 'Carrera', 'Paseo', 'Bulevar', 'Diagonal', 'Travesía', 'Plaza', 'Ronda', 'Glorieta'];

const SPECIAL_CHARS_MAP = { 'sp': ' ', 'tab': '\t', 'nl': '\n', 'cr': '\r', 'qt': '"', 'cm': ',' };

function getSeededRandom(seedStr) {
    let h = 0x811c9dc5;
    for (let i = 0; i < seedStr.length; i++) {
        h ^= seedStr.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    h >>>= 0;
    return (h / 4294967296);
}

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

function generateDate(config, withTime, context) {
    const mode = config.mode || 'random';
    const defaultFmt = withTime ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD';
    if (mode === 'fixed') return formatDate(new Date(config.fixedValue || new Date().toISOString()), config.format || defaultFmt);
    const start = config.start ? new Date(config.start) : new Date(2020, 0, 1);
    const end = config.end ? new Date(config.end) : new Date();
    const blockSize = parseInt(config.blockSize) || 1;
    let rnd = blockSize > 1 ? getSeededRandom(`date_${Math.floor(context.index / blockSize)}` + (config.seedSalt || '')) : Math.random();
    return formatDate(new Date(start.getTime() + rnd * (end.getTime() - start.getTime())), config.format || defaultFmt);
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
        if (coreMethod === 'random') core = generateRandomString(parseInt(config.length) || 12);
        else if (coreMethod === 'mask') core = generateFromMask(config.mask || '###-AAA');
        else if (coreMethod === 'increment') core = String((parseInt(config.incStart) || 1) + (context.index * (parseInt(config.incStep) || 1)));
        else if (coreMethod === 'fixed') core = config.fixedValue || '';
        let result = prefix + core + suffix;
        if (config.specialChars && config.specialChars.length > 0) {
            config.specialChars.forEach(code => {
                const char = SPECIAL_CHARS_MAP[code];
                if (char) {
                    const posType = config.pos || 'rnd';
                    let pos = posType === 'start' ? 0 : (posType === 'end' ? result.length : Math.floor(Math.random() * (result.length + 1)));
                    result = result.slice(0, pos) + char + result.slice(pos);
                }
            });
        }
        return result;
    },
    categorical: (config, context) => {
        const values = (config.values || '').split(',').map(s => s.trim()).filter(s => s !== '');
        if (values.length === 0) return '';
        if (config.catMode === 'sequential') return values[Math.floor(context.index / (parseInt(config.blockSize) || 1)) % values.length];
        return values[Math.floor(Math.random() * values.length)];
    },
    email: () => {
        const name = NAMES[Math.floor(Math.random() * NAMES.length)].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const surname = SURNAMES[Math.floor(Math.random() * SURNAMES.length)].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return `${name}.${surname}${Math.floor(Math.random() * 100)}@${DOMAINS[Math.floor(Math.random() * DOMAINS.length)]}`;
    },
    fullname: () => `${NAMES[Math.floor(Math.random() * NAMES.length)]} ${SURNAMES[Math.floor(Math.random() * SURNAMES.length)]} ${SURNAMES[Math.floor(Math.random() * SURNAMES.length)]}`,
    phone: (config) => {
        let num = '';
        for (let i = 0; i < (parseInt(config.length) || 9); i++) num += Math.floor(Math.random() * 10);
        return `${config.countryCode || '+34'} ${num}`;
    },
    city: () => CITIES[Math.floor(Math.random() * CITIES.length)],
    country: () => COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
    address: () => `${STREET_TYPES[Math.floor(Math.random() * STREET_TYPES.length)]} ${SURNAMES[Math.floor(Math.random() * SURNAMES.length)]}, ${Math.floor(Math.random() * 200) + 1}`,
    date: (config, context) => generateDate(config, false, context),
    datetime: (config, context) => generateDate(config, true, context),
    boolean: (config, context) => {
        if (config.mode === 'fixed') return config.fixedValue === 'true' ? 'true' : 'false';
        const blockSize = parseInt(config.blockSize) || 1;
        let rnd = blockSize > 1 ? getSeededRandom(`bool_${Math.floor(context.index / blockSize)}` + (config.seedSalt || '')) : Math.random();
        return rnd < 0.5 ? 'true' : 'false';
    },
    uuid: () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NAMES, SURNAMES, DOMAINS, CITIES, COUNTRIES, STREET_TYPES, generators };
}
