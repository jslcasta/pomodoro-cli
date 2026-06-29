#!/usr/bin/env node

const readline = require('readline');
const fs = require('fs');
const path = require('path');

// ── Colores ANSI ──────────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold:  '\x1b[1m',
  red:   '\x1b[31m',
  green: '\x1b[32m',
  yellow:'\x1b[33m',
  cyan:  '\x1b[36m',
  gray:  '\x1b[90m',
};

// ── Config ────────────────────────────────────────────────────────────────────
const WORK_MIN  = 55;
const SHORT_MIN = 5;
const LONG_MIN  = 15;
const LOG_FILE  = path.join(__dirname, 'sessions.json');

// ── Estado ────────────────────────────────────────────────────────────────────
let pomosHoy = 0;
let timer     = null;
let secondsLeft = 0;
let phase = 'idle'; // 'work' | 'short' | 'long' | 'idle'
let taskName = '';

// ── Log de sesiones ───────────────────────────────────────────────────────────
function loadLog() {
  if (!fs.existsSync(LOG_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); } catch { return []; }
}

function saveSession(task, minutes) {
  const log = loadLog();
  log.push({ date: new Date().toISOString(), task, minutes });
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

// Devuelve las sesiones registradas hoy (a partir del log persistido).
function sesionesDeHoy(log = loadLog()) {
  const today = new Date().toDateString();
  return log.filter(s => new Date(s.date).toDateString() === today);
}

// Cuenta cuántos pomodoros se han completado hoy según sessions.json.
function contarPomodorosHoy() {
  return sesionesDeHoy().length;
}

function showHistory() {
  const log = loadLog();
  if (log.length === 0) {
    console.log(c.gray + '  Sin sesiones registradas aún.' + c.reset);
    return;
  }
  const todaySessions = sesionesDeHoy(log);
  const totalMin = todaySessions.reduce((a, s) => a + s.minutes, 0);

  console.log(c.bold + c.cyan + '\n  📊 Sesiones de hoy:' + c.reset);
  todaySessions.forEach(s => {
    const hora = new Date(s.date).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    console.log(`  ${c.gray}${hora}${c.reset}  ${s.task}  ${c.yellow}(${s.minutes} min)${c.reset}`);
  });
  console.log(c.bold + `\n  Total: ${totalMin} min trabajados hoy (${todaySessions.length} pomodoros)` + c.reset);
}

// ── Render del temporizador ───────────────────────────────────────────────────
function renderTimer() {
  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');

  const phaseLabel = {
    work:  c.red   + '🍅 TRABAJO',
    short: c.green + '☕ DESCANSO CORTO',
    long:  c.cyan  + '🌿 DESCANSO LARGO',
  }[phase];

  const bar = buildBar(secondsLeft, phaseDuration() * 60);

  process.stdout.write(
    `\r  ${phaseLabel}${c.reset}  ${c.bold}${mins}:${secs}${c.reset}  ${bar}  ${c.gray}[q] salir${c.reset}  `
  );
}

function buildBar(remaining, total) {
  const filled = Math.round(((total - remaining) / total) * 20);
  return c.green + '█'.repeat(filled) + c.gray + '░'.repeat(20 - filled) + c.reset;
}

function phaseDuration() {
  if (phase === 'work')  return WORK_MIN;
  if (phase === 'short') return SHORT_MIN;
  return LONG_MIN;
}

// ── Sonido (beep ASCII) ───────────────────────────────────────────────────────
function beep(n = 1) {
  for (let i = 0; i < n; i++) process.stdout.write('\x07');
}

// ── Lógica del temporizador ───────────────────────────────────────────────────
function startPhase(p) {
  phase = p;
  secondsLeft = phaseDuration() * 60;
  clearInterval(timer);
  renderTimer();
  timer = setInterval(() => {
    secondsLeft--;
    renderTimer();
    if (secondsLeft <= 0) onPhaseEnd();
  }, 1000);
}

function onPhaseEnd() {
  clearInterval(timer);
  if (phase === 'work') {
    pomosHoy++;
    saveSession(taskName, WORK_MIN);
    beep(2);
    process.stdout.write('\n');
    console.log(c.bold + c.green + `\n  ✅ ¡Pomodoro #${pomosHoy} completado! Tarea: "${taskName}"` + c.reset);
    const descanso = pomosHoy % 4 === 0 ? 'long' : 'short';
    const mins = descanso === 'long' ? LONG_MIN : SHORT_MIN;
    console.log(c.yellow + `  Iniciando descanso ${descanso === 'long' ? 'largo' : 'corto'} (${mins} min)…` + c.reset + '\n');
    setTimeout(() => startPhase(descanso), 1500);
  } else {
    beep(1);
    process.stdout.write('\n');
    console.log(c.bold + c.cyan + '\n  ☀️  ¡Descanso terminado! Iniciando nuevo pomodoro…' + c.reset + '\n');
    setTimeout(() => startPhase('work'), 1500);
  }
}

function stopTimer() {
  clearInterval(timer);
  phase = 'idle';
}

// ── Menú principal ────────────────────────────────────────────────────────────
function showMenu() {
  console.log(c.bold + c.cyan + '\n  🍅 Pomodoro CLI\n' + c.reset);
  console.log('  [1] Iniciar pomodoro');
  console.log('  [2] Ver historial de hoy');
  console.log('  [3] Salir\n');
}

// Valida/normaliza el nombre de tarea: recorta espacios y, si queda vacío,
// devuelve un nombre por defecto. Devuelve siempre un string no vacío.
function validarTarea(input) {
  return (input == null ? '' : String(input)).trim() || 'Sin nombre';
}

function askTask(rl, cb) {
  rl.question(c.yellow + '  ¿En qué vas a trabajar? ' + c.reset, answer => {
    cb(validarTarea(answer));
  });
}

// ── Entrada de teclado durante temporizador ───────────────────────────────────
function listenKeys(rl) {
  rl.on('line', () => {}); // absorber Enter
  process.stdin.on('data', (data) => {
    if (data.toString().trim().toLowerCase() === 'q' && phase !== 'idle') {
      stopTimer();
      process.stdout.write('\n');
      console.log(c.gray + '\n  Temporizador detenido.' + c.reset);
      setTimeout(() => main(), 500);
    }
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main() {
  showMenu();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  rl.question('  Opción: ', (opt) => {
    if (opt === '1') {
      askTask(rl, (task) => {
        taskName = task;
        rl.close();
        console.log(c.gray + `\n  Iniciando ${WORK_MIN} minutos para: "${taskName}"\n` + c.reset);
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        listenKeys(readline.createInterface({ input: process.stdin }));
        startPhase('work');
      });
    } else if (opt === '2') {
      rl.close();
      showHistory();
      setTimeout(() => main(), 500);
    } else if (opt === '3') {
      rl.close();
      console.log(c.gray + '\n  ¡Hasta luego! 🍅\n' + c.reset);
      process.exit(0);
    } else {
      rl.close();
      main();
    }
  });
}

// Solo arranca la app si se ejecuta directamente (no al importarla en tests).
if (require.main === module) {
  pomosHoy = contarPomodorosHoy(); // continúa la cuenta de hoy entre reinicios
  main();
}

module.exports = { validarTarea, sesionesDeHoy, contarPomodorosHoy };
