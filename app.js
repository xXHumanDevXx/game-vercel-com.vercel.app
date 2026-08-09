const DB_KEY = 'game-portal-db-v1';
const SESSION_KEY = 'game-portal-current-user';
const DEFAULT_DATA = { users: [ { username: 'HumanCat', password: 'human123', level: 2 } ] };
const GAMES = {
  'void-dash': { title: 'Void Dash', description: 'Springe durch den Void und sammle Pixel-Sterne.' },
  'space-assault': { title: 'Space Assault', description: 'Zerstöre Asteroiden und schalte neue Fähigkeiten frei.' },
  'doge-blast': { title: 'Doge Blast', description: 'Schieße Doge-Power auf die Gegner und gewinne Arcade-Action.' }
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

function logout() {
  clearSession();
  location.href = 'index.html';
}

function saveUserProgress(db, user) {
  saveDatabase(db);
}

function renderUserSummary(user) {
  const levelElement = document.getElementById('level-count');
  const welcomeElement = document.getElementById('welcome-text');
  const welcomeShort = document.getElementById('welcome-short');
  if (levelElement) levelElement.textContent = `Level ${user.level}`;
  if (welcomeElement) welcomeElement.textContent = `Willkommen zurück, ${user.username}!`;
  if (welcomeShort) welcomeShort.textContent = user.username;
}


async function initLoginPage() {
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
      user = { username, password, level: 1 };
      db.users.push(user);
      saveDatabase(db);
      showToast('Account erstellt und angemeldet. Viel Spaß!');
    }

    saveSession(user.username);
    location.href = 'home.html';
  });
}

async function initHomePage() {
  const db = await loadDatabase();
  const username = requireSession();
  if (!username) return;
  const user = getUser(db, username);
  if (!user) return logout();

  renderUserSummary(user);
  const settingsLink = document.getElementById('settings-link');
  const logoutLink = document.getElementById('logout-link');

  document.getElementById('settings-link')?.addEventListener('click', () => location.href = 'settings.html');
  document.getElementById('logout-link')?.addEventListener('click', event => { event.preventDefault(); logout(); });


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
    showToast(`${game.title} startet jetzt.`);
    gameView?.classList.remove('on');
  });
}

async function initSettingsPage() {
  const db = await loadDatabase();
  const username = requireSession();
  if (!username) return;
  const user = getUser(db, username);
  if (!user) return logout();

  document.getElementById('settings-username').textContent = user.username;
  document.getElementById('settings-level').textContent = user.level;

  document.getElementById('logout-button')?.addEventListener('click', logout);
  document.getElementById('reset-button')?.addEventListener('click', () => {
    user.level = 1;
    saveDatabase(db);
    document.getElementById('settings-level').textContent = user.level;
    showToast('Dein Fortschritt wurde zurückgesetzt.');
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page === 'login') return initLoginPage();
  if (page === 'home') return initHomePage();
  if (page === 'settings') return initSettingsPage();
});
