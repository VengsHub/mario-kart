const {createApp} = Vue;

const allRoundConfigurations = {
  3: Array(8).fill([0, 1, 2]),
  4: Array(8).fill([0, 1, 2, 3]),
  5: [
    [0, 1, 2, 3], [0, 1, 2, 4], [0, 1, 3, 4], [0, 2, 3, 4], [1, 2, 3, 4],
    [0, 1, 2, 3], [0, 1, 2, 4], [0, 1, 3, 4], [0, 2, 3, 4], [1, 2, 3, 4]
  ],
  6: [
    [1, 3, 4, 5], [0, 2, 3, 5], [0, 1, 2, 4], [1, 2, 3, 4],
    [0, 3, 4, 5], [0, 1, 2, 5], [1, 2, 4, 5], [0, 2, 3, 4],
    [0, 1, 3, 5], [1, 2, 3, 5], [0, 1, 3, 4], [0, 2, 4, 5]
  ]
};

const appConfig = {
  data() {
    return {
      RACES_PER_ROUND: 4,
      allRoundConfigurations: allRoundConfigurations,
      selectedPlayerCount: 6,
      playerData: [],
      scoresGrid: [],
      isStarActive: false,
      scoreHistory: [],
      nextCellCoords: null,
      resultsVisible: false,
    };
  },
  computed: {
    activeRoundConfiguration() {
      return this.allRoundConfigurations[this.selectedPlayerCount] || [];
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
        averagePoints: player.racesPlayed === 0 ? 0 : (player.totalPoints
          / player.racesPlayed)
      })).sort((a, b) =>
        a.averagePoints - b.averagePoints
      );
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
        name: this.playerData.at(i)?.name ?? `Player ${String.fromCharCode(
          65 + i)}`,
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
      document.querySelectorAll('#score-buttons button, #star-btn').forEach(
        btn => btn.disabled = controlsDisabled);
      const revertButton = document.getElementById('revert-btn');
      if (revertButton) {
        revertButton.disabled = this.scoreHistory.length === 0
          || this.resultsVisible;
      }
    },

    selectPlayerCount(count) {
      if (count === this.selectedPlayerCount) {
        return;
      }

      if (this.scoreHistory.length > 0) {
        if (!confirm(
          `Changing player count will reset the current tournament progress. Are you sure?`)) {
          return;
        }
      }
      this.selectedPlayerCount = count;
    },

    setDefaultNameIfEmpty(index) {
      if (this.playerData[index] && !this.playerData[index].name.trim()) {
        this.playerData[index].name = `Player ${String.fromCharCode(
          65 + index)}`;
      }
    },
    findNextCoords() {
      const currentConfig = this.activeRoundConfiguration;
      const numRounds = currentConfig.length;
      for (let round = 0; round < numRounds; round++) {
        const playersInRound = currentConfig[round]?.length || 0;
        for (let race = 0; race < this.RACES_PER_ROUND; race++) {
          for (let column = 0; column < playersInRound; column++) {
            if (this.scoresGrid[round]?.[race]?.[column] === null) {
              return {round, race, column};
            }
          }
        }
      }
      return null;
    },
    getCellScore(round, race, column) {
      const cellData = this.scoresGrid[round]?.[race]?.[column];
      return cellData ? cellData.place : null;
    },
    isNextCell(round, race, column) {
      return this.nextCellCoords &&
        this.nextCellCoords.round === round &&
        this.nextCellCoords.race === race &&
        this.nextCellCoords.column === column;
    },
    canBeSelected(place) {
      if (this.nextCellCoords) {
        const {round, race} = this.nextCellCoords;
        return !this.scoresGrid[round]?.[race].find(column =>
          column?.place === place
        );
      }
    },
    enterScore(place) {
      if (!this.nextCellCoords || !this.canBeSelected(place)) {
        return;
      }

      const coords = this.nextCellCoords;
      if (!this.activeRoundConfiguration[coords.round]) {
        return;
      }
      const playerIndex = this.activeRoundConfiguration[coords.round][coords.column];

      if (this.playerData[playerIndex] === undefined) {
        console.error("Invalid player index derived:", playerIndex,
          "for coords:", coords);
        return;
      }

      this.scoresGrid[coords.round][coords.race][coords.column] = {
        place,
        playerIndex
      };
      this.playerData[playerIndex].totalPoints += place;
      this.playerData[playerIndex].racesPlayed += 1;
      this.scoreHistory.push({coords, place, playerIndex});

      if (this.isStarActive) {
        this.toggleStar();
      }
      this.nextCellCoords = this.findNextCoords();
      this.updateButtonStates();

      if (this.nextCellCoords === null && !this.resultsVisible) {
        setTimeout(this.showResultsOverlay, 300);
      }
    },
    toggleStar() {
      this.isStarActive = !this.isStarActive;
    },
    revertLast() {
      if (this.scoreHistory.length === 0) {
        return;
      }
      if (this.resultsVisible) {
        this.hideResultsOverlay(false);
      }

      const lastEntry = this.scoreHistory.pop();
      const {coords, place, playerIndex} = lastEntry;

      if (this.playerData[playerIndex] === undefined) {
        console.error("Invalid player index found in history:", playerIndex);
        this.updateButtonStates();
        return;
      }

      this.playerData[playerIndex].totalPoints -= place;
      this.playerData[playerIndex].racesPlayed -= 1;
      this.scoresGrid[coords.round][coords.race][coords.column] = null;
      this.nextCellCoords = coords;

      if (this.isStarActive) {
        this.toggleStar();
      }
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
      const isInputFocused = activeElement && (activeElement.tagName
        === 'INPUT');

      if (event.key === 'Backspace' && !isInputFocused) {
        event.preventDefault();
        if (this.scoreHistory.length > 0 && !this.resultsVisible) {
          this.revertLast();
        }
        return;
      }
      if (isInputFocused || this.resultsVisible) {
        return;
      }

      if (event.key >= '1' && event.key <= '9') {
        const place = parseInt(event.key, 10);
        if (this.nextCellCoords) {
          event.preventDefault();
          this.enterScore(place);
        }
      } else if ((event.key === ' ' || event.code === 'Space')
        && this.nextCellCoords) {
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