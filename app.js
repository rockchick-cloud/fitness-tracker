const STORAGE_KEY = 'fitness-tracker-v1';
const PLANK_DURATION = 60;

const schedule = {
  6: 'Long Peloton Ride (60+ min)',
  0: 'Yoga (20–30 min) + Walk (30 min)',
  1: 'Bike Bootcamp',
  2: 'Barre or Pilates (20 min) + Walk (30 min)',
  3: 'Strength (30 min)',
  4: 'Core (10 min) + Pilates (10 min) + Walk/Jog (30 min)',
  5: 'Bike Bootcamp',
};

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const weeklyOrder = [6, 0, 1, 2, 3, 4, 5];

function fmtDate(date) {
  return date.toISOString().slice(0, 10);
}

function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function nextSaturday(fromDate = new Date()) {
  const start = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const daysUntil = (6 - start.getDay() + 7) % 7 || 7;
  start.setDate(start.getDate() + daysUntil);
  return start;
}

function defaultState() {
  return {
    trackingStartDate: fmtDate(nextSaturday()),
    plankCompletions: {},
    workoutCompletions: {},
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return {
      ...defaultState(),
      ...parsed,
      plankCompletions: parsed.plankCompletions || {},
      workoutCompletions: parsed.workoutCompletions || {},
    };
  } catch {
    return defaultState();
  }
}

function showError(message) {
  const existing = document.getElementById('appError');
  if (existing) existing.remove();
  const note = document.createElement('p');
  note.id = 'appError';
  note.className = 'error-text';
  note.textContent = message;
  const appRoot = document.querySelector('.app') || document.body;
  appRoot.prepend(note);
}

function initApp() {
  let state = loadState();
  let timerSeconds = PLANK_DURATION;
  let intervalId = null;
  let currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const timerEl = document.getElementById('timer');
  const startPauseBtn = document.getElementById('startPauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  const markPlankBtn = document.getElementById('markPlankBtn');
  const plankStatus = document.getElementById('plankStatus');
  const streakValue = document.getElementById('streakValue');
  const totalValue = document.getElementById('totalValue');
  const weeklyList = document.getElementById('weeklyList');
  const startDateText = document.getElementById('startDateText');
  const monthLabel = document.getElementById('monthLabel');
  const weekdayRow = document.getElementById('weekdayRow');
  const calendarGrid = document.getElementById('calendarGrid');
  const prevMonth = document.getElementById('prevMonth');
  const nextMonthBtn = document.getElementById('nextMonth');
  const exportBtn = document.getElementById('exportBtn');
  const importInput = document.getElementById('importInput');
  const dayCellTemplate = document.getElementById('dayCellTemplate');

  const required = [
    timerEl, startPauseBtn, resetBtn, markPlankBtn, plankStatus, streakValue, totalValue,
    weeklyList, startDateText, monthLabel, weekdayRow, calendarGrid, prevMonth, nextMonthBtn,
    exportBtn, importInput, dayCellTemplate,
  ];

  if (required.some((el) => !el)) {
    showError('Could not load all app sections. Please refresh the page.');
    return;
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function formatTimer(seconds) {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function renderTimer() {
    timerEl.textContent = formatTimer(timerSeconds);
  }

  function markPlankToday() {
    const key = fmtDate(new Date());
    state.plankCompletions[key] = true;
    saveState();
    renderStats();
    renderCalendar();
    renderPlankStatus();
  }

  function startTimer() {
    if (intervalId) return;
    startPauseBtn.textContent = 'Pause';
    intervalId = setInterval(() => {
      timerSeconds -= 1;
      renderTimer();
      if (timerSeconds <= 0) {
        clearInterval(intervalId);
        intervalId = null;
        startPauseBtn.textContent = 'Start';
        timerSeconds = 0;
        markPlankToday();
      }
    }, 1000);
  }

  function pauseTimer() {
    if (!intervalId) return;
    clearInterval(intervalId);
    intervalId = null;
    startPauseBtn.textContent = 'Start';
  }

  function resetTimer() {
    pauseTimer();
    timerSeconds = PLANK_DURATION;
    renderTimer();
  }

  function streakCount() {
    let streak = 0;
    const day = new Date();
    day.setHours(0, 0, 0, 0);

    while (state.plankCompletions[fmtDate(day)]) {
      streak += 1;
      day.setDate(day.getDate() - 1);
    }

    return streak;
  }

  function renderStats() {
    const total = Object.keys(state.plankCompletions).filter((k) => state.plankCompletions[k]).length;
    totalValue.textContent = `${total}`;
    streakValue.textContent = `${streakCount()} days`;
  }

  function renderPlankStatus() {
    const todayDone = !!state.plankCompletions[fmtDate(new Date())];
    plankStatus.textContent = todayDone ? 'Plank complete for today ✅' : 'Plank not completed yet today';
  }

  function renderWeeklyPlan() {
    weeklyList.innerHTML = '';
    const startDate = parseDateKey(state.trackingStartDate);
    startDateText.textContent = `Tracking cycle started: ${startDate.toLocaleDateString(undefined, {
      weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
    })}`;

    weeklyOrder.forEach((day) => {
      const li = document.createElement('li');
      const left = document.createElement('strong');
      left.textContent = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
      const right = document.createElement('span');
      right.textContent = schedule[day];
      li.append(left, right);
      weeklyList.appendChild(li);
    });
  }

  function scheduleForDate(dateObj) {
    const dateOnly = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    const start = parseDateKey(state.trackingStartDate);
    if (dateOnly < start) return 'Starts next Saturday';
    return schedule[dateOnly.getDay()];
  }

  function renderWeekdayHeader() {
    weekdayRow.innerHTML = '';
    weekdays.forEach((d) => {
      const span = document.createElement('span');
      span.textContent = d;
      weekdayRow.appendChild(span);
    });
  }

  function toggleCompletion(type, key) {
    const target = type === 'workout' ? state.workoutCompletions : state.plankCompletions;
    target[key] = !target[key];
    if (!target[key]) delete target[key];
    saveState();
    renderStats();
    renderCalendar();
    renderPlankStatus();
  }

  function renderCalendar() {
    calendarGrid.innerHTML = '';
    monthLabel.textContent = currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = first.getDay();
    const gridStart = new Date(year, month, 1 - startOffset);

    for (let i = 0; i < 42; i += 1) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const key = fmtDate(d);
      const isCurrentMonth = d.getMonth() === month;
      const isToday = key === fmtDate(new Date());

      const node = dayCellTemplate.content.firstElementChild.cloneNode(true);
      if (!isCurrentMonth) node.classList.add('outside');
      if (isToday) node.classList.add('today');

      node.querySelector('.day-number').textContent = d.getDate();
      node.querySelector('.workout-text').textContent = scheduleForDate(d);

      const workoutChip = node.querySelector('.workout-chip');
      const plankChip = node.querySelector('.plank-chip');

      if (state.workoutCompletions[key]) workoutChip.classList.add('done');
      if (state.plankCompletions[key]) plankChip.classList.add('done');

      workoutChip.addEventListener('click', () => toggleCompletion('workout', key));
      plankChip.addEventListener('click', () => toggleCompletion('plank', key));

      calendarGrid.appendChild(node);
    }
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitness-tracker-export-${fmtDate(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importData(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const incoming = JSON.parse(reader.result);
        if (!incoming || typeof incoming !== 'object') throw new Error('Invalid file');
        state = {
          ...defaultState(),
          ...incoming,
          plankCompletions: incoming.plankCompletions || {},
          workoutCompletions: incoming.workoutCompletions || {},
        };
        saveState();
        renderAll();
        alert('Data imported successfully.');
      } catch {
        alert('Could not import data. Please choose a valid export JSON file.');
      }
    };
    reader.readAsText(file);
  }

  function renderAll() {
    renderTimer();
    renderStats();
    renderPlankStatus();
    renderWeeklyPlan();
    renderWeekdayHeader();
    renderCalendar();
  }

  startPauseBtn.addEventListener('click', () => {
    if (intervalId) pauseTimer();
    else startTimer();
  });
  resetBtn.addEventListener('click', resetTimer);
  markPlankBtn.addEventListener('click', markPlankToday);
  prevMonth.addEventListener('click', () => {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    renderCalendar();
  });
  nextMonthBtn.addEventListener('click', () => {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    renderCalendar();
  });
  exportBtn.addEventListener('click', exportData);
  importInput.addEventListener('change', (e) => importData(e.target.files[0]));

  renderAll();
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    initApp();
  } catch {
    showError('The app failed to initialize. Please reload and try again.');
  }
});
