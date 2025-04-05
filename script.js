document.addEventListener('DOMContentLoaded', () => {
  const NUM_PLAYERS = 6;
  const NUM_ROUNDS = 15;
  const RACES_PER_ROUND = 4;
  const PLAYERS_PER_ROUND = 4;

  // Points Mapping: Place -> Points (1st = 15, 2nd = 12, ..., 12th = 1)
  // Only 4 players race, so only 1st-4th matter for direct input,
  // but keep full map in case rules change or for flexibility.
  const POINTS_MAP = {
    1: 15, 2: 12, 3: 10, 4: 9, 5: 8, 6: 7,
    7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1
  };

  // --- STATE ---
  let playerNames = ["Player A", "Player B", "Player C", "Player D", "Player E", "Player F"];
  let playerData = Array(NUM_PLAYERS).fill(null).map((_, i) => ({
    id: i,
    name: playerNames[i],
    totalPoints: 0,
    racesPlayed: 0,
  }));
  let isStarActive = false;
  let scoreHistory = []; // To store { cellElement, score, playerIndex, roundIndex, raceIndex, columnIndex }
  let nextCellToFill = null; // Holds the reference to the next TD element

// Reordered BIBD (v=6, k=4, λ=6) attempting to improve breaks
  const roundConfigurations = [
    [0, 1, 2, 3], // Round 1 (Sit: 4, 5)
    [0, 1, 4, 5], // Round 2 (Sit: 2, 3) - Players 0,1 play again; 4,5 start.
    [0, 2, 3, 4], // Round 3 (Sit: 1, 5) - Players 2,3 start; 0,4 play again.
    [1, 2, 3, 5], // Round 4 (Sit: 0, 4) - Players 1,5 start; 2,3 play again.
    [0, 1, 2, 4], // Round 5 (Sit: 3, 5) - Players 0,4 sit; 1,2 play again.
    [0, 1, 3, 5], // Round 6 (Sit: 2, 4) - Players 3,5 sit; 0,1 play again.
    [1, 2, 4, 5], // Round 7 (Sit: 0, 3) - Players 2,4 sit; 1,5 play again.
    [0, 2, 3, 5], // Round 8 (Sit: 1, 4) - Players 0,3 sit; 2,5 play again.
    [1, 3, 4, 5], // Round 9 (Sit: 0, 2) - Players 1,4 sit; 3,5 play again.
    [0, 2, 4, 5], // Round 10 (Sit: 1, 3) - Players 0,2 sit; 4,5 play again.
    [0, 1, 3, 4], // Round 11 (Sit: 2, 5) - Players 1,3 sit; 0,4 play again.
    [0, 1, 2, 5], // Round 12 (Sit: 3, 4) - Players 2,5 sit; 0,1 play again.
    [1, 2, 3, 4], // Round 13 (Sit: 0, 5) - Players 3,4 sit; 1,2 play again.
    [0, 3, 4, 5], // Round 14 (Sit: 1, 2) - Players 0,5 sit; 3,4 play again.
    [2, 3, 4, 5]  // Round 15 (Sit: 0, 1) - Players 1,2 sit; 3,4,5 play again.
  ];

  // --- DOM ELEMENTS ---
  const playerInputs = document.querySelectorAll('.player-name-input');
  const roundsContainer = document.getElementById('rounds-container');
  const scoreButtonsContainer = document.getElementById('score-buttons');
  const starButton = document.getElementById('star-btn');
  const revertButton = document.getElementById('revert-btn');
  const leaderboardBody = document.getElementById('leaderboard-body');

  // --- FUNCTIONS ---

  // Update player name in state, headers, and leaderboard
  function updatePlayerName(index, name) {
    playerNames[index] = name || `Player ${String.fromCharCode(65 + index)}`; // Default name if empty
    playerData[index].name = playerNames[index];

    // Update relevant table headers
    const headersToUpdate = document.querySelectorAll(`.round-table th[data-player-index="${index}"]`);
    headersToUpdate.forEach(th => {
      th.textContent = playerNames[index];
      th.title = playerNames[index]; // Tooltip for long names
    });

    // Update leaderboard
    renderLeaderboard();
  }

  // Create HTML for a single round table
  function createRoundTable(roundIndex, playerIndices) {
    const roundDiv = document.createElement('div');
    roundDiv.classList.add('round');
    roundDiv.innerHTML = `<h3>Round ${roundIndex + 1}</h3>`;

    const table = document.createElement('table');
    table.classList.add('round-table');
    table.setAttribute('data-round-index', roundIndex);

    // Table Header (Player Names)
    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    playerIndices.forEach((playerIndex, columnIndex) => {
      const th = document.createElement('th');
      th.textContent = playerNames[playerIndex];
      th.title = playerNames[playerIndex]; // Tooltip for long names
      th.setAttribute('data-player-index', playerIndex);
      th.setAttribute('data-column-index', columnIndex);
      headerRow.appendChild(th);
    });

    // Table Body (Score Cells)
    const tbody = table.createTBody();
    for (let race = 0; race < RACES_PER_ROUND; race++) {
      const bodyRow = tbody.insertRow();
      playerIndices.forEach((playerIndex, columnIndex) => {
        const td = bodyRow.insertCell();
        td.classList.add('score-cell');
        td.setAttribute('data-round-index', roundIndex);
        td.setAttribute('data-race-index', race);
        td.setAttribute('data-column-index', columnIndex);
        td.setAttribute('data-player-index', playerIndex); // Store player index on cell
        // Initially empty
      });
    }

    roundDiv.appendChild(table);
    roundsContainer.appendChild(roundDiv);
  }

  // Find the very next empty cell across all tables in order
  function findNextEmptyCell() {
    const allCells = document.querySelectorAll('.score-cell');
    for (const cell of allCells) {
      if (!cell.textContent.trim()) { // Check if cell is empty
        return cell;
      }
    }
    return null; // No empty cells left
  }

  // Highlight the next cell
  function highlightNextCell() {
    // Remove existing highlights
    document.querySelectorAll('.next-cell-highlight').forEach(cell => {
      cell.classList.remove('next-cell-highlight');
    });

    if (nextCellToFill) {
      nextCellToFill.classList.add('next-cell-highlight');
      // Scroll into view if needed (optional)
      // nextCellToFill.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }


  // Render the leaderboard table
  function renderLeaderboard() {
    // Clear existing rows
    leaderboardBody.innerHTML = '';

    // Sort players by total points (descending), then by average (descending)
    const sortedPlayers = [...playerData].sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      // Calculate average safely (handle division by zero)
      const avgA = a.racesPlayed === 0 ? 0 : a.totalPoints / a.racesPlayed;
      const avgB = b.racesPlayed === 0 ? 0 : b.totalPoints / b.racesPlayed;
      return avgB - avgA; // Higher average first
    });


    // Create and append rows
    sortedPlayers.forEach(player => {
      const row = leaderboardBody.insertRow();
      row.setAttribute('data-player-id', player.id); // Link row to player id

      const avgPoints = player.racesPlayed === 0 ? 0 : (player.totalPoints / player.racesPlayed);

      row.insertCell().textContent = player.name;
      row.insertCell().textContent = player.totalPoints;
      row.insertCell().textContent = player.racesPlayed;
      row.insertCell().textContent = avgPoints.toFixed(2); // Format average
    });
  }

  // Handle score button click
  function handleScoreButtonClick(event) {
    const place = parseInt(event.target.getAttribute('data-place'), 10);
    if (isNaN(place) || !POINTS_MAP[place]) return; // Invalid button

    if (!nextCellToFill) {
      alert("All race cells are filled!");
      return;
    }

    let score = POINTS_MAP[place];
    if (isStarActive) {
      score *= 2;
    }

    // Get player index from the cell's data attribute
    const playerIndex = parseInt(nextCellToFill.getAttribute('data-player-index'), 10);
    const roundIndex = parseInt(nextCellToFill.getAttribute('data-round-index'), 10);
    const raceIndex = parseInt(nextCellToFill.getAttribute('data-race-index'), 10);
    const columnIndex = parseInt(nextCellToFill.getAttribute('data-column-index'), 10);


    // Update cell
    nextCellToFill.textContent = score;
    nextCellToFill.classList.add('filled'); // Mark as filled

    // Update player data
    playerData[playerIndex].totalPoints += score;
    playerData[playerIndex].racesPlayed += 1;

    // Record history
    scoreHistory.push({
      cellElement: nextCellToFill,
      score: score,
      playerIndex: playerIndex,
      roundIndex: roundIndex,
      raceIndex: raceIndex,
      columnIndex: columnIndex
    });

    // Reset star button if it was used
    if (isStarActive) {
      isStarActive = false;
      starButton.classList.remove('active');
    }

    // Find the *new* next cell
    nextCellToFill = findNextEmptyCell();
    highlightNextCell();


    // Update UI
    renderLeaderboard();
    revertButton.disabled = false; // Enable revert button
  }

  // Handle Star Button click
  function toggleStar() {
    isStarActive = !isStarActive;
    starButton.classList.toggle('active', isStarActive);
  }

  // Handle Revert Button click
  function revertLastEntry() {
    if (scoreHistory.length === 0) return; // Nothing to revert

    const lastEntry = scoreHistory.pop();

    // Revert player data
    playerData[lastEntry.playerIndex].totalPoints -= lastEntry.score;
    playerData[lastEntry.playerIndex].racesPlayed -= 1;

    // Clear cell content and styling
    lastEntry.cellElement.textContent = '';
    lastEntry.cellElement.classList.remove('filled');

    // The reverted cell becomes the next cell to fill
    nextCellToFill = lastEntry.cellElement;
    highlightNextCell();

    // Reset star state just in case (though unlikely needed)
    isStarActive = false;
    starButton.classList.remove('active');

    // Update UI
    renderLeaderboard();
    revertButton.disabled = scoreHistory.length === 0; // Disable if history is now empty
  }


  // --- INITIALIZATION ---
  function initialize() {
    // 1. Setup Player Name Inputs
    playerInputs.forEach((input, index) => {
      input.value = playerNames[index]; // Set initial placeholder/value if needed
      input.addEventListener('input', (e) => {
        updatePlayerName(index, e.target.value);
      });
      // Also update on 'blur' in case someone tabs away
      input.addEventListener('blur', (e) => {
        if(!e.target.value.trim()){ // If input is empty on blur, restore default
          input.value = `Player ${String.fromCharCode(65 + index)}`;
          updatePlayerName(index, input.value);
        }
      });
    });

    // 2. Create Score Buttons
    for (let place = 1; place <= 12; place++) {
      const button = document.createElement('button');
      button.textContent = place;
      button.setAttribute('data-place', place);
      button.addEventListener('click', handleScoreButtonClick);
      scoreButtonsContainer.appendChild(button);
    }

    // 3. Add listeners for Star and Revert buttons
    starButton.addEventListener('click', toggleStar);
    revertButton.addEventListener('click', revertLastEntry);
    revertButton.disabled = true; // Initially disabled

    // 4. Create Round Tables
    roundConfigurations.forEach((playerIndices, roundIndex) => {
      createRoundTable(roundIndex, playerIndices);
    });

    // 5. Find the first cell to fill and highlight it
    nextCellToFill = findNextEmptyCell();
    highlightNextCell();


    // 6. Initial Leaderboard Render
    renderLeaderboard();
  }

  // --- Add Keyboard Shortcuts ---
  function handleKeyPress(event) {
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (activeElement.tagName === 'INPUT'); // Check if focus is on player name input

    // Handle Backspace for Revert: Only trigger Revert if NOT focused on an input field
    if (event.key === 'Backspace' && !isInputFocused) {
      event.preventDefault(); // Important: Prevent browser back navigation
      // Check if revert button is enabled before clicking
      if (!revertButton.disabled) {
        revertButton.click();
      }
      return; // Stop further processing for this key press
    }

    // For number and spacebar shortcuts, completely ignore if an input field has focus
    if (isInputFocused) {
      return;
    }

    // Handle numbers 1-9 for Score Buttons
    if (event.key >= '1' && event.key <= '9') {
      const place = parseInt(event.key, 10);
      // Find the button with the matching data-place attribute
      const scoreButton = document.querySelector(`#score-buttons button[data-place="${place}"]`);
      if (scoreButton) {
        event.preventDefault(); // Prevent typing the number if not in an input
        scoreButton.click();
      }
    }
    // Handle Spacebar for Star Button
    else if (event.key === ' ' || event.code === 'Space') { // Check 'key' and 'code' for cross-browser compatibility
      event.preventDefault(); // Prevent default spacebar action (like scrolling)
      starButton.click();
    }
  }

  // Add the listener to the whole window
  window.addEventListener('keydown', handleKeyPress);
  // --- End of Keyboard Shortcuts ---

  // Start the application
  initialize();

});