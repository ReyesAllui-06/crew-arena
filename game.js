'use strict';
/* Criaturas Rogue: roguelike por oleadas con monedas, tienda y gacha.
   Nombres, tipos, estadísticas y evoluciones vienen de PokeAPI (https://pokeapi.co). */

const $ = s => document.querySelector(s);
const app = $('#app');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const BEST_KEY = 'cr_best_pk';
const SAVE_KEY = 'cr_save_pk';
const META_KEY = 'cr_meta_pk';
const DEX_KEY = 'cr_dex_v1';       // caché de datos de la API
const API = 'https://pokeapi.co/api/v2';
const MAX_ID = 151;                 // primera generación

/* ---------- Estadísticas, tipos, rarezas ---------- */
const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
const API_STATS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
const STAT_NAME = { hp: 'PS', atk: 'Ataque', def: 'Defensa', spa: 'At. Esp.', spd: 'Def. Esp.', spe: 'Velocidad' };
const STAT_SHORT = { atk: 'Atq', def: 'Def', spa: 'AtE', spd: 'DfE', spe: 'Vel' };
const CAT_NAME = { F: 'Físico', E: 'Especial', S: 'Estado' };

const TYPE_ES = {
  normal: 'Normal', fire: 'Fuego', water: 'Agua', grass: 'Planta', electric: 'Eléctrico', ice: 'Hielo',
  fighting: 'Lucha', poison: 'Veneno', ground: 'Tierra', flying: 'Volador', psychic: 'Psíquico', bug: 'Bicho',
  rock: 'Roca', ghost: 'Fantasma', dragon: 'Dragón', dark: 'Siniestro', steel: 'Acero', fairy: 'Hada'
};
const TYPE_COLOR = {
  Normal: '#a8a29e', Fuego: '#f97316', Agua: '#3b82f6', Planta: '#22c55e', Eléctrico: '#eab308', Hielo: '#67e8f9',
  Lucha: '#dc2626', Veneno: '#a855f7', Tierra: '#ca8a04', Volador: '#93c5fd', Psíquico: '#ec4899', Bicho: '#84cc16',
  Roca: '#b45309', Fantasma: '#7c3aed', Dragón: '#6366f1', Siniestro: '#78716c', Acero: '#94a3b8', Hada: '#f9a8d4'
};
// Icono original por tipo (no se usan los dibujos oficiales).
const TYPE_ICON = {
  Normal: '🐾', Fuego: '🔥', Agua: '💧', Planta: '🌿', Eléctrico: '⚡', Hielo: '❄️', Lucha: '🥊', Veneno: '☠️',
  Tierra: '⛰️', Volador: '🪶', Psíquico: '🔮', Bicho: '🐛', Roca: '🪨', Fantasma: '👻', Dragón: '🐉',
  Siniestro: '🌑', Acero: '⚙️', Hada: '✨'
};
// EFF[ataque][defensa] = multiplicador (1 si no aparece)
const EFF = {
  Normal: { Roca: .5, Acero: .5, Fantasma: 0 },
  Fuego: { Planta: 2, Hielo: 2, Bicho: 2, Acero: 2, Fuego: .5, Agua: .5, Roca: .5, Dragón: .5 },
  Agua: { Fuego: 2, Tierra: 2, Roca: 2, Agua: .5, Planta: .5, Dragón: .5 },
  Eléctrico: { Agua: 2, Volador: 2, Eléctrico: .5, Planta: .5, Dragón: .5, Tierra: 0 },
  Planta: { Agua: 2, Tierra: 2, Roca: 2, Fuego: .5, Planta: .5, Veneno: .5, Volador: .5, Bicho: .5, Dragón: .5, Acero: .5 },
  Hielo: { Planta: 2, Tierra: 2, Volador: 2, Dragón: 2, Fuego: .5, Agua: .5, Hielo: .5, Acero: .5 },
  Lucha: { Normal: 2, Hielo: 2, Roca: 2, Siniestro: 2, Acero: 2, Veneno: .5, Volador: .5, Psíquico: .5, Bicho: .5, Hada: .5, Fantasma: 0 },
  Veneno: { Planta: 2, Hada: 2, Veneno: .5, Tierra: .5, Roca: .5, Fantasma: .5, Acero: 0 },
  Tierra: { Fuego: 2, Eléctrico: 2, Veneno: 2, Roca: 2, Acero: 2, Planta: .5, Bicho: .5, Volador: 0 },
  Volador: { Planta: 2, Lucha: 2, Bicho: 2, Eléctrico: .5, Roca: .5, Acero: .5 },
  Psíquico: { Lucha: 2, Veneno: 2, Psíquico: .5, Acero: .5, Siniestro: 0 },
  Bicho: { Planta: 2, Psíquico: 2, Siniestro: 2, Fuego: .5, Lucha: .5, Veneno: .5, Volador: .5, Fantasma: .5, Acero: .5, Hada: .5 },
  Roca: { Fuego: 2, Hielo: 2, Volador: 2, Bicho: 2, Lucha: .5, Tierra: .5, Acero: .5 },
  Fantasma: { Psíquico: 2, Fantasma: 2, Siniestro: .5, Normal: 0 },
  Dragón: { Dragón: 2, Acero: .5, Hada: 0 },
  Siniestro: { Psíquico: 2, Fantasma: 2, Lucha: .5, Siniestro: .5, Hada: .5 },
  Acero: { Hielo: 2, Roca: 2, Hada: 2, Fuego: .5, Agua: .5, Eléctrico: .5, Acero: .5 },
  Hada: { Lucha: 2, Dragón: 2, Siniestro: 2, Fuego: .5, Veneno: .5, Acero: .5 }
};
// Multiplicador contra una especie (uno o dos tipos).
const effOn = (atkType, sp) => sp.types.reduce((m, t) => m * (EFF[atkType]?.[t] ?? 1), 1);
// Tipo de cobertura para especies de un solo tipo.
const COVER = {
  Normal: 'Siniestro', Fuego: 'Tierra', Agua: 'Hielo', Planta: 'Veneno', Eléctrico: 'Acero', Hielo: 'Agua',
  Lucha: 'Roca', Veneno: 'Siniestro', Tierra: 'Roca', Volador: 'Lucha', Psíquico: 'Hada', Bicho: 'Volador',
  Roca: 'Tierra', Fantasma: 'Siniestro', Dragón: 'Fuego', Siniestro: 'Fantasma', Acero: 'Tierra', Hada: 'Psíquico'
};

const COND = {
  psn: { tag: 'ENV', name: 'envenenado', color: '#a855f7' },
  brn: { tag: 'QUE', name: 'quemado', color: '#f97316' },
  par: { tag: 'PAR', name: 'paralizado', color: '#eab308' }
};

const RARITY = {
  1: { name: 'Común', color: '#9aa0b4', w: 60, minIv: 0, sell: 10 },
  2: { name: 'Raro', color: '#3b82f6', w: 28, minIv: 4, sell: 25 },
  3: { name: 'Épico', color: '#a855f7', w: 10, minIv: 8, sell: 60 },
  4: { name: 'Legendario', color: '#f59e0b', w: 2, minIv: 12, sell: 150 }
};

/* ---------- Ataques ---------- */
// Por tipo: F = físicos, E = especiales. [nombre, potencia, precisión] débil / medio / fuerte.
const MOVES = {
  Normal: { F: [['Placaje', 40, 100], ['Embestida', 70, 95], ['Golpe Brutal', 100, 85]], E: [['Grito', 40, 100], ['Onda Sónica', 70, 95], ['Hiperrugido', 100, 85]] },
  Fuego: { F: [['Puño Brasa', 40, 100], ['Rueda Ígnea', 70, 95], ['Envite Llamas', 100, 85]], E: [['Ascuas', 40, 100], ['Lanzallamas', 70, 95], ['Infierno', 100, 85]] },
  Agua: { F: [['Golpe Ola', 40, 100], ['Hidrocola', 70, 95], ['Cascada Brutal', 100, 85]], E: [['Burbuja', 40, 100], ['Chorro', 70, 95], ['Maremoto', 100, 85]] },
  Planta: { F: [['Hoja Afilada', 40, 100], ['Látigo Raíz', 70, 95], ['Mazazo Tronco', 100, 85]], E: [['Hojas', 40, 100], ['Bola Savia', 70, 95], ['Tormenta Verde', 100, 85]] },
  Eléctrico: { F: [['Puño Chispa', 40, 100], ['Colmillo Rayo', 70, 95], ['Placaje Voltio', 100, 85]], E: [['Chispazo', 40, 100], ['Descarga', 70, 95], ['Tormenta Eléctrica', 100, 85]] },
  Hielo: { F: [['Puño Hielo', 40, 100], ['Colmillo Helado', 70, 95], ['Alud', 100, 85]], E: [['Nieve Polvo', 40, 100], ['Rayo Gélido', 70, 95], ['Ventisca', 100, 85]] },
  Lucha: { F: [['Golpe Kárate', 40, 100], ['Patada Salto', 70, 95], ['Puño Final', 100, 85]], E: [['Onda Vacío', 40, 100], ['Esfera Aural', 70, 95], ['Onda Certera', 100, 85]] },
  Veneno: { F: [['Picotazo Tóxico', 40, 100], ['Puya Nociva', 70, 95], ['Lanza Tóxica', 100, 85]], E: [['Ácido', 40, 100], ['Bomba Lodo', 70, 95], ['Lanzamugre', 100, 85]] },
  Tierra: { F: [['Bofetón Lodo', 40, 100], ['Excavar', 70, 95], ['Terremoto', 100, 85]], E: [['Disparo Lodo', 40, 100], ['Tierra Viva', 70, 95], ['Ola Arena', 100, 85]] },
  Volador: { F: [['Picotazo', 40, 100], ['Ataque Ala', 70, 95], ['Pájaro Osado', 100, 85]], E: [['Tornado', 40, 100], ['Aire Afilado', 70, 95], ['Vendaval', 100, 85]] },
  Psíquico: { F: [['Cabezazo Mental', 40, 100], ['Psicocorte', 70, 95], ['Puño Mente', 100, 85]], E: [['Confusión', 40, 100], ['Psicorrayo', 70, 95], ['Onda Mental', 100, 85]] },
  Bicho: { F: [['Picadura', 40, 100], ['Tijera X', 70, 95], ['Megacuerno', 100, 85]], E: [['Zumbido Leve', 40, 100], ['Zumbido', 70, 95], ['Enjambre', 100, 85]] },
  Roca: { F: [['Pedrada', 40, 100], ['Avalancha', 70, 95], ['Roca Afilada', 100, 85]], E: [['Polvo Roca', 40, 100], ['Joya Brillante', 70, 95], ['Meteoro Pétreo', 100, 85]] },
  Fantasma: { F: [['Lengüetazo', 40, 100], ['Garra Umbría', 70, 95], ['Golpe Fantasma', 100, 85]], E: [['Tinieblas', 40, 100], ['Bola Sombra', 70, 95], ['Llanto Espectral', 100, 85]] },
  Dragón: { F: [['Garra Dragón', 40, 100], ['Cola Dragón', 70, 95], ['Enfado', 100, 85]], E: [['Furia Dragón', 40, 100], ['Pulso Dragón', 70, 95], ['Cometa Draco', 100, 85]] },
  Siniestro: { F: [['Mordisco', 40, 100], ['Triturar', 70, 95], ['Mordisco Abismal', 100, 85]], E: [['Alarido', 40, 100], ['Pulso Umbrío', 70, 95], ['Pesadilla', 100, 85]] },
  Acero: { F: [['Garra Metal', 40, 100], ['Cabeza de Hierro', 70, 95], ['Cuerpo Pesado', 100, 85]], E: [['Destello', 40, 100], ['Foco Resplandor', 70, 95], ['Cañón Metálico', 100, 85]] },
  Hada: { F: [['Carantoña Leve', 40, 100], ['Carantoña', 70, 95], ['Golpe Hada', 100, 85]], E: [['Viento Feérico', 40, 100], ['Brillo Mágico', 70, 95], ['Fuerza Lunar', 100, 85]] }
};
const dmgMove = (type, cat, tier) => {
  const [name, power, acc] = MOVES[type][cat][tier];
  return { name, type, cat, power, acc };
};
const statusMove = (name, type, acc, eff) => ({ name, type, cat: 'S', power: 0, acc, eff });

// Ataques de estado. eff: {target, stat, n} cambia nivel de stat; {cond} pone estado; {heal} cura.
const GROWL = statusMove('Gruñido', 'Normal', 100, { target: 'foe', stat: 'atk', n: -1 });
const STATUS_BY_TYPE = {
  Fuego: statusMove('Fuego Fatuo', 'Fuego', 85, { target: 'foe', cond: 'brn' }),
  Agua: statusMove('Manantial', 'Agua', 100, { target: 'self', heal: 0.5 }),
  Planta: statusMove('Síntesis', 'Planta', 100, { target: 'self', heal: 0.5 }),
  Eléctrico: statusMove('Onda Paralizante', 'Eléctrico', 90, { target: 'foe', cond: 'par' }),
  Hielo: statusMove('Escarcha', 'Hielo', 95, { target: 'foe', stat: 'spe', n: -2 }),
  Lucha: statusMove('Concentración', 'Lucha', 100, { target: 'self', stat: 'atk', n: 2 }),
  Veneno: statusMove('Tóxico', 'Veneno', 90, { target: 'foe', cond: 'psn' }),
  Tierra: statusMove('Lodazal', 'Tierra', 95, { target: 'foe', stat: 'spe', n: -2 }),
  Volador: statusMove('Viento Afín', 'Volador', 100, { target: 'self', stat: 'spe', n: 2 }),
  Psíquico: statusMove('Amnesia', 'Psíquico', 100, { target: 'self', stat: 'spd', n: 2 }),
  Bicho: statusMove('Disparo Seda', 'Bicho', 95, { target: 'foe', stat: 'spe', n: -2 }),
  Roca: statusMove('Coraza', 'Roca', 100, { target: 'self', stat: 'def', n: 2 }),
  Fantasma: statusMove('Mirada Espectral', 'Fantasma', 95, { target: 'foe', stat: 'spd', n: -2 }),
  Dragón: statusMove('Danza Dragón', 'Dragón', 100, { target: 'self', stat: 'atk', n: 2 }),
  Siniestro: statusMove('Maquinación', 'Siniestro', 100, { target: 'self', stat: 'spa', n: 2 }),
  Acero: statusMove('Defensa Férrea', 'Acero', 100, { target: 'self', stat: 'def', n: 2 }),
  Hada: statusMove('Encanto', 'Hada', 100, { target: 'foe', stat: 'atk', n: -2 })
};
const BOOST = {
  F: statusMove('Danza Feroz', 'Normal', 100, { target: 'self', stat: 'atk', n: 2 }),
  E: statusMove('Mente Clara', 'Normal', 100, { target: 'self', stat: 'spa', n: 2 })
};

/* ---------- Carga de datos desde PokeAPI (con caché) ---------- */
const idFromUrl = url => url.split('/').filter(Boolean).pop();

async function fetchJson(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${url} -> ${r.status}`);
      return await r.json();
    } catch (err) {
      if (i >= tries) throw err;
      await sleep(500 * i);
    }
  }
}

// Ejecuta fn sobre items con n peticiones a la vez (no saturar la API).
async function runPool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) await fn(items[i++]);
  }));
}

async function loadDex(onProgress) {
  try {
    const cached = JSON.parse(localStorage.getItem(DEX_KEY));
    if (cached && Object.keys(cached).length === MAX_ID) return cached;
  } catch { /* caché dañada: volver a descargar */ }

  const dex = {};
  const ids = Array.from({ length: MAX_ID }, (_, i) => String(i + 1));
  let done = 0;
  await runPool(ids, 8, async id => {
    const [p, sp] = await Promise.all([fetchJson(`${API}/pokemon/${id}`), fetchJson(`${API}/pokemon-species/${id}`)]);
    dex[id] = {
      name: sp.names.find(n => n.language.name === 'es')?.name || p.name,
      types: [...p.types].sort((a, b) => a.slot - b.slot).map(t => TYPE_ES[t.type.name]),
      b: API_STATS.map(k => p.stats.find(s => s.stat.name === k).base_stat),
      legendary: sp.is_legendary || sp.is_mythical,
      capture: sp.capture_rate,
      chain: sp.evolution_chain.url
    };
    onProgress(++done, MAX_ID);
  });

  // Evoluciones: primera rama de cada cadena, con su nivel (30 si es por piedra o intercambio).
  const walk = node => {
    const id = idFromUrl(node.species.url);
    for (const next of node.evolves_to) {
      const nid = idFromUrl(next.species.url);
      if (dex[id] && dex[nid]) {
        dex[nid].pre = true;
        if (!dex[id].evo) dex[id].evo = [nid, next.evolution_details[0]?.min_level || 30];
      }
      walk(next);
    }
  };
  const chains = [...new Set(Object.values(dex).map(d => d.chain))];
  await runPool(chains, 8, async url => walk((await fetchJson(url)).chain));
  for (const d of Object.values(dex)) delete d.chain;

  localStorage.setItem(DEX_KEY, JSON.stringify(dex));
  return dex;
}

const SPECIES = {};
function buildSpecies(dex) {
  for (const [id, d] of Object.entries(dex)) {
    const sum = d.b.reduce((a, c) => a + c, 0);
    const r = d.legendary ? 4 : d.capture <= 45 ? 3 : d.capture <= 120 ? 2 : 1;
    SPECIES[id] = {
      name: d.name,
      types: d.types,
      type: d.types[0],
      extra: d.types[1] || COVER[d.types[0]],
      emoji: TYPE_ICON[d.types[0]],
      b: d.b, r,
      evo: d.evo || null,
      exp: Math.round(sum * sum / 2000),
      base: !d.pre && r < 4, // forma base: sale salvaje y en el gacha
      boss: r === 4
    };
  }
  // Enlace hacia atrás (de qué evoluciona) para que la línea comparta dibujo base.
  for (const [id, s] of Object.entries(SPECIES)) if (s.evo && SPECIES[s.evo[0]]) SPECIES[s.evo[0]].preId = id;
}
const STARTERS = ['1', '4', '7'];
const WILD_WEIGHT = { 1: 10, 2: 4, 3: 1 };

/* ---------- Objetos, premios y tienda ---------- */
const ITEMS = {
  pocion: { name: 'Poción', icon: '🧪', desc: 'Cura 20 PS' },
  superpocion: { name: 'Superpoción', icon: '💊', desc: 'Cura 60 PS' },
  cura: { name: 'Cura Total', icon: '🌿', desc: 'Quita veneno, quemadura o parálisis' },
  revivir: { name: 'Revivir', icon: '💖', desc: 'Revive con la mitad de PS' },
  caramelo: { name: 'Caramelo', icon: '🍬', desc: 'Sube 1 nivel' },
  ball: { name: 'Bola', icon: '⚪', desc: 'Captura (x1)', mult: 1 },
  superball: { name: 'Superbola', icon: '🔵', desc: 'Captura (x1.5)', mult: 1.5 },
  ultraball: { name: 'Ultrabola', icon: '🟡', desc: 'Captura (x2.5)', mult: 2.5 },
  curar: { name: 'Curar equipo', icon: '⛺', desc: 'Cura a todo el equipo ahora' }
};
const BALLS = ['ball', 'superball', 'ultraball'];
const EMPTY_BAG = () => ({ pocion: 0, superpocion: 0, cura: 0, revivir: 0, caramelo: 0, ball: 0, superball: 0, ultraball: 0 });
const REWARDS = [
  { key: 'pocion', n: 2, w: 28 }, { key: 'superpocion', n: 1, w: 14 }, { key: 'cura', n: 1, w: 10 },
  { key: 'ball', n: 3, w: 24 }, { key: 'superball', n: 2, w: 12 }, { key: 'ultraball', n: 1, w: 5 },
  { key: 'revivir', n: 1, w: 9 }, { key: 'caramelo', n: 1, w: 10 }, { key: 'curar', n: 1, w: 6 }
];
const SHOP = [['pocion', 15], ['superpocion', 40], ['cura', 20], ['revivir', 60], ['caramelo', 50], ['ball', 10], ['superball', 25], ['ultraball', 60]];
const PULL_COST = 100;
const PULL10_COST = 900;
// Monedas al terminar la partida
const COIN = { kill: 5, boss: 50, catch: 3, wave: 2 };

/* ---------- Progreso permanente (monedas, colección) ---------- */
const randIv = (min = 0) => STATS.map(() => min + rnd(32 - min));

let M = null;
function loadMeta() {
  try {
    const m = JSON.parse(localStorage.getItem(META_KEY));
    if (m && Array.isArray(m.collection)) return m;
  } catch { /* datos dañados: empezar de cero */ }
  const m = { coins: 0, nextId: 1, collection: [], startBag: {} };
  for (const id of STARTERS) m.collection.push({ uid: m.nextId++, id, iv: randIv() });
  return m;
}
const saveMeta = () => localStorage.setItem(META_KEY, JSON.stringify(M));

function grade(iv) {
  const p = iv.reduce((a, c) => a + c, 0) / (31 * 6);
  return p >= 0.85 ? 'S' : p >= 0.65 ? 'A' : p >= 0.45 ? 'B' : 'C';
}

const gachaPool = r => Object.keys(SPECIES).filter(k => SPECIES[k].r === r && (SPECIES[k].base || SPECIES[k].boss));

function pull() {
  let x = Math.random() * 100, r = 4;
  for (const k of [1, 2, 3, 4]) if ((x -= RARITY[k].w) < 0) { r = k; break; }
  while (!gachaPool(r).length) r--; // por si una rareza queda vacía
  const id = pick(gachaPool(r));
  const isNew = !M.collection.some(e => e.id === id);
  const entry = { uid: M.nextId++, id, iv: randIv(RARITY[r].minIv) };
  M.collection.push(entry);
  return { entry, isNew };
}

/* ---------- Estado de la partida ---------- */
let S = null; // { wave, team, bag, enemy, active, kills, bosses, caught }
const getBest = () => Number(localStorage.getItem(BEST_KEY)) || 0;
const cur = () => S.team[S.active];
const nm = m => SPECIES[m.id].name;
const label = m => (m === S.enemy ? `${nm(m)} rival` : nm(m));
const alive = () => S.team.filter(m => m.hp > 0);
const save = () => localStorage.setItem(SAVE_KEY, JSON.stringify({ ...S, enemy: null }));

/* ---------- Lógica de criaturas ---------- */
function calc(m) {
  const b = SPECIES[m.id].b, L = m.lvl;
  STATS.forEach((k, i) => {
    const v = Math.floor((2 * b[i] + m.iv[i]) * L / 100);
    if (k === 'hp') m.maxhp = v + L + 10;
    else m[k] = v + 5;
  });
}

// Stat efectiva con niveles de cambio (-6..+6) y parálisis.
function stat(m, k) {
  const s = m.st?.[k] || 0;
  let v = m[k] * (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));
  if (k === 'spe' && m.cond === 'par') v /= 2;
  return v;
}

function learnset(id) {
  const s = SPECIES[id];
  const c = s.b[1] >= s.b[3] ? 'F' : 'E'; // físico o especial según su mejor ataque
  const st = s.type === 'Normal' ? BOOST[c] : STATUS_BY_TYPE[s.type];
  return [
    [1, dmgMove('Normal', c, 0)], [1, GROWL], [1, dmgMove(s.type, c, 0)], [7, st],
    [10, dmgMove(s.extra, c, 0)], [16, dmgMove(s.type, c, 1)], [26, dmgMove(s.extra, c, 1)],
    [34, dmgMove(s.type, c, 2)], [44, dmgMove(s.extra, c, 2)]
  ];
}

// 4 huecos: como mucho 1 de estado; los de daño cambian al más débil.
function learnMove(m, mv) {
  if (m.moves.some(x => x.name === mv.name)) return null;
  const oldStatus = mv.cat === 'S' ? m.moves.find(x => x.cat === 'S') : null;
  if (m.moves.length < 4 && !oldStatus) { m.moves.push(mv); return `${nm(m)} aprende ${mv.name}.`; }
  let old;
  if (mv.cat === 'S') {
    old = oldStatus;
  } else {
    const dmg = m.moves.filter(x => x.cat !== 'S');
    const w = dmg.reduce((a, x) => (x.power < a.power || (x.power === a.power && x.type === 'Normal') ? x : a), dmg[0]);
    if (w && (mv.power > w.power || (mv.power === w.power && w.type === 'Normal' && mv.type !== 'Normal'))) old = w;
  }
  if (!old) return null;
  m.moves[m.moves.indexOf(old)] = mv;
  return `${nm(m)} olvida ${old.name} y aprende ${mv.name}.`;
}

function makeMon(id, lvl, iv = randIv()) {
  while (SPECIES[id].evo && lvl >= SPECIES[id].evo[1]) id = SPECIES[id].evo[0];
  const m = { id, lvl, iv, xp: lvl ** 3, moves: [], cond: null };
  for (const [l, mv] of learnset(id)) if (l <= lvl) learnMove(m, mv);
  calc(m);
  m.hp = m.maxhp;
  return m;
}

async function tryEvolve(m, loud) {
  const evo = SPECIES[m.id].evo;
  if (!evo || m.lvl < evo[1]) return;
  const old = nm(m), oldMax = m.maxhp;
  m.id = evo[0];
  calc(m);
  if (m.hp > 0) m.hp = Math.min(m.maxhp, m.hp + m.maxhp - oldMax);
  if (loud) { updateCards(); await say(`¡${old} evolucionó a ${nm(m)}!`, 1100); }
}

async function gainXp(m, amount, loud) {
  m.xp += amount;
  while (m.lvl < 100 && m.xp >= (m.lvl + 1) ** 3) {
    m.lvl++;
    const oldMax = m.maxhp;
    calc(m);
    m.hp += m.maxhp - oldMax;
    if (loud) { updateCards(); await say(`¡${nm(m)} sube a Nv. ${m.lvl}!`); }
    for (const [l, mv] of learnset(m.id)) {
      if (l !== m.lvl) continue;
      const t = learnMove(m, mv);
      if (t && loud) await say(t);
    }
    await tryEvolve(m, loud);
  }
}

function healAll() { for (const m of S.team) { m.hp = m.maxhp; m.cond = null; } }

/* ---------- Combate ---------- */
function damage(att, def, mv) {
  const phys = mv.cat === 'F';
  const e = effOn(mv.type, SPECIES[def.id]);
  if (e === 0) return { dmg: 0, e, crit: 1 };
  const stab = SPECIES[att.id].types.includes(mv.type) ? 1.5 : 1;
  const crit = Math.random() < 1 / 16 ? 1.5 : 1;
  const A = stat(att, phys ? 'atk' : 'spa') * (phys && att.cond === 'brn' ? 0.5 : 1);
  const D = stat(def, phys ? 'def' : 'spd');
  const base = ((2 * att.lvl / 5 + 2) * mv.power * A / D) / 50 + 2;
  const dmg = Math.max(1, Math.floor(base * stab * e * crit * (0.85 + Math.random() * 0.15)));
  return { dmg, e, crit };
}

/* ---------- Animaciones de ataque ---------- */
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sideOf = m => (m === S.enemy ? 'enemy' : 'player');

// Centro de un dibujo relativo al campo de batalla.
function centerOf(side) {
  const el = $(`#${side} .sprite`), field = $('#field');
  if (!el || !field) return null;
  const r = el.getBoundingClientRect(), f = field.getBoundingClientRect();
  return { x: r.left - f.left + r.width / 2, y: r.top - f.top + r.height / 2 };
}

// Crea un efecto (bola, estallido…) dentro del campo y lo anima.
function fx(cls, color, at, keyframes, ms) {
  const el = document.createElement('div');
  el.className = `fx ${cls}`;
  el.style.setProperty('--fx', color);
  el.style.left = `${at.x}px`;
  el.style.top = `${at.y}px`;
  $('#field').append(el);
  return el.animate(keyframes, { duration: ms, easing: 'ease-out' }).finished.then(() => el.remove());
}

// Físico: embestida + estallido. Especial: bola que vuela. Estado: brillo en el objetivo.
async function animateMove(a, d, mv) {
  if (REDUCED) return;
  const aSide = sideOf(a), dSide = sideOf(d), color = TYPE_COLOR[mv.type];
  const from = centerOf(aSide), to = centerOf(dSide);
  if (!from || !to) return;
  const spr = $(`#${aSide} .sprite`);
  if (mv.cat === 'F') {
    const dx = (to.x - from.x) * 0.35, dy = (to.y - from.y) * 0.35;
    await spr.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${dx}px,${dy}px) scale(1.08)` }, { transform: 'translate(0,0)' }],
      { duration: 320, easing: 'ease-in-out' }).finished;
    fx('burst', color, to, [{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1.6)', opacity: 0 }], 300);
  } else if (mv.cat === 'E') {
    spr.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(1.8)' }, { filter: 'brightness(1)' }], { duration: 420 });
    await fx('orb', color, from, [
      { transform: 'translate(-50%,-50%) scale(.5)' },
      { transform: `translate(calc(-50% + ${to.x - from.x}px), calc(-50% + ${to.y - from.y}px)) scale(1.3)` }
    ], 420);
    fx('burst', color, to, [{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(2)', opacity: 0 }], 320);
  } else {
    const target = mv.eff.target === 'self' ? aSide : dSide;
    const t = $(`#${target} .sprite`);
    await t.animate([
      { filter: `drop-shadow(0 0 0 ${color})` },
      { filter: `drop-shadow(0 0 14px ${color}) brightness(1.3)` },
      { filter: `drop-shadow(0 0 0 ${color})` }
    ], { duration: 550 }).finished;
  }
}

async function attack(a, d, mv) {
  await say(`${label(a)} usa ${mv.name}.`, 300);
  await animateMove(a, d, mv);
  if (Math.random() * 100 >= mv.acc) { await say('¡Pero falló!'); return; }
  const r = damage(a, d, mv);
  if (r.e === 0) { await say(`No afecta a ${label(d)}…`); return; }
  d.hp = Math.max(0, d.hp - r.dmg);
  updateCards();
  flash(d === S.enemy ? 'enemy' : 'player', 'hit');
  if (r.crit > 1) await say('¡Golpe crítico!');
  if (r.e > 1) await say('¡Es muy eficaz!');
  else if (r.e < 1) await say('No es muy eficaz…');
  if (d.hp <= 0) await say(`¡${label(d)} se debilitó!`);
}

async function useStatus(a, d, mv) {
  await say(`${label(a)} usa ${mv.name}.`, 300);
  await animateMove(a, d, mv);
  const f = mv.eff;
  if (f.target === 'foe' && Math.random() * 100 >= mv.acc) return say('¡Pero falló!');
  if (f.heal) {
    const h = Math.min(Math.floor(a.maxhp * f.heal), a.maxhp - a.hp);
    if (!h) return say('Pero no pasó nada.');
    a.hp += h;
    updateCards();
    return say(`${label(a)} recupera ${h} PS.`);
  }
  if (f.cond) {
    const ts = SPECIES[d.id].types;
    const immune = (f.cond === 'brn' && ts.includes('Fuego'))
      || (f.cond === 'par' && ts.includes('Eléctrico'))
      || (f.cond === 'psn' && (ts.includes('Veneno') || ts.includes('Acero')));
    if (d.cond || immune) return say(`No afecta a ${label(d)}.`);
    d.cond = f.cond;
    updateCards();
    return say(`¡${label(d)} está ${COND[f.cond].name}!`);
  }
  const t = f.target === 'self' ? a : d;
  t.st ??= {};
  const old = t.st[f.stat] || 0;
  const nv = clamp(old + f.n, -6, 6);
  if (nv === old) return say(`${STAT_NAME[f.stat]} de ${label(t)} no puede cambiar más.`);
  t.st[f.stat] = nv;
  updateCards();
  const word = f.n > 0 ? (f.n > 1 ? 'sube mucho' : 'sube') : (f.n < -1 ? 'baja mucho' : 'baja');
  return say(`¡${STAT_NAME[f.stat]} de ${label(t)} ${word}!`);
}

async function act(a, d, mv) {
  if (a.cond === 'par' && Math.random() < 0.25) {
    await say(`${label(a)} está paralizado y no se mueve.`);
    return;
  }
  if (mv.cat === 'S') await useStatus(a, d, mv);
  else await attack(a, d, mv);
}

// IA: a veces usa estado; si no, 75% el mejor golpe.
function enemyChoice() {
  const e = S.enemy, p = cur();
  for (const mv of e.moves.filter(x => x.cat === 'S')) {
    const f = mv.eff;
    if (f.heal && e.hp < e.maxhp * 0.4 && Math.random() < 0.6) return mv;
    if (f.cond && !p.cond && Math.random() < 0.3) return mv;
    const t = f.target === 'self' ? e : p;
    if (f.stat && Math.abs(t.st?.[f.stat] || 0) < 2 && Math.random() < 0.2) return mv;
  }
  const dmg = e.moves.filter(x => x.cat !== 'S');
  if (!dmg.length) return pick(e.moves);
  const score = mv => {
    const phys = mv.cat === 'F';
    return mv.power * effOn(mv.type, SPECIES[p.id]) * (SPECIES[e.id].types.includes(mv.type) ? 1.5 : 1)
      * stat(e, phys ? 'atk' : 'spa') / stat(p, phys ? 'def' : 'spd');
  };
  return Math.random() < 0.75 ? dmg.reduce((b, x) => (score(x) > score(b) ? x : b)) : pick(dmg);
}

async function residual(m) {
  if (!m || m.hp <= 0 || (m.cond !== 'psn' && m.cond !== 'brn')) return;
  const d = Math.max(1, Math.floor(m.maxhp / (m.cond === 'psn' ? 8 : 16)));
  m.hp = Math.max(0, m.hp - d);
  updateCards();
  await say(`${label(m)} sufre por ${m.cond === 'psn' ? 'el veneno' : 'la quemadura'}.`);
  if (m.hp <= 0) await say(`¡${label(m)} se debilitó!`);
}

async function doTurn(action) {
  $('#menu').innerHTML = '';
  const p = cur(), e = S.enemy;
  if (action.kind === 'move') {
    const ps = stat(p, 'spe'), es = stat(e, 'spe');
    const first = ps > es || (ps === es && Math.random() < 0.5);
    const order = first ? [[p, e, action.move], [e, p, null]] : [[e, p, null], [p, e, action.move]];
    for (const [a, d, mv] of order) {
      if (a.hp <= 0 || d.hp <= 0) continue;
      await act(a, d, mv || enemyChoice());
    }
  } else {
    if (action.kind === 'switch') {
      await say(`¡Vuelve, ${nm(p)}!`, 400);
      delete p.st;
      S.active = action.idx;
      updateCards();
      await say(`¡Adelante, ${nm(cur())}!`);
    } else if (action.kind === 'ball') {
      if (await throwBall(action.key)) return;
    } else {
      await useItem(action.key, action.target);
    }
    await act(e, cur(), enemyChoice());
  }
  if (e.hp > 0) await residual(e);
  if (cur().hp > 0) await residual(cur());
  if (e.hp <= 0) return onEnemyFaint();
  if (cur().hp <= 0) return onPlayerFaint();
  showMenu();
}

async function useItem(key, m) {
  S.bag[key]--;
  if (key === 'pocion' || key === 'superpocion') {
    const heal = Math.min(key === 'pocion' ? 20 : 60, m.maxhp - m.hp);
    m.hp += heal;
    updateCards();
    await say(`${nm(m)} recupera ${heal} PS.`);
  } else if (key === 'cura') {
    m.cond = null;
    updateCards();
    await say(`${nm(m)} ya está sano.`);
  } else if (key === 'revivir') {
    m.hp = Math.floor(m.maxhp / 2);
    m.cond = null;
    updateCards();
    await say(`¡${nm(m)} ha revivido!`);
  } else if (key === 'caramelo') {
    await say(`${nm(m)} come un Caramelo.`);
    await gainXp(m, (m.lvl + 1) ** 3 - m.xp, true);
    updateCards();
  }
}

async function throwBall(key) {
  S.bag[key]--;
  const e = S.enemy;
  await say(`Lanzas una ${ITEMS[key].name}…`);
  let chance = (1 - (2 / 3) * e.hp / e.maxhp) * ITEMS[key].mult * 0.55;
  if (e.cond) chance *= 1.5;
  if (e.boss) chance *= 0.35;
  chance = Math.min(0.95, chance);
  for (let i = 0; i < 3; i++) await say('…', 400);
  if (Math.random() >= chance) {
    await say(`¡Oh, no! ${nm(e)} se escapó de la bola.`);
    return false;
  }
  flash('enemy', 'caught');
  await say(`¡Has capturado a ${nm(e)}!`, 1000);
  const wasBoss = e.boss;
  delete e.boss;
  delete e.st;
  S.caught++;
  await addToTeam(e);
  await winWave(wasBoss);
  return true;
}

async function addToTeam(m) {
  if (S.team.length < 6) { S.team.push(m); updateCards(); return; }
  const opts = S.team.map(x => ({ label: `Soltar a ${ico(x.id)} ${nm(x)} Nv. ${x.lvl}`, sub: `PS ${x.hp}/${x.maxhp}` }));
  opts.push({ label: `Dejar ir a ${nm(m)}`, sub: 'Mantener el equipo' });
  const i = await choose('Tu equipo está lleno (6). ¿Qué haces?', opts);
  if (i === S.team.length) { await say(`${nm(m)} vuelve a la naturaleza.`); return; }
  const gone = S.team[i];
  S.team[i] = m;
  updateCards();
  await say(`Adiós, ${nm(gone)}. ¡Hola, ${nm(m)}!`);
}

async function onEnemyFaint() {
  const e = S.enemy, p = cur();
  if (e.boss) S.bosses++; else S.kills++;
  const gain = Math.floor(SPECIES[e.id].exp * e.lvl / 2.5) * (e.boss ? 2 : 1);
  if (p.hp > 0) {
    await say(`${nm(p)} gana ${gain} PX.`);
    await gainXp(p, gain, true);
  }
  const others = S.team.filter(m => m !== p && m.hp > 0);
  for (const m of others) await gainXp(m, Math.floor(gain * 0.6), false);
  if (others.length) await say('El resto del equipo también gana PX.', 500);
  await winWave(e.boss);
}

async function onPlayerFaint() {
  if (!alive().length) return gameOver();
  const idxs = S.team.map((m, i) => i).filter(i => S.team[i].hp > 0);
  const i = await choose('¿Quién sale ahora?', idxs.map(j => monOption(S.team[j])));
  S.active = idxs[i];
  updateCards();
  await say(`¡Adelante, ${nm(cur())}!`);
  showMenu();
}

async function winWave(wasBoss) {
  localStorage.setItem(BEST_KEY, Math.max(getBest(), S.wave));
  if (wasBoss) { healAll(); await say('¡Jefe vencido! Tu equipo se cura.'); }
  S.wave++;
  S.enemy = null;
  updateCards();
  await rewardScreen();
}

function rollRewards() {
  const pool = [...REWARDS], out = [];
  while (out.length < 3) {
    let x = Math.random() * pool.reduce((s, r) => s + r.w, 0);
    const i = pool.findIndex(r => (x -= r.w) < 0);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

async function rewardScreen() {
  const opts = rollRewards();
  const i = await choose('Elige una recompensa', opts.map(r => ({
    label: `${ITEMS[r.key].icon} ${ITEMS[r.key].name}${r.n > 1 ? ' x' + r.n : ''}`,
    sub: ITEMS[r.key].desc
  })));
  const r = opts[i];
  if (r.key === 'curar') {
    healAll();
    updateCards();
    await say('¡Todo el equipo está curado!');
  } else {
    S.bag[r.key] += r.n;
    await say(`Obtienes ${ITEMS[r.key].name}${r.n > 1 ? ' x' + r.n : ''}.`);
  }
  save();
  startWave();
}

async function startWave() {
  if (!$('#field')) renderBattle();
  if (!alive().length) return gameOver();
  if (cur().hp <= 0) S.active = S.team.findIndex(m => m.hp > 0);
  for (const m of S.team) delete m.st;
  const boss = S.wave % 10 === 0;
  // Primeras 10 oleadas más suaves; después sube como antes.
  const early = S.wave <= 10;
  const baseLvl = early ? 2 + Math.floor(S.wave * 0.8) + rnd(2) : S.wave + rnd(3);
  const lvl = Math.min(100, baseLvl + (boss ? (early ? 2 : 5) : 0));
  let id;
  if (boss) {
    // Antes de la oleada 30 el jefe es una forma final; después, un legendario.
    const legend = S.wave >= 30;
    id = pick(Object.keys(SPECIES).filter(k => (legend ? SPECIES[k].boss : !SPECIES[k].boss && !SPECIES[k].evo)));
  } else {
    const pool = Object.keys(SPECIES).filter(k => SPECIES[k].base);
    let x = Math.random() * pool.reduce((s, k) => s + WILD_WEIGHT[SPECIES[k].r], 0);
    id = pool.find(k => (x -= WILD_WEIGHT[SPECIES[k].r]) < 0) || pick(pool);
  }
  S.enemy = makeMon(id, lvl, boss ? randIv(15) : S.wave <= 5 ? STATS.map(() => rnd(16)) : randIv());
  S.enemy.boss = boss;
  updateCards();
  await say(boss ? `¡Oleada ${S.wave}: el JEFE ${nm(S.enemy)} aparece!` : `Oleada ${S.wave}: ¡un ${nm(S.enemy)} salvaje!`);
  showMenu();
}

/* ---------- Interfaz de combate ---------- */
async function say(text, ms = 650) {
  const log = $('#log');
  if (!log) return;
  const p = document.createElement('p');
  p.textContent = text;
  log.append(p);
  while (log.children.length > 3) log.firstChild.remove();
  await sleep(ms);
}

function flash(side, cls) {
  const el = $(`#${side} .sprite`);
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth; // reinicia la animación
  el.classList.add(cls);
}

const badge = t => `<span class="badge" style="background:${TYPE_COLOR[t]}">${t}</span>`;
const badges = s => s.types.map(badge).join(' ');
const condBadge = c => (c ? `<span class="badge" style="background:${COND[c].color}">${COND[c].tag}</span>` : '');
const stagesText = m => Object.entries(m.st || {}).filter(([, v]) => v)
  .map(([k, v]) => `${STAT_SHORT[k]} ${v > 0 ? '+' : ''}${v}`).join(' · ');
/* ---------- Dibujos de píxeles originales (generados a partir del número) ---------- */
// Generador pseudoaleatorio con semilla: el mismo número da siempre el mismo dibujo.
function mulberry32(a) {
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Aclara (amt > 0) u oscurece (amt < 0) un color #rrggbb.
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const to = amt < 0 ? 0 : 255, k = Math.abs(amt);
  const ch = v => Math.round(v + (to - v) * k);
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

const PX = 32; // tamaño de la cuadrícula
const CX = 16; // eje de simetría

// Partes que no llevan luces ni sombras (ojos, boca…).
const FLAT = new Set(['pupil', 'shine', 'mouth', 'fang', 'eyeR', 'gem']);

// Devuelve una cuadrícula PX×PX de colores (null = vacío).
// Diseño original: cabeza + cuerpo + patas + adornos según el tipo. La línea evolutiva comparte forma y crece.
function pixelGrid(id) {
  const s = SPECIES[id];
  let root = id, stage = 0;
  while (SPECIES[root].preId) { root = SPECIES[root].preId; stage++; }
  const R = mulberry32(Number(root) * 7919 + 17);   // proporciones comunes de la línea
  const X = mulberry32(Number(id) * 104729 + 3);    // detalles de esta forma
  const types = s.types, has = t => types.includes(t);
  const g = Array.from({ length: PX }, () => Array(PX).fill(0));

  // --- Herramientas de dibujo (coordenadas continuas, centro de píxel = x + 0.5) ---
  const put = (x, y, m, on) => {
    if (x < 1 || y < 1 || x >= PX - 1 || y >= PX - 1) return;
    if (on && !on.includes(g[y][x])) return;
    g[y][x] = m;
  };
  const ellipse = (cx, cy, rx, ry, m, on) => {
    for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) put(x, y, m, on);
    }
  };
  const tri = (ax, ay, bx, by, cx, cy, m, on) => {
    const sgn = (px, py, x1, y1, x2, y2) => (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
    for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) {
      const px = x + 0.5, py = y + 0.5;
      const d1 = sgn(px, py, ax, ay, bx, by), d2 = sgn(px, py, bx, by, cx, cy), d3 = sgn(px, py, cx, cy, ax, ay);
      if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) put(x, y, m, on);
    }
  };
  const rect = (x0, y0, x1, y1, m, on) => {
    for (let y = Math.round(y0); y <= Math.round(y1); y++) for (let x = Math.round(x0); x <= Math.round(x1); x++) put(x, y, m, on);
  };

  // --- Proporciones (se reducen si no caben) ---
  const ghost = has('Fantasma');
  const oneBlob = R() < 0.3;
  const legs = ghost ? 0 : 2 + R() * 3;
  const bodyRx0 = 5.5 + R() * 3, bodyRy0 = 5 + R() * 2.5, headR0 = 4.4 + R() * 1.8;
  const bigEyes = R() < 0.55;
  let k = 0.82 + stage * 0.17, dims;
  for (;;) {
    const legLen = Math.round(legs * k), bodyRx = bodyRx0 * k, bodyRy = bodyRy0 * k;
    const bodyCy = 29.5 - legLen - bodyRy;
    const hr = oneBlob ? 0 : headR0 * k;
    const headCy = oneBlob ? bodyCy - bodyRy * 0.25 : bodyCy - bodyRy * 0.7 - hr * 0.45;
    const top = oneBlob ? bodyCy - bodyRy : headCy - hr;
    dims = { legLen, bodyRx, bodyRy, bodyCy, hr, headCy, top };
    if (top >= 7 || k < 0.5) break;
    k -= 0.04;
  }
  const { legLen, bodyRx, bodyRy, bodyCy, hr, headCy, top } = dims;
  // Zona donde van ojos y adornos (cabeza o parte alta del cuerpo).
  const fx = oneBlob ? bodyRx * 0.9 : hr, fy = oneBlob ? bodyCy - bodyRy * 0.35 : headCy;

  // Detrás: alas.
  if (has('Volador') || (has('Dragón') && stage > 0) || has('Hada') || has('Bicho') && X() < 0.5) {
    const big = has('Volador') || has('Dragón');
    const wy = bodyCy - bodyRy * 0.3;
    tri(CX - bodyRx * 0.3, wy, CX - bodyRx - (big ? 7 : 4) * k, wy - (big ? 7 : 5) * k, CX - bodyRx - (big ? 3 : 2) * k, wy + bodyRy * 0.6, 'wing');
  }
  // Patas con pies.
  if (legLen > 0) {
    const lx = CX - bodyRx * 0.5;
    rect(lx - 1.2 * k, bodyCy + bodyRy * 0.5, lx + 1.2 * k, 29.5, 'body');
    ellipse(lx - 0.5, 29.2, 2.2 * k, 1.2, 'body');
  }
  // Cuerpo, barriga y brazos.
  ellipse(CX, bodyCy, bodyRx, bodyRy, 'body');
  if (ghost) { // borde inferior ondulado
    for (let y = Math.round(bodyCy + bodyRy * 0.55); y < PX; y++) for (let x = 0; x < CX; x++) if ((x + y) % 4 < 2) g[y][x] = 0;
  }
  ellipse(CX, bodyCy + bodyRy * 0.25, bodyRx * 0.58, bodyRy * 0.6, 'belly', ['body']);
  const armR = (has('Lucha') ? 2.8 : 1.7) * k;
  ellipse(CX - bodyRx * 0.95, bodyCy + bodyRy * 0.1, armR, armR * 1.2, 'body');
  if (has('Lucha')) ellipse(CX - bodyRx * 1.05, bodyCy + bodyRy * 0.35, armR * 0.8, armR * 0.8, 'acc');
  // Cabeza.
  if (!oneBlob) ellipse(CX, headCy, hr * 1.08, hr, 'body');

  // Adornos según tipo (1.º y 2.º tipo).
  const deco = t => {
    const ty = fy - (oneBlob ? bodyRy * 0.6 : hr * 0.75);
    switch (t) {
      case 'Normal': case 'Siniestro': case 'Eléctrico': // orejas
        tri(CX - fx * 0.95, ty + 1.5, CX - fx * 0.3, ty, CX - fx * 0.9, ty - 5 * k, 'body');
        tri(CX - fx * 0.82, ty + 0.8, CX - fx * 0.5, ty + 0.2, CX - fx * 0.85, ty - 3.2 * k, t === 'Eléctrico' ? 'acc2' : 'belly');
        break;
      case 'Dragón': case 'Tierra': case 'Roca': case 'Acero': // cuernos
        tri(CX - fx * 0.55, ty + 1.5, CX - fx * 0.2, ty + 1.2, CX - fx * 0.7, ty - 4.5 * k, t === 'Acero' ? 'metal' : 'horn');
        break;
      case 'Planta': // hoja con tallo
        rect(CX - 0.5, ty - 1.5 * k, CX - 0.5, ty + 0.5, 'stem');
        ellipse(CX - 2.2 * k, ty - 2.5 * k, 2.4 * k, 1.4 * k, 'leaf');
        if (stage > 1) ellipse(CX, ty - 4 * k, 1.8 * k, 1.8 * k, 'petal');
        break;
      case 'Fuego': // llama
        tri(CX - 2.8 * k, ty + 1.5, CX + 2.8 * k, ty + 1.5, CX - 0.5, ty - (5 + stage) * k, 'flame');
        tri(CX - 1.4 * k, ty + 1.5, CX + 1.4 * k, ty + 1.5, CX - 0.2, ty - 2.5 * k, 'flame2');
        break;
      case 'Agua': // aleta en la cabeza y a los lados
        tri(CX - 1.4, ty + 1.5, CX + 1.4, ty + 1.5, CX, ty - 4 * k, 'acc');
        tri(CX - fx * 0.95, fy, CX - fx * 0.95, fy + 2.5 * k, CX - fx - 3 * k, fy - 1.5 * k, 'acc');
        break;
      case 'Hielo': // cristales
        tri(CX - 2.2, ty + 1.5, CX - 0.2, ty + 1.5, CX - 1.5, ty - 4.5 * k, 'ice');
        tri(CX - fx * 0.7, ty + 2, CX - fx * 0.3, ty + 1.5, CX - fx * 0.75, ty - 2.5 * k, 'ice');
        break;
      case 'Bicho': { // antenas
        const ax = CX - fx * 0.35, tx = CX - fx * 0.85, tyy = ty - 4.5 * k;
        for (let i = 0; i <= 6; i++) put(Math.floor(ax + (tx - ax) * i / 6), Math.floor(ty + 1 + (tyy - ty - 1) * i / 6), 'acc2');
        ellipse(tx, tyy, 1.2, 1.2, 'acc');
        break;
      }
      case 'Fantasma': // pico de pelo
        tri(CX - fx * 0.6, ty + 1.5, CX + 0.5, ty + 1, CX - fx * 0.2, ty - 3.5 * k, 'body');
        break;
      case 'Psíquico': // gema en la frente
        rect(CX - 1, fy - fx * 0.62, CX, fy - fx * 0.45, 'gem');
        break;
      case 'Hada': // lazo
        ellipse(CX - 2 * k, ty, 2 * k, 1.4 * k, 'petal');
        break;
      case 'Veneno': // manchas
        for (let i = 0; i < 4; i++) ellipse(CX - 1 - X() * bodyRx * 0.9, bodyCy - bodyRy * 0.5 + X() * bodyRy * 0.8, 1, 1, 'acc', ['body']);
        break;
      case 'Lucha': // cinta
        rect(CX - fx - 1, fy - fx * 0.55, CX, fy - fx * 0.4, 'band', ['body']);
        break;
      case 'Volador': // cresta
        tri(CX - 1, ty + 1.5, CX + 1, ty + 1.5, CX - 2.5 * k, ty - 4 * k, 'acc');
        break;
    }
  };
  deco(types[0]);
  if (types[1] && types[1] !== types[0]) deco(types[1]);
  // Rayas para Eléctrico y Siniestro.
  if (has('Eléctrico') || has('Siniestro')) {
    for (const yy of [bodyCy - bodyRy * 0.45, bodyCy - bodyRy * 0.05]) rect(CX - bodyRx, yy, CX - bodyRx * 0.55, yy + 0.4, 'acc2', ['body']);
  }

  // Ojos, boca y colmillos.
  const ey = Math.round(fy - fx * 0.1), ex = Math.round(CX - fx * 0.48);
  const evil = has('Siniestro') || has('Fantasma');
  const eh = bigEyes ? 2 : 1;
  rect(ex - 1, ey - eh + 1, ex, ey + 1, evil ? 'eyeR' : 'pupil');
  put(ex - 1, ey - eh + 1, 'shine');
  if (evil || has('Dragón')) rect(ex - 1, ey - eh, ex + 1, ey - eh, 'mouth'); // ceja enfadada
  const my = ey + 2 + (bigEyes ? 1 : 0);
  rect(CX - 1, my, CX - 1, my, 'mouth');
  if (has('Siniestro') || has('Dragón') || X() < 0.25) put(CX - 2, my + 1, 'fang');

  // Simetría: copia la mitad izquierda en la derecha.
  for (let y = 0; y < PX; y++) for (let x = 0; x < CX; x++) g[y][PX - 1 - x] = g[y][x];

  // --- Colores ---
  const c1 = TYPE_COLOR[types[0]], c2 = TYPE_COLOR[types[1] || types[0]], dual = types.length > 1;
  const PAL = {
    body: c1,
    belly: dual && X() < 0.5 ? shade(c2, 0.35) : shade(c1, 0.5),
    acc: dual ? c2 : shade(c1, -0.35),
    acc2: shade(c1, -0.6),
    wing: dual ? shade(c2, 0.15) : shade(c1, 0.3),
    horn: '#efe6d2', metal: '#cbd5e1', stem: '#2f7d3a', leaf: '#46c45f', petal: '#f9a8d4',
    flame: '#f97316', flame2: '#fde047', ice: '#bae6fd', gem: '#ef4444', band: '#dc2626',
    pupil: '#111827', shine: '#ffffff', mouth: '#3b0d0d', fang: '#ffffff', eyeR: '#dc2626'
  };
  const at = (x, y) => (y >= 0 && y < PX && x >= 0 && x < PX ? g[y][x] : 0);
  const out = Array.from({ length: PX }, () => Array(PX).fill(null));
  for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) {
    const m = g[y][x];
    if (m) {
      const base = PAL[m];
      if (FLAT.has(m)) { out[y][x] = base; continue; }
      // Luz desde arriba a la izquierda, sombra abajo a la derecha, sombra suave bajo otra parte.
      let amt = 0;
      if (!at(x, y - 1) || !at(x - 1, y)) amt = 0.25;
      else if (!at(x, y + 1) || !at(x + 1, y) || !at(x + 1, y + 1)) amt = -0.28;
      else if (at(x, y - 1) !== m && !FLAT.has(at(x, y - 1))) amt = -0.14;
      else if (y > bodyCy + bodyRy * 0.3) amt = -0.08;
      out[y][x] = amt ? shade(base, amt) : base;
    } else {
      // Contorno: tono muy oscuro del vecino.
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => at(x + a, y + b)).find(v => v && !FLAT.has(v));
      if (n) out[y][x] = shade(PAL[n], -0.72);
    }
  }
  return out;
}

const SPRITES = new Map();
function spriteUrl(id) {
  if (!SPRITES.has(id)) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = PX;
    const ctx = cv.getContext('2d');
    pixelGrid(id).forEach((row, y) => row.forEach((col, x) => {
      if (col) { ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1); }
    }));
    SPRITES.set(id, cv.toDataURL());
  }
  return SPRITES.get(id);
}
const spriteHtml = (id, cls = 'sprite') => `<img class="${cls}" src="${spriteUrl(id)}" alt="" aria-hidden="true">`;
const ico = id => spriteHtml(id, 'ico');

function monCard(m, mine) {
  if (!m) return '';
  const s = SPECIES[m.id];
  const pct = Math.round(m.hp / m.maxhp * 100);
  const cls = pct > 50 ? 'ok' : pct > 20 ? 'mid' : 'low';
  const span = (m.lvl + 1) ** 3 - m.lvl ** 3;
  const xpPct = m.lvl >= 100 ? 100 : Math.round((m.xp - m.lvl ** 3) / span * 100);
  const stages = stagesText(m);
  return `
    <div class="info">
      <div class="row"><strong>${s.name}</strong><span>Nv. ${m.lvl}</span></div>
      <div class="row"><span>${badges(s)} ${condBadge(m.cond)}</span>${m.boss ? '<span class="boss">JEFE</span>' : ''}</div>
      <div class="bar" role="progressbar" aria-label="PS de ${s.name}" aria-valuemin="0" aria-valuemax="${m.maxhp}" aria-valuenow="${m.hp}"><i class="${cls}" style="width:${pct}%"></i></div>
      ${mine ? `<div class="row small"><span>PS ${m.hp}/${m.maxhp}</span></div><div class="bar xp"><i style="width:${xpPct}%"></i></div>` : ''}
      ${stages ? `<div class="small">${stages}</div>` : ''}
    </div>
    ${spriteHtml(m.id)}`;
}

function renderBattle() {
  app.innerHTML = `
    <header class="hud">
      <span id="wave"></span>
      <div class="party" id="party"></div>
    </header>
    <section class="field" id="field">
      <div class="mon enemy" id="enemy"></div>
      <div class="mon player" id="player"></div>
    </section>
    <div class="log" id="log" aria-live="polite"></div>
    <div class="menu" id="menu"></div>`;
}

function updateCards() {
  if (!$('#field')) return;
  $('#wave').textContent = `Oleada ${S.wave} · Récord ${getBest()}`;
  $('#party').innerHTML = S.team.map((m, i) =>
    `<span class="pm ${i === S.active ? 'act' : ''} ${m.hp <= 0 ? 'ko' : ''}" title="${nm(m)} Nv. ${m.lvl} (${m.hp}/${m.maxhp})">${ico(m.id)}<i style="width:${m.hp / m.maxhp * 100}%"></i></span>`
  ).join('');
  $('#enemy').innerHTML = monCard(S.enemy, false);
  $('#player').innerHTML = monCard(cur(), true);
}

// Muestra botones. items: [{label, sub, color, disabled, fn}]
function menu(title, items, back) {
  const box = $('#menu');
  box.innerHTML = '';
  const h = document.createElement('p');
  h.className = 'menu-title';
  h.textContent = title;
  const grid = document.createElement('div');
  grid.className = 'grid';
  const all = back ? [...items, { label: '↩️ Atrás', fn: back }] : items;
  for (const it of all) {
    const b = document.createElement('button');
    b.className = 'btn';
    b.innerHTML = `${it.label}${it.sub ? `<small>${it.sub}</small>` : ''}`;
    if (it.color) b.style.setProperty('--c', it.color);
    b.disabled = !!it.disabled;
    b.addEventListener('click', it.fn);
    grid.append(b);
  }
  box.append(h, grid);
  grid.querySelector('button:not(:disabled)')?.focus();
}

function choose(title, items, cancel) {
  return new Promise(res => {
    menu(title, items.map((it, i) => ({ ...it, fn: () => res(i) })), cancel ? () => res(-1) : null);
  });
}

const monOption = m => ({
  label: `${ico(m.id)} ${nm(m)} Nv. ${m.lvl}`,
  sub: `${SPECIES[m.id].types.join('/')} · PS ${m.hp}/${m.maxhp}${m.cond ? ' · ' + COND[m.cond].tag : ''}`
});

// Usa un objeto curativo SIN gastar turno. Si hay varios posibles, pregunta en quién.
async function quickItem(key) {
  const targets = itemTargets(key);
  if (!targets.length) return showMenu();
  let t = targets.includes(cur()) ? cur() : targets.length === 1 ? targets[0] : null;
  if (!t) {
    const i = await choose(`¿En quién usas ${ITEMS[key].name}?`, targets.map(monOption), true);
    if (i < 0) return showMenu();
    t = targets[i];
  }
  $('#menu').innerHTML = '';
  await useItem(key, t);
  save();
  showMenu();
}

function showMenu() {
  // Objetos que se pueden usar ahora mismo, a un clic (no gastan turno).
  const quick = Object.keys(S.bag)
    .filter(k => S.bag[k] > 0 && !BALLS.includes(k) && itemTargets(k).length)
    .map(k => ({ label: `${ITEMS[k].icon} ${ITEMS[k].name} x${S.bag[k]}`, sub: `${ITEMS[k].desc} · no gasta turno`, color: '#22c55e', fn: () => quickItem(k) }));
  menu(`¿Qué hará ${nm(cur())}?`, [
    { label: '⚔️ Luchar', fn: showMoves },
    { label: '🎒 Mochila', sub: 'Bolas y todos los objetos', fn: showBag },
    { label: '🔁 Equipo', fn: showTeam },
    { label: '🏳️ Rendirse', sub: 'Termina y cobra monedas', fn: surrender },
    ...quick
  ]);
}

async function surrender() {
  const i = await choose('¿Seguro que quieres rendirte?', [{ label: 'Sí, rendirme' }], true);
  if (i === 0) gameOver(true); else showMenu();
}

function moveSub(mv) {
  if (mv.cat === 'S') {
    const f = mv.eff;
    const what = f.heal ? 'Cura 50%' : f.cond ? `Pone ${COND[f.cond].tag}`
      : `${f.target === 'self' ? 'Tu' : 'Rival'} ${STAT_SHORT[f.stat]} ${f.n > 0 ? '+' : ''}${f.n}`;
    return `${mv.type} · Estado · ${what}`;
  }
  const e = effOn(mv.type, SPECIES[S.enemy.id]);
  const hint = e === 0 ? ' · No afecta' : e > 1 ? ' · ¡Eficaz!' : e < 1 ? ' · Poco eficaz' : '';
  return `${mv.type} · ${CAT_NAME[mv.cat]} · Pot ${mv.power} · Prec ${mv.acc}${hint}`;
}

function showMoves() {
  menu('Elige un ataque', cur().moves.map(mv => ({
    label: mv.name,
    sub: moveSub(mv),
    color: TYPE_COLOR[mv.type],
    fn: () => doTurn({ kind: 'move', move: mv })
  })), showMenu);
}

function itemTargets(key) {
  if (key === 'pocion' || key === 'superpocion') return S.team.filter(m => m.hp > 0 && m.hp < m.maxhp);
  if (key === 'cura') return S.team.filter(m => m.hp > 0 && m.cond);
  if (key === 'revivir') return S.team.filter(m => m.hp <= 0);
  if (key === 'caramelo') return S.team.filter(m => m.hp > 0 && m.lvl < 100);
  return [];
}

function showBag() {
  const keys = Object.keys(S.bag).filter(k => S.bag[k] > 0);
  if (!keys.length) return menu('La mochila está vacía.', [], showMenu);
  menu('Mochila', keys.map(k => {
    const isBall = BALLS.includes(k);
    const targets = isBall ? null : itemTargets(k);
    return {
      label: `${ITEMS[k].icon} ${ITEMS[k].name} x${S.bag[k]}`,
      sub: isBall ? `${ITEMS[k].desc} · gasta turno` : `${ITEMS[k].desc} · no gasta turno`,
      disabled: !isBall && !targets.length,
      fn: () => (isBall ? doTurn({ kind: 'ball', key: k }) : quickItem(k))
    };
  }), showMenu);
}

function showTeam() {
  menu('Cambiar criatura (gasta el turno)', S.team.map((m, i) => ({
    ...monOption(m),
    disabled: i === S.active || m.hp <= 0,
    fn: () => doTurn({ kind: 'switch', idx: i })
  })), showMenu);
}

/* ---------- Pantallas fuera de combate ---------- */
const coinsHtml = () => `<span class="coins">🪙 ${M.coins}</span>`;

function statTable(b, iv) {
  return `<table class="stats">
    <tr><th></th><th>Base</th><th>IV</th></tr>
    ${STATS.map((k, i) => `<tr><th>${STAT_NAME[k]}</th><td>${b[i]}</td><td><span class="ivbar"><i style="width:${iv[i] / 31 * 100}%"></i></span>${iv[i]}</td></tr>`).join('')}
  </table>`;
}

function entryCard(e, extra = '') {
  const s = SPECIES[e.id], R = RARITY[s.r], g = grade(e.iv);
  return `<div class="card" style="--c:${R.color}">
    <div class="card-top">
      ${spriteHtml(e.id, 'emo')}
      <div><strong>#${e.id} ${s.name}</strong><div class="rar" style="color:${R.color}">${'★'.repeat(s.r)} ${R.name}</div>
      <div>${badges(s)} <span class="grade g${g}" title="Calidad de IV">${g}</span></div></div>
    </div>
    ${statTable(s.b, e.iv)}
    ${extra}
  </div>`;
}

const ivSum = e => e.iv.reduce((x, y) => x + y, 0);
const sortedCollection = () => [...M.collection].sort((a, b) =>
  SPECIES[b.id].r - SPECIES[a.id].r || Number(a.id) - Number(b.id) || ivSum(b) - ivSum(a));
const collectable = () => Object.keys(SPECIES).filter(k => SPECIES[k].base || SPECIES[k].boss);

function titleScreen() {
  const saved = localStorage.getItem(SAVE_KEY);
  const species = new Set(M.collection.map(e => e.id)).size;
  app.innerHTML = `
    <h1>🐾 Criaturas Rogue</h1>
    <p class="center">Vence oleadas, captura criaturas y llega lo más lejos posible.</p>
    <p class="center">Récord: oleada ${getBest()} · ${coinsHtml()} · Colección ${species}/${collectable().length}</p>
    <button class="btn big" id="new">Nueva partida</button>
    ${saved ? '<button class="btn big" id="cont">Continuar</button>' : ''}
    <button class="btn big" id="shop">🛒 Tienda y gacha</button>
    <button class="btn big" id="col">📖 Colección</button>
    <p class="center small">Datos: <a href="https://pokeapi.co" target="_blank" rel="noopener">PokeAPI</a></p>`;
  $('#new').addEventListener('click', starterScreen);
  $('#shop').addEventListener('click', () => shopScreen());
  $('#col').addEventListener('click', collectionScreen);
  if (saved) $('#cont').addEventListener('click', () => { S = JSON.parse(saved); renderBattle(); startWave(); });
  $('#new').focus();
}

function starterScreen() {
  app.innerHTML = `
    <div class="topbar"><button class="btn" id="back">↩️ Atrás</button><h2>Elige tu compañero</h2><span></span></div>
    <div class="cards" id="list"></div>`;
  $('#back').addEventListener('click', titleScreen);
  for (const e of sortedCollection()) {
    const wrap = document.createElement('div');
    wrap.innerHTML = entryCard(e, `<button class="btn full">Elegir</button>`);
    wrap.querySelector('button').addEventListener('click', () => startRun(e));
    $('#list').append(wrap.firstElementChild);
  }
}

function startRun(entry) {
  const bag = EMPTY_BAG();
  bag.pocion = 3;
  bag.ball = 5;
  for (const [k, n] of Object.entries(M.startBag)) bag[k] += n;
  M.startBag = {};
  saveMeta();
  S = { wave: 1, active: 0, enemy: null, kills: 0, bosses: 0, caught: 0, team: [makeMon(entry.id, 5, [...entry.iv])], bag };
  localStorage.removeItem(SAVE_KEY);
  renderBattle();
  startWave();
}

function shopScreen(results) {
  const bagList = Object.entries(M.startBag).filter(([, n]) => n > 0)
    .map(([k, n]) => `${ITEMS[k].icon} ${ITEMS[k].name} x${n}`).join(' · ') || 'Nada todavía';
  app.innerHTML = `
    <div class="topbar"><button class="btn" id="back">↩️ Atrás</button><h2>Tienda</h2>${coinsHtml()}</div>
    <section class="panel">
      <h3>🎰 Gacha de criaturas</h3>
      <p class="small">Común 60% · Raro 28% · Épico 10% · Legendario 2%. Cada criatura sale con IV al azar (las raras, más altos).</p>
      <div class="grid">
        <button class="btn" id="p1" ${M.coins < PULL_COST ? 'disabled' : ''}>Tirar x1<small>🪙 ${PULL_COST}</small></button>
        <button class="btn" id="p10" ${M.coins < PULL10_COST ? 'disabled' : ''}>Tirar x10<small>🪙 ${PULL10_COST}</small></button>
      </div>
      <div class="cards" id="results"></div>
    </section>
    <section class="panel">
      <h3>🎒 Objetos para tu próxima partida</h3>
      <p class="small">Guardados: ${bagList}</p>
      <div class="grid" id="items"></div>
    </section>`;
  $('#back').addEventListener('click', titleScreen);
  $('#p1').addEventListener('click', () => doPull(1));
  $('#p10').addEventListener('click', () => doPull(10));
  for (const [k, price] of SHOP) {
    const b = document.createElement('button');
    b.className = 'btn';
    b.disabled = M.coins < price;
    b.innerHTML = `${ITEMS[k].icon} ${ITEMS[k].name}<small>${ITEMS[k].desc} · 🪙 ${price}</small>`;
    b.addEventListener('click', () => {
      if (M.coins < price) return;
      M.coins -= price;
      M.startBag[k] = (M.startBag[k] || 0) + 1;
      saveMeta();
      shopScreen(results);
    });
    $('#items').append(b);
  }
  if (results) {
    $('#results').innerHTML = results.map(({ entry, isNew }) =>
      entryCard(entry, isNew ? '<div class="new">¡NUEVA!</div>' : '')).join('');
  }
}

function doPull(n) {
  const cost = n === 10 ? PULL10_COST : PULL_COST;
  if (M.coins < cost) return;
  M.coins -= cost;
  const results = Array.from({ length: n }, pull);
  saveMeta();
  shopScreen(results);
}

function collectionScreen() {
  const species = new Set(M.collection.map(e => e.id));
  app.innerHTML = `
    <div class="topbar"><button class="btn" id="back">↩️ Atrás</button><h2>Colección (${M.collection.length})</h2>${coinsHtml()}</div>
    <p class="small">Especies conseguidas: ${species.size}/${collectable().length}</p>
    <div class="cards" id="list"></div>`;
  $('#back').addEventListener('click', titleScreen);
  for (const e of sortedCollection()) {
    const R = RARITY[SPECIES[e.id].r];
    const wrap = document.createElement('div');
    wrap.innerHTML = entryCard(e, `<button class="btn full" ${M.collection.length <= 1 ? 'disabled' : ''}>Liberar (+🪙 ${R.sell})</button>`);
    wrap.querySelector('button').addEventListener('click', () => {
      if (M.collection.length <= 1) return;
      if (!confirm(`¿Liberar a ${SPECIES[e.id].name}? No se puede deshacer.`)) return;
      M.collection = M.collection.filter(x => x.uid !== e.uid);
      M.coins += R.sell;
      saveMeta();
      collectionScreen();
    });
    $('#list').append(wrap.firstElementChild);
  }
}

async function gameOver(surrendered = false) {
  await say(surrendered ? 'Te has rendido.' : 'Todo tu equipo se debilitó…', 1200);
  localStorage.removeItem(SAVE_KEY);
  const parts = [
    ['Criaturas vencidas', S.kills, COIN.kill],
    ['Jefes derrotados', S.bosses, COIN.boss],
    ['Capturas', S.caught, COIN.catch],
    ['Oleada alcanzada', S.wave, COIN.wave]
  ];
  const earned = parts.reduce((s, [, n, c]) => s + n * c, 0);
  M.coins += earned;
  saveMeta();
  app.innerHTML = `
    <h1>Fin de la partida</h1>
    <p class="center">Llegaste a la oleada ${S.wave}. Récord: ${getBest()}.</p>
    <p class="center">${S.team.map(m => `${spriteHtml(m.id, 'emo')} ${nm(m)}`).join(' ')}</p>
    <table class="stats summary">
      ${parts.map(([t, n, c]) => `<tr><th>${t}</th><td>${n} × ${c}</td><td>🪙 ${n * c}</td></tr>`).join('')}
      <tr><th>Total</th><td></td><td><strong>🪙 ${earned}</strong></td></tr>
    </table>
    <p class="center">Ahora tienes ${coinsHtml()}</p>
    <button class="btn big" id="shop">🛒 Ir a la tienda</button>
    <button class="btn big" id="again">Volver al inicio</button>`;
  $('#again').addEventListener('click', titleScreen);
  $('#shop').addEventListener('click', () => shopScreen());
  $('#shop').focus();
}

/* ---------- Arranque ---------- */
async function boot() {
  app.innerHTML = `<h1>🐾 Criaturas Rogue</h1><p class="center" id="prog">Cargando datos de PokeAPI…</p>`;
  try {
    const dex = await loadDex((d, t) => { $('#prog').textContent = `Cargando datos de PokeAPI… ${d}/${t}`; });
    buildSpecies(dex);
    M = loadMeta();
    saveMeta();
    titleScreen();
  } catch (err) {
    console.error(err);
    app.innerHTML = `<h1>Sin conexión</h1>
      <p class="center">No pude leer PokeAPI. Revisa tu internet y vuelve a intentarlo.</p>
      <button class="btn big" id="retry">Reintentar</button>`;
    $('#retry').addEventListener('click', boot);
  }
}
boot();
