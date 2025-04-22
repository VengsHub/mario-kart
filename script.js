const { createApp } = Vue;

const appConfig = {
  data() {
    return {
      NUM_PLAYERS: 6,
      NUM_ROUNDS: 15,
      RACES_PER_ROUND: 4,
      PLAYERS_PER_ROUND: 4,
      POINTS_MAP: {
        1: 15, 2: 12, 3: 10, 4: 9, 5: 8, 6: 7,
        7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1
      },
      roundConfigurations: [
        [0, 1, 2, 3], [0, 1, 4, 5], [0, 2, 3, 4], [1, 2, 3, 5], [0, 1, 2, 4],
        [0, 1, 3, 5], [1, 2, 4, 5], [0, 2, 3, 5], [1, 3, 4, 5], [0, 2, 4, 5],
        [0, 1, 3, 4], [0, 1, 2, 5], [1, 2, 3, 4], [0, 3, 4, 5], [2, 3, 4, 5]
      ],
      playerData: Array(6).fill(null).map((_, i) => ({
        id: i,
        name: `Player ${String.fromCharCode(65 + i)}`,
        totalPoints: 0,
        racesPlayed: 0,
      })),
      scoresGrid: [],
      isStarActive: false,
      scoreHistory: [],
      nextCellCoords: null,
      resultsVisible: false,
    };
  },
  computed: {
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
    initializeScoresGrid() {
      this.scoresGrid = this.roundConfigurations.map((roundPlayers, roundIndex) => (
        Array(this.RACES_PER_ROUND).fill(null).map((_, raceIndex) => (
          Array(this.PLAYERS_PER_ROUND).fill(null)
        ))
      ));
    },
    setDefaultNameIfEmpty(index) {
      if (!this.playerData[index].name.trim()) {
        this.playerData[index].name = `Player ${String.fromCharCode(65 + index)}`;
      }
    },
    findNextCoords() {
      for (let roundIndex = 0; roundIndex < this.NUM_ROUNDS; roundIndex++) {
        for (let raceIndex = 0; raceIndex < this.RACES_PER_ROUND; raceIndex++) {
          for (let columnIndex = 0; columnIndex < this.PLAYERS_PER_ROUND; columnIndex++) {
            if (this.scoresGrid[roundIndex] && this.scoresGrid[roundIndex][raceIndex] && this.scoresGrid[roundIndex][raceIndex][columnIndex] === null) {
              console.log({ round: roundIndex, race: raceIndex, col: columnIndex });
              return { round: roundIndex, race: raceIndex, col: columnIndex };
            }
          }
        }
      }
      return null;
    },
    getCellScore(roundIndex, raceIndex, columnIndex) {
      const cellData = this.scoresGrid[roundIndex]?.[raceIndex]?.[columnIndex];
      return cellData ? cellData.score : null;
    },
    isNextCell(roundIndex, raceIndex, columnIndex) {
      return this.nextCellCoords &&
        this.nextCellCoords.round === roundIndex &&
        this.nextCellCoords.race === raceIndex &&
        this.nextCellCoords.col === columnIndex;
    },
    enterScore(place) {
      if (!this.nextCellCoords || !this.POINTS_MAP[place]) return;

      const coords = this.nextCellCoords;
      const playerIndex = this.roundConfigurations[coords.round][coords.col];
      let score = this.POINTS_MAP[place];

      if (this.isStarActive) {
        score *= 2;
      }

      this.scoresGrid[coords.round][coords.race][coords.col] = { score, playerIndex };
      this.playerData[playerIndex].totalPoints += score;
      this.playerData[playerIndex].racesPlayed += 1;
      this.scoreHistory.push({ coords, score, playerIndex });

      if (this.isStarActive) {
        this.toggleStar();
      }
      this.nextCellCoords = this.findNextCoords();

      if (this.nextCellCoords === null && !this.resultsVisible) {
        setTimeout(this.showResultsOverlay, 300);
      }
    },
    toggleStar() {
      this.isStarActive = !this.isStarActive;
    },
    revertLast() {
      if (this.scoreHistory.length === 0) return;

      const lastEntry = this.scoreHistory.pop();
      const { coords, score, playerIndex } = lastEntry;

      this.playerData[playerIndex].totalPoints -= score;
      this.playerData[playerIndex].racesPlayed -= 1;
      this.scoresGrid[coords.round][coords.race][coords.col] = null;
      this.nextCellCoords = coords;

      if (this.isStarActive) {
        this.toggleStar();
      }

      if(this.resultsVisible) {
        this.hideResultsOverlay(false);
      }
    },
    showResultsOverlay() {
      this.resultsVisible = true;
      document.querySelectorAll('#score-buttons button, #revert-btn, #star-btn').forEach(btn => btn.disabled = true);
    },
    hideResultsOverlay(enableControls = true) {
      this.resultsVisible = false;
      if(enableControls && this.nextCellCoords !== null){
        document.querySelectorAll('#score-buttons button, #star-btn').forEach(btn => btn.disabled = false);
        const revertButton = document.getElementById('revert-btn');
        if(revertButton) revertButton.disabled = this.scoreHistory.length === 0;
      }
    },
    handleGlobalKeyPress(event) {
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (activeElement.tagName === 'INPUT');

      if (event.key === 'Backspace' && !isInputFocused) {
        event.preventDefault();
        if (this.scoreHistory.length > 0) {
          this.revertLast();
        }
        return;
      }

      if (isInputFocused) {
        return;
      }

      if (event.key >= '1' && event.key <= '9') {
        const place = parseInt(event.key, 10);
        event.preventDefault();
        this.enterScore(place);
      } else if ((event.key === ' ' || event.code === 'Space') && this.nextCellCoords) {
        event.preventDefault();
        this.toggleStar();
      }
    },
    handleBeforeUnload(event) {
      if(this.scoreHistory.length > 0 && this.nextCellCoords !== null) {
        event.preventDefault();
        event.returnValue = '';
      }
    }
  },
  mounted() {
    console.log("Vue app mounted");
    this.initializeScoresGrid();
    this.nextCellCoords = this.findNextCoords();
    window.addEventListener('keydown', this.handleGlobalKeyPress);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleGlobalKeyPress);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
  }
};

createApp(appConfig).mount('#app');