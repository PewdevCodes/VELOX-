// Configuration
const API_BASE = window.location.origin;
const WS_URL = `ws://${window.location.host}/ws`;

// State
let ws = null;
let currentMatchId = null;
let matches = [];
let commentary = {};

// DOM Elements
const wsStatus = document.getElementById('wsStatus');
const wsStatusText = document.getElementById('wsStatusText');
const matchesList = document.getElementById('matchesList');
const commentaryList = document.getElementById('commentaryList');
const selectedMatchText = document.getElementById('selectedMatch');
const refreshMatchesBtn = document.getElementById('refreshMatches');
const createMatchForm = document.getElementById('createMatchForm');
const addCommentaryForm = document.getElementById('addCommentaryForm');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initWebSocket();
  fetchMatches();
  setupEventListeners();
});

// WebSocket Management
function initWebSocket() {
  updateConnectionStatus('connecting');

  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('WebSocket connected');
    updateConnectionStatus('connected');
  };

  ws.onmessage = (event) => {
    handleWebSocketMessage(JSON.parse(event.data));
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    updateConnectionStatus('error');
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected');
    updateConnectionStatus('disconnected');
    // Reconnect after 3 seconds
    setTimeout(initWebSocket, 3000);
  };
}

function handleWebSocketMessage(message) {
  console.log('WS Message:', message);

  switch (message.type) {
    case 'welcome':
      console.log('Connected to Sportz Live');
      break;

    case 'match_created':
      handleMatchUpdate(message.data);
      break;

    case 'commentary_update':
      handleCommentaryUpdate(message.data);
      break;

    case 'subscribed':
      console.log(`Subscribed to match ${message.matchId}`);
      break;

    case 'unsubscribed':
      console.log(`Unsubscribed from match ${message.matchId}`);
      break;

    case 'error':
      console.error('WS Error:', message.message);
      break;
  }
}

function subscribeToMatch(matchId) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'subscribe', matchId }));
  }
}

function unsubscribeFromMatch(matchId) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'unsubscribe', matchId }));
  }
}

function updateConnectionStatus(status) {
  wsStatus.className = 'status-indicator';

  switch (status) {
    case 'connected':
      wsStatus.classList.add('connected');
      wsStatusText.textContent = 'Connected';
      break;
    case 'connecting':
      wsStatusText.textContent = 'Connecting...';
      break;
    case 'disconnected':
    case 'error':
      wsStatusText.textContent = 'Disconnected';
      break;
  }
}

// API Functions
async function fetchMatches() {
  try {
    matchesList.innerHTML = '<div class="loading">Loading matches...</div>';

    const response = await fetch(`${API_BASE}/matches?limit=50`);
    const data = await response.json();

    matches = data.matches || [];
    renderMatches();
  } catch (error) {
    console.error('Error fetching matches:', error);
    matchesList.innerHTML = '<div class="error">Failed to load matches</div>';
  }
}

async function fetchCommentary(matchId) {
  try {
    const response = await fetch(
      `${API_BASE}/matches/${matchId}/commentary?limit=100`,
    );
    const data = await response.json();

    commentary[matchId] = data.data || [];
    renderCommentary();
  } catch (error) {
    console.error('Error fetching commentary:', error);
    commentaryList.innerHTML =
      '<div class="error">Failed to load commentary</div>';
  }
}

async function createMatch(formData) {
  try {
    const response = await fetch(`${API_BASE}/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (response.ok) {
      alert('Match created successfully!');
      createMatchForm.reset();
      fetchMatches();
    } else {
      alert(`Error: ${data.error || 'Failed to create match'}`);
    }
  } catch (error) {
    console.error('Error creating match:', error);
    alert('Failed to create match');
  }
}

async function addCommentary(matchId, formData) {
  try {
    const response = await fetch(`${API_BASE}/matches/${matchId}/commentary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        matchId: parseInt(matchId),
      }),
    });

    const data = await response.json();

    if (response.ok) {
      alert('Commentary added successfully!');
      addCommentaryForm.reset();
    } else {
      alert(`Error: ${data.error || 'Failed to add commentary'}`);
    }
  } catch (error) {
    console.error('Error adding commentary:', error);
    alert('Failed to add commentary');
  }
}

// Render Functions
function renderMatches() {
  if (matches.length === 0) {
    matchesList.innerHTML =
      '<div class="empty-state"><p>No matches available</p></div>';
    return;
  }

  matchesList.innerHTML = matches
    .map(
      (match) => `
        <div class="match-card ${match.status} ${currentMatchId === match.id ? 'selected' : ''}" 
             data-match-id="${match.id}"
             onclick="selectMatch(${match.id})">
            <div class="match-header">
                <span class="sport-badge">${escapeHtml(match.sport)}</span>
                <span class="match-status ${match.status}">${match.status}</span>
            </div>
            <div class="match-teams">
                <span>${escapeHtml(match.homeTeam)}</span>
                <span class="score">${match.homeScore} - ${match.awayScore}</span>
                <span>${escapeHtml(match.awayTeam)}</span>
            </div>
            <div class="match-time">
                ${formatDateTime(match.startTime)}
            </div>
        </div>
    `,
    )
    .join('');
}

function renderCommentary() {
  if (!currentMatchId) {
    commentaryList.innerHTML =
      '<div class="empty-state"><p>👈 Select a match from the list to view live commentary</p></div>';
    return;
  }

  const matchCommentary = commentary[currentMatchId] || [];

  if (matchCommentary.length === 0) {
    commentaryList.innerHTML =
      '<div class="empty-state"><p>No commentary available for this match yet</p></div>';
    return;
  }

  commentaryList.innerHTML = matchCommentary
    .map(
      (item) => `
        <div class="commentary-item">
            <div class="commentary-header">
                <span class="commentary-minute">${item.minute ? `${item.minute}'` : '--'}</span>
                <span class="commentary-type">${escapeHtml(item.eventType)}</span>
            </div>
            <div class="commentary-actor">
                ${escapeHtml(item.actor)}${item.team ? ` (${escapeHtml(item.team)})` : ''}
            </div>
            <div class="commentary-message">${escapeHtml(item.message)}</div>
        </div>
    `,
    )
    .join('');

  // Scroll to top to see latest commentary
  commentaryList.scrollTop = 0;
}

// Event Handlers
function selectMatch(matchId) {
  // Unsubscribe from previous match
  if (currentMatchId && currentMatchId !== matchId) {
    unsubscribeFromMatch(currentMatchId);
  }

  currentMatchId = matchId;
  const match = matches.find((m) => m.id === matchId);

  if (match) {
    selectedMatchText.textContent = `${match.homeTeam} vs ${match.awayTeam}`;
    subscribeToMatch(matchId);
    fetchCommentary(matchId);
  }

  renderMatches();
}

function handleMatchUpdate(updatedMatch) {
  const index = matches.findIndex((m) => m.id === updatedMatch.id);

  if (index !== -1) {
    matches[index] = updatedMatch;
  } else {
    matches.unshift(updatedMatch);
  }

  renderMatches();
}

function handleCommentaryUpdate(newCommentary) {
  if (newCommentary.matchId === currentMatchId) {
    if (!commentary[currentMatchId]) {
      commentary[currentMatchId] = [];
    }

    // Add to beginning (newest first)
    commentary[currentMatchId].unshift(newCommentary);
    renderCommentary();

    // Show notification
    showNotification(`New: ${newCommentary.message}`);
  }
}

function setupEventListeners() {
  refreshMatchesBtn.addEventListener('click', fetchMatches);

  createMatchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      sport: formData.get('sport'),
      homeTeam: formData.get('homeTeam'),
      awayTeam: formData.get('awayTeam'),
      startTime: new Date(formData.get('startTime')).toISOString(),
      endTime: new Date(formData.get('endTime')).toISOString(),
    };
    createMatch(data);
  });

  addCommentaryForm.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!currentMatchId) {
      alert('Please select a match first');
      return;
    }

    const formData = new FormData(e.target);
    const data = {
      minute: parseInt(formData.get('minute')) || undefined,
      sequence: parseInt(formData.get('sequence')),
      eventType: formData.get('eventType'),
      actor: formData.get('actor'),
      team: formData.get('team') || undefined,
      message: formData.get('message'),
    };

    addCommentary(currentMatchId, data);
  });
}

// Utility Functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDateTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function showNotification(message) {
  // Simple console notification (you can enhance with toast notifications)
  console.log('📢 Notification:', message);
}
