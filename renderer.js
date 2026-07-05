// renderer.js — Mini Me's brain. Runs entirely in the renderer process.
// Talks to the main process only through the safe window.petAPI bridge.
//
// IMPORTANT: the Electron *window* itself is small (just her + her
// bubble) and WE move that window across the screen to make her walk,
// drag, and fall. Everything drawn inside the window (pet, bubble,
// focus bar) sits at a fixed spot via CSS — only the window's on-screen
// x/y changes.

// ======================================================================
// 1. CUSTOMIZATION — tweak these to make the pet yours
// ======================================================================

const CONFIG = {
  // Character scale (assets are square, so this sets both width & height)
  characterHeight: 150,

  // Movement
  walkSpeed: 60,        // pixels per second while walking

  // How often (ms) the pet says something on its own while walking/on break.
  // Changeable at runtime via the right-click menu ("Speech Frequency").
  messageFrequencyMs: 30000, // 30s default
  bubbleShowDurationMs: 4000,

  // Focus / break / sleep timing (minutes)
  focusMinutes: 25,
  breakMinutes: 5,
  sleepIntervalMinutes: 3,   // nap every N minutes of walking/idle time
  sleepDurationMinutes: 1,

  // If the pet gets zero interaction (click / drag / feed) for this long
  // while walking, she'll get a little lonely.
  lonelyAfterMs: 4 * 60 * 1000,

  // Animation timing
  walkFrameMs: 260,      // how fast walk-1/walk-2 alternate
};

// Cozy, mindful things the pet says. Add your own — keep the quotes
// and a comma at the end of each line!
const COZY_MESSAGES = [
  "breathe in... hold it... breathe out... ☕",
  "take a sip of your tea or coffee.",
  "you are coding poetry today.",
  "a tiny step forward is still progress.",
  "relax your shoulders, you're doing great.",
  "drink some water, friend!",
  "you've got this. one line at a time.",
  // Add your own custom phrases in quotes here!
];

const BREAK_MESSAGES = [
  "yay, break time! stretch it out~",
  "look away from the screen for a sec 👀",
  "you earned this little pause.",
];

const FOCUS_START_MESSAGES = [
  "okay, focus time! I'll be quiet. 🎯",
  "let's get in the zone together.",
];

const FOCUS_END_MESSAGES = [
  "focus session complete! amazing work 🎉",
  "you did it! time for a breather.",
];

const LONELY_MESSAGES = [
  "...i missed you. click me? 🥺",
  "hellooo? still there?",
];

const FEED_MESSAGES = [
  "yum, thank you! 💕",
  "my favorite! nom nom",
];

// ======================================================================
// 2. SCREEN / WINDOW GEOMETRY (read synchronously from the query string
//    main.js gave us — no async IPC needed just to know where the floor is)
// ======================================================================

const params = new URLSearchParams(window.location.search);
const SCREEN_W = parseInt(params.get('screenWidth'), 10) || window.screen.width;
const SCREEN_H = parseInt(params.get('screenHeight'), 10) || window.screen.height;
const WIN_W = parseInt(params.get('winWidth'), 10) || 240;
const WIN_H = parseInt(params.get('winHeight'), 10) || 270;

const FLOOR_Y = SCREEN_H - WIN_H;
const MAX_WIN_X = SCREEN_W - WIN_W;

// ======================================================================
// 3. STATE
// ======================================================================

const STATES = Object.freeze({
  GREETING: 'greeting',
  WALKING: 'walking',
  IDLE: 'idle',
  FOCUS: 'focus',
  BREAK: 'break',
  SLEEP: 'sleep',
  DRAGGING: 'dragging',
  FALLING: 'falling',
  EATING: 'eating',
  LONELY: 'lonely',
  REACTING: 'reacting',
});

const pet = {
  el: document.getElementById('pet'),
  state: STATES.GREETING,
  direction: 1,          // 1 = facing/moving right, -1 = left
  walkFrame: 0,
  lastWalkFrameAt: 0,
};

// The window's current on-screen position (top-left corner), in absolute
// screen coordinates. This is the single source of truth for "where is
// she" — we push it to the OS window every time it changes.
let winX = 100;
let winY = FLOOR_Y;
let fallVY = 0;

function moveWindowTo(x, y) {
  winX = Math.max(0, Math.min(x, MAX_WIN_X));
  winY = y;
  window.petAPI.moveWindow(winX, winY);
}

let lastInteractionAt = Date.now();
let walkingElapsedMs = 0;
let messageTimer = 0;

let focusSecondsLeft = 0;
let breakSecondsLeft = 0;
let sessionTimerHandle = null;

const bubbleEl = document.getElementById('bubble');
const bubbleTextEl = document.getElementById('bubble-text');
const focusBarEl = document.getElementById('focus-bar');
const focusBarFillEl = document.getElementById('focus-bar-fill');
const focusBarLabelEl = document.getElementById('focus-bar-label');
const fxLayer = document.getElementById('fx-layer');
const stageEl = document.getElementById('stage');

// ======================================================================
// 4. SPRITES
// ======================================================================

const SPRITES = {
  idle: 'assets/idle.png',
  walk1: 'assets/walk-1.png',
  walk2: 'assets/walk-2.png',
  wave: 'assets/wave.png',
  focus: 'assets/focus.png',
  sleep: 'assets/sleep.png',
  drag: 'assets/drag.png',
  eating: 'assets/eating.png',
  laughing: 'assets/laughing.png',
  reacting: 'assets/reacting.png',
  crying: 'assets/crying.png',
  treat: 'assets/treat.png',
};

function setSprite(src) {
  if (!pet.el.src.endsWith(src)) pet.el.src = src;
}

function applyFacing() {
  pet.el.classList.toggle('facing-left', pet.direction < 0);
}

// ======================================================================
// 5. SPEECH BUBBLE
// ======================================================================

let bubbleHideTimeout = null;

function say(text, durationMs = CONFIG.bubbleShowDurationMs) {
  bubbleTextEl.textContent = text;
  bubbleEl.classList.remove('hidden');
  clearTimeout(bubbleHideTimeout);
  bubbleHideTimeout = setTimeout(() => {
    bubbleEl.classList.add('hidden');
  }, durationMs);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ======================================================================
// 6. FX PARTICLES (hearts / zzz)
// ======================================================================

function spawnParticle(emoji, xOffset = 0, className = '') {
  const span = document.createElement('span');
  span.className = `fx-particle ${className}`;
  span.textContent = emoji;
  span.style.left = `calc(50% + ${xOffset}px)`;
  span.style.top = '40px';
  span.style.setProperty('--drift', `${(Math.random() - 0.5) * 40}px`);
  fxLayer.appendChild(span);
  setTimeout(() => span.remove(), 2500);
}

function spawnHearts() {
  spawnParticle('💗', -20);
  setTimeout(() => spawnParticle('💕', 10), 150);
  setTimeout(() => spawnParticle('💖', 25), 300);
}

let zzzInterval = null;
function startZzz() {
  stopZzz();
  zzzInterval = setInterval(() => spawnParticle('Zzz', 30, 'zzz'), 900);
}
function stopZzz() {
  if (zzzInterval) clearInterval(zzzInterval);
  zzzInterval = null;
}

// ======================================================================
// 7. STATE TRANSITIONS
// ======================================================================

function setState(next) {
  if (pet.state === next) return;
  const prev = pet.state;
  pet.state = next;

  pet.el.classList.remove('bobbing');
  if (prev === STATES.SLEEP) stopZzz();
  if (next !== STATES.FOCUS && next !== STATES.BREAK) hideFocusBar();

  switch (next) {
    case STATES.WALKING:
      pet.el.classList.add('bobbing');
      break;
    case STATES.IDLE:
      setSprite(SPRITES.idle);
      break;
    case STATES.SLEEP:
      setSprite(SPRITES.sleep);
      startZzz();
      break;
    case STATES.DRAGGING:
      pet.el.classList.add('dragging');
      setSprite(SPRITES.drag);
      break;
    case STATES.FALLING:
      pet.el.classList.remove('dragging');
      fallVY = 0;
      break;
    case STATES.EATING:
      setSprite(SPRITES.eating);
      break;
    case STATES.LONELY:
      setSprite(SPRITES.crying);
      say("...i missed you. click me? 🥺", 3500);
      break;
    case STATES.REACTING:
      setSprite(SPRITES.reacting);
      break;
    case STATES.GREETING:
      setSprite(SPRITES.wave);
      break;
    default:
      break;
  }
}

// ======================================================================
// 8. FOCUS / BREAK SESSIONS
// ======================================================================

function formatMMSS(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function showFocusBar() { focusBarEl.classList.remove('hidden'); }
function hideFocusBar() { focusBarEl.classList.add('hidden'); }

function startFocusSession() {
  clearSessionTimer();
  setState(STATES.FOCUS);
  setSprite(SPRITES.focus);
  focusSecondsLeft = CONFIG.focusMinutes * 60;
  focusBarFillEl.style.width = '0%';
  showFocusBar();
  say(pickRandom(FOCUS_START_MESSAGES));

  sessionTimerHandle = setInterval(() => {
    focusSecondsLeft -= 1;
    const total = CONFIG.focusMinutes * 60;
    const pct = 100 * (1 - focusSecondsLeft / total);
    focusBarFillEl.style.width = `${pct}%`;
    focusBarLabelEl.textContent = formatMMSS(focusSecondsLeft);

    if (focusSecondsLeft <= 0) {
      clearSessionTimer();
      setSprite(SPRITES.laughing);
      say("focus session complete! amazing work 🎉", 4000);
      spawnHearts();
      setTimeout(() => setState(STATES.WALKING), 1500);
    }
  }, 1000);
}

function startBreak() {
  clearSessionTimer();
  setState(STATES.BREAK);
  breakSecondsLeft = CONFIG.breakMinutes * 60;
  focusBarFillEl.style.width = '0%';
  focusBarLabelEl.textContent = formatMMSS(breakSecondsLeft);
  showFocusBar();
  say(pickRandom(BREAK_MESSAGES));
  pet.el.classList.add('bobbing');

  sessionTimerHandle = setInterval(() => {
    breakSecondsLeft -= 1;
    const total = CONFIG.breakMinutes * 60;
    const pct = 100 * (1 - breakSecondsLeft / total);
    focusBarFillEl.style.width = `${pct}%`;
    focusBarLabelEl.textContent = formatMMSS(breakSecondsLeft);

    if (breakSecondsLeft <= 0) {
      clearSessionTimer();
      say("break's over — back to it! 💪", 3000);
      setState(STATES.WALKING);
    }
  }, 1000);
}

function clearSessionTimer() {
  if (sessionTimerHandle) clearInterval(sessionTimerHandle);
  sessionTimerHandle = null;
}

// ======================================================================
// 9. FEEDING (double-click)
// ======================================================================

function feedPet() {
  if (pet.state === STATES.DRAGGING || pet.state === STATES.FALLING) return;
  const wasState = (pet.state === STATES.FOCUS || pet.state === STATES.BREAK)
    ? pet.state
    : STATES.WALKING;

  const treat = document.createElement('img');
  treat.src = SPRITES.treat;
  treat.className = 'falling-treat';
  treat.style.top = '-40px';
  stageEl.appendChild(treat);

  const targetTop = WIN_H - CONFIG.characterHeight * 0.55;
  const durationMs = 650;
  const startTime = performance.now();

  function dropFrame(now) {
    const t = Math.min(1, (now - startTime) / durationMs);
    const eased = t * t; // accelerate like gravity
    treat.style.top = `${-40 + eased * (targetTop + 40)}px`;
    if (t < 1) {
      requestAnimationFrame(dropFrame);
    } else {
      treat.remove();
      setState(STATES.REACTING);
      spawnHearts();
      setTimeout(() => {
        setState(STATES.EATING);
        say(pickRandom(FEED_MESSAGES), 2500);
        setTimeout(() => {
          if (wasState === STATES.FOCUS) setSprite(SPRITES.focus);
          setState(wasState);
        }, 1800);
      }, 400);
    }
  }
  requestAnimationFrame(dropFrame);
}

// ======================================================================
// 10. DRAG & DROP PHYSICS
// ======================================================================

let dragOffsetX = 0;
let dragOffsetY = 0;

function beginDrag(screenX, screenY) {
  lastInteractionAt = Date.now();
  dragOffsetX = screenX - winX;
  dragOffsetY = screenY - winY;
  setState(STATES.DRAGGING);
}

function updateDrag(screenX, screenY) {
  moveWindowTo(screenX - dragOffsetX, screenY - dragOffsetY);
}

function endDrag() {
  setState(STATES.FALLING);
}

// ======================================================================
// 11. MAIN LOOP
// ======================================================================

let lastFrameTime = performance.now();

function tick(now) {
  const dt = Math.min(64, now - lastFrameTime); // clamp for tab-throttle safety
  lastFrameTime = now;

  switch (pet.state) {
    case STATES.WALKING:
    case STATES.BREAK:
      updateWalk(dt, now);
      break;
    case STATES.FALLING:
      updateFalling(dt);
      break;
    default:
      break;
  }

  requestAnimationFrame(tick);
}

function updateWalk(dt, now) {
  let nextX = winX + (pet.direction * CONFIG.walkSpeed * dt) / 1000;

  if (nextX <= 0) {
    nextX = 0;
    pet.direction = 1;
  } else if (nextX >= MAX_WIN_X) {
    nextX = MAX_WIN_X;
    pet.direction = -1;
  }

  moveWindowTo(nextX, FLOOR_Y);
  applyFacing();

  if (now - pet.lastWalkFrameAt > CONFIG.walkFrameMs) {
    pet.lastWalkFrameAt = now;
    pet.walkFrame = 1 - pet.walkFrame;
    setSprite(pet.walkFrame ? SPRITES.walk2 : SPRITES.walk1);
  }
}

function updateFalling(dt) {
  const gravity = 2200; // px/s^2
  fallVY += (gravity * dt) / 1000;
  let nextY = winY + (fallVY * dt) / 1000;

  if (nextY >= FLOOR_Y) {
    nextY = FLOOR_Y;
    fallVY = 0;
    moveWindowTo(winX, nextY);
    setState(STATES.REACTING);
    setTimeout(() => setState(STATES.WALKING), 700);
    return;
  }
  moveWindowTo(winX, nextY);
}

requestAnimationFrame(tick);

// ======================================================================
// 12. PERIODIC TIMERS (messages / sleep / loneliness) — 1s ticks
// ======================================================================

setInterval(() => {
  const now = Date.now();

  if (
    (pet.state === STATES.WALKING || pet.state === STATES.BREAK) &&
    CONFIG.messageFrequencyMs > 0
  ) {
    messageTimer += 1000;
    if (messageTimer >= CONFIG.messageFrequencyMs) {
      messageTimer = 0;
      const pool = pet.state === STATES.BREAK ? BREAK_MESSAGES : COZY_MESSAGES;
      say(pickRandom(pool));
    }
  }

  if (pet.state === STATES.WALKING || pet.state === STATES.IDLE) {
    walkingElapsedMs += 1000;
    const sleepIntervalMs = CONFIG.sleepIntervalMinutes * 60 * 1000;
    if (walkingElapsedMs >= sleepIntervalMs) {
      walkingElapsedMs = 0;
      goToSleep();
    }
  }

  if (
    pet.state === STATES.WALKING &&
    now - lastInteractionAt > CONFIG.lonelyAfterMs
  ) {
    lastInteractionAt = now;
    setState(STATES.LONELY);
    setTimeout(() => setState(STATES.WALKING), 3200);
  }
}, 1000);

function goToSleep() {
  if (pet.state === STATES.FOCUS || pet.state === STATES.BREAK) return;
  setState(STATES.SLEEP);
  setTimeout(() => {
    if (pet.state === STATES.SLEEP) setState(STATES.WALKING);
  }, CONFIG.sleepDurationMinutes * 60 * 1000);
}

// ======================================================================
// 13. MOUSE / INTERACTION WIRING
// ======================================================================

let clickTimeout = null;
let lastClickAt = 0;
const DBLCLICK_DELAY_MS = 300;

// Distinguishing "click/double-click" from "drag" is the tricky part:
// a naive version starts dragging on every mousedown, which breaks
// double-click (the first click's mousedown+mouseup fires the whole
// drag-then-fall sequence before the dblclick event even arrives). So
// instead we "arm" a potential drag on mousedown, and only actually
// start dragging once the mouse moves past a small threshold.

let dragArmed = false;
let dragStartScreenX = 0;
let dragStartScreenY = 0;
const DRAG_THRESHOLD_PX = 4;

pet.el.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return; // left click only
  dragArmed = true;
  dragStartScreenX = e.screenX;
  dragStartScreenY = e.screenY;
});

document.addEventListener('mousemove', (e) => {
  if (pet.state === STATES.DRAGGING) {
    updateDrag(e.screenX, e.screenY);
    return;
  }
  if (dragArmed) {
    const dx = e.screenX - dragStartScreenX;
    const dy = e.screenY - dragStartScreenY;
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      beginDrag(dragStartScreenX, dragStartScreenY);
      updateDrag(e.screenX, e.screenY);
    }
  }
});

document.addEventListener('mouseup', () => {
  dragArmed = false;
  if (pet.state === STATES.DRAGGING) endDrag();
});

pet.el.addEventListener('click', () => {
  const now = Date.now();
  if (now - lastClickAt < DBLCLICK_DELAY_MS) {
    lastClickAt = 0;
    clearTimeout(clickTimeout);
    feedPet();
    return;
  }
  lastClickAt = now;
  lastInteractionAt = now;
  clearTimeout(clickTimeout);
  clickTimeout = setTimeout(() => {
    if (pet.state === STATES.WALKING || pet.state === STATES.IDLE) {
      say(pickRandom(COZY_MESSAGES));
    }
  }, 220); // wait to make sure it isn't the first half of a double-click
});

pet.el.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  window.petAPI.showContextMenu();
});

window.petAPI.onMenuAction((action) => {
  lastInteractionAt = Date.now();
  switch (action) {
    case 'start-focus': startFocusSession(); break;
    case 'start-break': startBreak(); break;
    case 'freq-15': CONFIG.messageFrequencyMs = 15000; break;
    case 'freq-30': CONFIG.messageFrequencyMs = 30000; break;
    case 'freq-60': CONFIG.messageFrequencyMs = 60000; break;
    case 'freq-off': CONFIG.messageFrequencyMs = 0; break;
    default: break;
  }
});

// ======================================================================
// 14. BOOT
// ======================================================================

document.documentElement.style.setProperty('--character-height', `${CONFIG.characterHeight}px`);

setState(STATES.GREETING);
say("hi! I'm your mini me 👋", 3000);
setTimeout(() => setState(STATES.WALKING), 2200);
