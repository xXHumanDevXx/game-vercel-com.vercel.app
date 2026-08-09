const DB_KEY = 'game-portal-db-v1';
const SESSION_KEY = 'game-portal-current-user';
const DEFAULT_DATA = { users: [ { username: 'HumanCat', password: 'human123', coins: 120, level: 2 } ] };
const GAMES = {
  'void-dash': { title: 'Void Dash', reward: 30, description: 'Springe durch den Void und sammle Pixel-Sterne.', website: 'https://www.roblox.com/home' },
  'space-assault': { title: 'Space Assault', reward: 25, description: 'Zerstöre Asteroiden und schalte neue Fähigkeiten frei.', website: 'https://www.roblox.com/home' },
  'doge-blast': { title: 'Doge Blast', reward: 20, description: 'Schieße Doge-Power auf die Gegner und gewinne Coins.', website: 'https://www.roblox.com/home' }
};

async function loadDatabase() {
  const stored = localStorage.getItem(DB_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch (err) { console.warn('Fehler beim Lesen der lokalen Daten', err); }
  }

  try {
    const response = await fetch('data.json');
    if (response.ok) {
      const seed = await response.json();
      if (seed && seed.users) {
        localStorage.setItem(DB_KEY, JSON.stringify(seed));
        return seed;
      }
    }
  } catch (error) {
    console.warn('Seed-Daten konnten nicht geladen werden:', error);
  }

  localStorage.setItem(DB_KEY, JSON.stringify(DEFAULT_DATA));
  return DEFAULT_DATA;
}

function saveDatabase(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function saveSession(username) {
  localStorage.setItem(SESSION_KEY, username);
}

function getSession() {
  return localStorage.getItem(SESSION_KEY);
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function getUser(db, username) {
  if (!username) return null;
  return db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => toast.classList.remove('visible'), 3000);
  setTimeout(() => toast.remove(), 3400);
}

function requireSession() {
  const username = getSession();
  if (!username) {
    location.href = 'index.html';
    return null;
  }
  return username;
}

function getGuestUser() {
  return { username: 'Gast', coins: 0, level: 1, guest: true };
}

function logout() {
  clearSession();
  location.href = 'index.html';
}

function dailyBonusKey(username) {
  return `game-portal-daily-${username.toLowerCase()}`;
}

function canClaimDailyBonus(username) {
  const stored = localStorage.getItem(dailyBonusKey(username));
  const today = new Date().toISOString().slice(0, 10);
  if (!stored) return true;
  const data = JSON.parse(stored);
  return data.date !== today;
}

function claimDailyBonus(username) {
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem(dailyBonusKey(username), JSON.stringify({ date: today }));
}

function awardCoins(db, user, amount, label) {
  user.coins += amount;
  user.level = Math.max(1, Math.floor(user.coins / 100) + 1);
  saveDatabase(db);
  if (label) showToast(`${label} +${amount} Coins`);
}

function renderUserSummary(user) {
  const coinsElement = document.getElementById('coins-count');
  const coinsSummary = document.getElementById('coins-summary');
  const levelElement = document.getElementById('level-count');
  const welcomeElement = document.getElementById('welcome-text');
  const welcomeShort = document.getElementById('welcome-short');
  if (coinsElement) coinsElement.textContent = user.coins;
  if (coinsSummary) coinsSummary.textContent = `${user.coins} Coins`;
  if (levelElement) levelElement.textContent = user.level;
  if (welcomeElement) welcomeElement.textContent = `Willkommen zurück, ${user.username}!`;
  if (welcomeShort) welcomeShort.textContent = user.username;
}

function setupCommonInteractions() {
  const ring = document.getElementById('cur-ring');
  const dot = document.getElementById('cur-dot');
  const glow = document.getElementById('cur-glow');
  if (!ring || !dot || !glow) return;
  window.addEventListener('mousemove', event => {
    const transform = `translate(${event.clientX}px, ${event.clientY}px) translate(-50%, -50%)`;
    ring.style.transform = transform;
    dot.style.transform = transform;
    glow.style.transform = transform;
  });
  window.addEventListener('mousedown', () => { ring.style.width = ring.style.height = '16px'; });
  window.addEventListener('mouseup', () => { ring.style.width = ring.style.height = '24px'; });
}

async function initLoginPage() {
  setupCommonInteractions();
  const db = await loadDatabase();
  const form = document.getElementById('login-form');
  const error = document.getElementById('login-error');

  if (!form) return;

  form.addEventListener('submit', event => {
    event.preventDefault();
    const username = form.username.value.trim();
    const password = form.password.value.trim();
    if (!username || !password) {
      error.textContent = 'Bitte gib Benutzername und Passwort ein.';
      return;
    }

    let user = getUser(db, username);
    if (user) {
      if (user.password !== password) {
        error.textContent = 'Falsches Passwort. Versuch es noch einmal.';
        return;
      }
    } else {
      user = { username, password, coins: 50, level: 1 };
      db.users.push(user);
      saveDatabase(db);
      showToast('Account erstellt und angemeldet. Viel Spaß!');
    }

    saveSession(user.username);
    location.href = 'home.html';
  });
}

async function initHomePage() {
  setupCommonInteractions();
  const db = await loadDatabase();
  const username = getSession();
  const user = username ? getUser(db, username) : getGuestUser();
  if (!user) return logout();
  const isGuest = !username || user.guest;

  renderUserSummary(user);
  const settingsLink = document.getElementById('settings-link');
  const logoutLink = document.getElementById('logout-link');
  const guestLoginButton = document.getElementById('guest-login-button');
  const welcomeText = document.getElementById('welcome-text');

  if (isGuest) {
    settingsLink?.classList.add('hidden');
    logoutLink?.classList.add('hidden');
    guestLoginButton?.classList.remove('hidden');
    if (welcomeText) welcomeText.textContent = 'Spiele als Gast';
  } else {
    guestLoginButton?.classList.add('hidden');
  }

  document.getElementById('settings-link')?.addEventListener('click', () => location.href = 'settings.html');
  document.getElementById('logout-link')?.addEventListener('click', event => { event.preventDefault(); logout(); });

  const dailyButton = document.getElementById('daily-bonus-button');
  if (dailyButton) {
    if (user.guest) {
      dailyButton.disabled = true;
      dailyButton.textContent = 'Nur für registrierte Nutzer';
    } else {
      dailyButton.addEventListener('click', () => {
        if (canClaimDailyBonus(user.username)) {
          awardCoins(db, user, 25, 'Täglicher Bonus');
          claimDailyBonus(user.username);
          dailyButton.textContent = 'Heute erhalten';
          dailyButton.disabled = true;
        } else {
          showToast('Bonus bereits für heute aktiviert. Komm morgen wieder!');
        }
      });
      if (!canClaimDailyBonus(user.username)) {
        dailyButton.textContent = 'Heute erhalten';
        dailyButton.disabled = true;
      }
    }
  }

  const playButtons = document.querySelectorAll('.play-btn');
  const gameView = document.getElementById('game-view');
  const gameTitle = document.getElementById('game-title');
  const gameDescription = document.getElementById('game-description');
  const closeGame = document.getElementById('close-game');
  const continueButton = document.getElementById('continue-game');

  playButtons.forEach(button => {
    button.addEventListener('click', () => {
      const gameId = button.dataset.game;
      const game = GAMES[gameId];
      if (!game || !gameView || !gameTitle || !gameDescription) return;
      gameTitle.textContent = game.title;
      gameDescription.textContent = `${game.description} Starte das Spiel und sammle Belohnungen.`;
      gameView.classList.add('on');
    });
  });

  closeGame?.addEventListener('click', () => {
    gameView?.classList.remove('on');
  });

  continueButton?.addEventListener('click', () => {
    const activeTitle = gameTitle?.textContent;
    const game = Object.values(GAMES).find(item => item.title === activeTitle);
    if (!game) return;
    if (!user.guest) {
      awardCoins(db, user, game.reward, `${game.title} abgeschlossen`);
      renderUserSummary(user);
    } else {
      showToast('Als Gast kannst du keine Coins sammeln. Melde dich an, um Belohnungen zu erhalten.');
    }
    gameView?.classList.remove('on');
  });
}

async function initSettingsPage() {
  setupCommonInteractions();
  const db = await loadDatabase();
  const username = requireSession();
  if (!username) return;
  const user = getUser(db, username);
  if (!user) return logout();

  document.getElementById('settings-username').textContent = user.username;
  document.getElementById('settings-coins').textContent = user.coins;
  document.getElementById('settings-level').textContent = user.level;

  document.getElementById('logout-button')?.addEventListener('click', logout);
  document.getElementById('reset-button')?.addEventListener('click', () => {
    user.coins = 0;
    user.level = 1;
    saveDatabase(db);
    document.getElementById('settings-coins').textContent = user.coins;
    document.getElementById('settings-level').textContent = user.level;
    showToast('Dein Fortschritt wurde zurückgesetzt.');
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page === 'login') return initLoginPage();
  if (page === 'home') return initHomePage();
  if (page === 'settings') return initSettingsPage();
  setupCommonInteractions();
});
