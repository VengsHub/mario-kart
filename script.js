const { createApp } = Vue;

const allRoundConfigurations = {
  3: rounds => Array(+rounds).fill([0, 1, 2]),
  4: rounds => Array(+rounds).fill([0, 1, 2, 3]),
  5: rounds => Array(Math.floor(Math.max(5, +rounds) / 5)).fill([
    [0, 1, 2, 3], [0, 1, 2, 4], [0, 1, 3, 4], [0, 2, 3, 4], [1, 2, 3, 4]
  ]).flat(),
  6: rounds => [
    [2,3,4,5], [0,1,4,5], [0,1,2,3],
    [1,3,4,5], [0,2,3,5], [0,1,2,4],
    [1,2,4,5], [0,2,3,4], [0,1,3,5],
    [1,2,3,5], [0,2,4,5], [0,1,3,4],
    [1,2,3,4], [0,3,4,5], [0,1,2,5]
  ].slice(0, Math.floor(Math.max(3, +rounds) / 3) * 3)
};

const appConfig = {
  data() {
    return {
      RACES_PER_ROUND: 4,
      POINTS_MAP: {
        1: 13, 2: 11, 3: 10, 4: 9, 5: 8, 6: 7,
        7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1
      },
      PLACES_MAP: {
        13: '1st', 11: '2nd', 10: '3rd', 9: '4th',
        8: '5th', 7: '6th', 6: '7th', 5: '8th',
        4: '9th', 3: '10th', 2: '11th', 1: '12th'
      },
      allRoundConfigurations: allRoundConfigurations,
      selectedPlayerCount: 6,
      selectedRoundCount: 15,
      playerData: [],
      scoresGrid: [],
      isStarActive: false,
      scoreHistory: [],
      nextCellCoords: null,
      resultsVisible: false,
      multiplier: 0
    };
  },
  computed: {
    activeRoundConfiguration() {
      return this.allRoundConfigurations[this.selectedPlayerCount](this.selectedRoundCount) || [];
    },
    numRounds() {
      return this.activeRoundConfiguration.length;
    },
    playersPerRound() {
      return this.activeRoundConfiguration[0]?.length || 0;
    },
    rankedPlayers() {
      return [...this.playerData].map(player => ({
        ...player,
        averagePoints: player.racesPlayed === 0 ? 0 : (player.totalPoints / player.racesPlayed)
      })).sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) {
          return b.totalPoints - a.totalPoints;
        }
        return b.averagePoints - a.averagePoints;
      });
    },
    podiumPlayers() {
      return this.rankedPlayers.slice(0, 3);
    }
  },
  methods: {
    resetGameForPlayerCount(count) {
      this.selectedPlayerCount = count;

      this.playerData = Array(count).fill(null).map((_, i) => ({
        id: i,
        name: this.playerData.at(i)?.name ?? `Player ${String.fromCharCode(65 + i)}`,
        totalPoints: 0,
        racesPlayed: 0,
      }));

      this.initializeScoresGrid();
      this.scoreHistory = [];
      this.isStarActive = false;
      this.resultsVisible = false;

      this.nextCellCoords = this.findNextCoords();

      this.updateButtonStates();

      if (this.resultsVisible) {
        this.hideResultsOverlay(false);
      }
      this.$nextTick(() => {
        this.updateButtonStates();
      });
    },
    initializeScoresGrid() {
      this.scoresGrid = this.activeRoundConfiguration.map((roundPlayers) => (
        Array(this.RACES_PER_ROUND).fill(null).map(() => (
          Array(roundPlayers.length).fill(null)
        ))
      ));
    },
    updateButtonStates() {
      const controlsDisabled = !this.nextCellCoords || this.resultsVisible;
      document.querySelectorAll('#score-buttons button, #star-btn').forEach(btn => btn.disabled = controlsDisabled);
      const revertButton = document.getElementById('revert-btn');
      if (revertButton) revertButton.disabled = this.scoreHistory.length === 0 || this.resultsVisible;
    },

    selectPlayerCount(count) {
      if (count === this.selectedPlayerCount) return;

      if (this.scoreHistory.length > 0) {
        if (!confirm(`Changing player count will reset the current tournament progress. Are you sure?`)) {
          return;
        }
      }
      this.selectedPlayerCount = count;
    },

    setDefaultNameIfEmpty(index) {
      if (this.playerData[index] && !this.playerData[index].name.trim()) {
        this.playerData[index].name = `Player ${String.fromCharCode(65 + index)}`;
      }
    },
    findNextCoords() {
      const currentConfig = this.activeRoundConfiguration;
      const numRounds = currentConfig.length;
      for (let roundIndex = 0; roundIndex < numRounds; roundIndex++) {
        const playersInRound = currentConfig[roundIndex]?.length || 0;
        for (let raceIndex = 0; raceIndex < this.RACES_PER_ROUND; raceIndex++) {
          for (let columnIndex = 0; columnIndex < playersInRound; columnIndex++) {
            if (this.scoresGrid[roundIndex]?.[raceIndex]?.[columnIndex] === null) {
              return { round: roundIndex, race: raceIndex, col: columnIndex };
            }
          }
        }
      }
      return null;
    },
    getCell(roundIndex, raceIndex, columnIndex) {
      const cellData = this.scoresGrid[roundIndex]?.[raceIndex]?.[columnIndex];
      return cellData ?? null;
    },
    isNextCell(roundIndex, raceIndex, columnIndex) {
      return this.nextCellCoords &&
        this.nextCellCoords.round === roundIndex &&
        this.nextCellCoords.race === raceIndex &&
        this.nextCellCoords.col === columnIndex;
    },
    enterScore(place) {
        if (!this.nextCellCoords || !this.POINTS_MAP[place] || !this.canBeSelected(place)) return;

      const coords = this.nextCellCoords;
      if (!this.activeRoundConfiguration[coords.round]) return;
      const playerIndex = this.activeRoundConfiguration[coords.round][coords.col];

      if(this.playerData[playerIndex] === undefined) {
        console.error("Invalid player index derived:", playerIndex, "for coords:", coords);
        return;
      }

      let score = this.POINTS_MAP[place];

      this.scoresGrid[coords.round][coords.race][coords.col] = { score, playerIndex, star: this.isStarActive };
      if (this.isStarActive) score *= 2;
      score += coords.round * this.multiplier * score;
      this.playerData[playerIndex].totalPoints += score;
      this.playerData[playerIndex].racesPlayed += 1;
      this.scoreHistory.push({ coords, score, playerIndex });

      if (this.isStarActive) this.toggleStar();
      this.nextCellCoords = this.findNextCoords();
      this.updateButtonStates();

      if (this.nextCellCoords === null && !this.resultsVisible) {
        setTimeout(this.showResultsOverlay, 300);
      }
    },
    canBeSelected(place) {
      if (this.nextCellCoords) {
        const {round, race} = this.nextCellCoords;
        return !this.scoresGrid[round]?.[race].find(column =>
          column?.score === this.POINTS_MAP[place]
        );
      }
    },
    toggleStar() {
      this.isStarActive = !this.isStarActive;
    },
    revertLast() {
      if (this.scoreHistory.length === 0) return;
      if (this.resultsVisible) this.hideResultsOverlay(false);

      const lastEntry = this.scoreHistory.pop();
      const { coords, score, playerIndex, star } = lastEntry;

      if(this.playerData[playerIndex] === undefined) {
        console.error("Invalid player index found in history:", playerIndex);
        this.updateButtonStates();
        return;
      }

      this.playerData[playerIndex].totalPoints -= star ? 2 * score : score;
      this.playerData[playerIndex].racesPlayed -= 1;
      this.scoresGrid[coords.round][coords.race][coords.col] = null;
      this.nextCellCoords = coords;

      if (this.isStarActive) this.toggleStar();
      this.updateButtonStates();
    },
    showResultsOverlay() {
      this.resultsVisible = true;
      this.updateButtonStates();
    },
    hideResultsOverlay(enableControls = true) {
      this.resultsVisible = false;
      if (enableControls) {
        this.$nextTick(() => {
          this.updateButtonStates();
        });
      }
    },
    handleGlobalKeyPress(event) {
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (activeElement.tagName === 'INPUT');

      if (event.key === 'Backspace' && !isInputFocused) {
        event.preventDefault();
        if (this.scoreHistory.length > 0 && !this.resultsVisible) {
          this.revertLast();
        }
        return;
      }
      if (isInputFocused || this.resultsVisible) return;

      if (event.key >= '1' && event.key <= '9') {
        const place = parseInt(event.key, 10);
        if(this.nextCellCoords) {
          event.preventDefault();
          this.enterScore(place);
        }
      } else if ((event.key === ' ' || event.code === 'Space') && this.nextCellCoords) {
        event.preventDefault();
        this.toggleStar();
      }
    },
    handleBeforeUnload(event) {
      if (this.scoreHistory.length > 0 && !this.resultsVisible) {
        event.preventDefault();
        event.returnValue = '';
      }
    }
  },
  watch: {
    selectedPlayerCount(newCount, oldCount) {
      if (newCount !== oldCount) {
        this.resetGameForPlayerCount(newCount);
      }
    }
  },
  mounted() {
    this.resetGameForPlayerCount(this.selectedPlayerCount);

    window.addEventListener('keydown', this.handleGlobalKeyPress);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleGlobalKeyPress);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
  }
};

createApp(appConfig).mount('#app');