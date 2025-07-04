const {createApp} = Vue;

const allTracks = [
  {name: 'Mario Bros. Circuit', left: '60px', top: '194px'},
  {name: 'Crown City', left: '126px', top: '237px'},
  {name: 'Whistlestop Summit', left: '63px', top: '270px'},
  {name: 'DK Spaceport', left: '131px', top: '288px'},
  {name: 'Desert Hills', left: '11px', top: '232px'},
  {name: 'Shy Guy Bazaar', left: '14px', top: '157px'},
  {name: 'Wario Stadium', left: '73px', top: '127px'},
  {name: 'Airship Fortress', left: '24px', top: '86px'},
  {name: 'DK Pass', left: '280px', top: '131px'},
  {name: 'Starview Peak', left: '282px', top: '58px'},
  {name: 'Sky-High Sundae', left: '330px', top: '96px'},
  {name: 'Wario Shipyard', left: '336px', top: '171px'},
  {name: 'Koopa Troopa Beach', left: '176px', top: '276px'},
  {name: 'Faraway Oasis', left: '232px', top: '229px'},
  {name: 'Peach Beach', left: '333px', top: '229px'},
  {name: 'Salty Salty Speedway', left: '282px', top: '198px'},
  {name: 'Dino Dino Jungle', left: '243px', top: '297px'},
  {name: 'Great ? Block Ruins', left: '297px', top: '274px'},
  {name: 'Cheep Cheep Falls', left: '234px', top: '164px'},
  {name: 'Dandelion Depths', left: '230px', top: '105px'},
  {name: 'Boo Cinema', left: '237px', top: '30px'},
  {name: 'Dry Bones Burnout', left: '126px', top: '34px'},
  {name: 'Moo Moo Meadows', left: '179px', top: '127px'},
  {name: 'Choco Mountain', left: '123px', top: '164px'},
  {name: 'Toad\'s Factory', left: '130px', top: '98px'},
  {name: 'Bowser\'s Castle', left: '76px', top: '34px'},
  {name: 'Acorn Heights', left: '177px', top: '7px'},
  {name: 'Mario Circuit', left: '181px', top: '69px'},
  {name: 'Peach Stadium', left: '178px', top: '184px'},
  {name: 'Rainbow Road', left: '178px', top: '234px'}
];
const lastSelectedTracks = [];

const allRoundConfigurations = {
  3: rounds => Array(+rounds).fill([0, 1, 2]),
  4: rounds => Array(+rounds).fill([0, 1, 2, 3]),
  5: rounds => Array(Math.floor(Math.max(5, +rounds) / 5)).fill([
    [0, 1, 2, 3], [0, 1, 2, 4], [0, 1, 3, 4], [0, 2, 3, 4], [1, 2, 3, 4]
  ]).flat(),
  6: rounds => [
    [2, 3, 4, 5], [0, 1, 4, 5], [0, 1, 2, 3],
    [1, 3, 4, 5], [0, 2, 3, 5], [0, 1, 2, 4],
    [1, 2, 4, 5], [0, 2, 3, 4], [0, 1, 3, 5],
    [1, 2, 3, 5], [0, 2, 4, 5], [0, 1, 3, 4],
    [1, 2, 3, 4], [0, 3, 4, 5], [0, 1, 2, 5]
  ].slice(0, Math.floor(Math.max(3, +rounds) / 3) * 3),
  7: rounds => Array(Math.floor(Math.max(7, +rounds) / 7)).fill([
    [0, 1, 2, 4], [1, 2, 3, 5], [2, 3, 4, 6], [3, 4, 5, 0], [4, 5, 6, 1], [5, 6, 0, 2], [6, 0, 1, 3],
  ]).flat(),
  8: rounds => [
    [0, 1, 2, 3], [4, 5, 6, 7], [0, 2, 4, 6], [1, 3, 5, 7], [0, 1, 5, 6], [2, 3, 4, 7],
    [0, 4, 1, 5], [2, 6, 3, 7], [0, 3, 4, 7], [1, 2, 5, 6], [0, 6, 1, 7], [2, 4, 3, 5],
    [0, 1, 3, 4], [2, 5, 6, 7], [0, 5, 2, 7], [1, 4, 3, 6], [0, 2, 5, 7], [1, 3, 4, 6],
    [0, 4, 2, 5], [1, 6, 3, 7], [0, 3, 1, 6], [2, 4, 5, 7], [0, 7, 1, 4], [2, 5, 3, 6]
  ].slice(0, Math.floor(Math.max(6, +rounds) / 6) * 6),
};

const appConfig = {
  data() {
    return {
      POINTS_MAP: {
        1: 13, 2: 11, 3: 10, 4: 9, 5: 9, 6: 8,
        7: 8, 8: 7, 9: 7, 10: 6, 11: 6, 12: 6,
        13: 5, 14: 5, 15: 5, 16: 4, 17: 4, 18: 4,
        19: 3, 20: 3, 21: 3, 22: 2, 23: 2, 24: 1
      },
      PLACES_MAP: {
        13: '1st', 11: '2nd', 10: '3rd', 9: '4/5th',
        8: '6/7th', 7: '8/9th', 6: '10-12th', 5: '13-15th',
        4: '16-18th', 3: '19-21th', 2: '22/23th', 1: '24th'
      },
      allRoundConfigurations: allRoundConfigurations,
      playerCount: 6,
      playerData: Array(8).fill(null).map((_, i) => ({
        id: i,
        name: `Player ${String.fromCharCode(65 + i)}`,
        totalPoints: 0,
        racesPlayed: 0,
      })),
      totalRounds: 15,
      racesPerRound: 4,
      enteredScores: {},
      currentTrack: this.getRandomTrack(2 * this.racesPerRound),
      scoreHistory: [],
      resultsVisible: false,
      doneConfiguring: false
    };
  },
  computed: {
    possibleRoundCount() {
      switch (this.playerCount) {
        case 1:
        case 2:
        case 3:
        case 4:
          return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
        case 5:
          return [5, 10, 15];
        case 6:
          return [3, 6, 9, 12, 15];
        case 7:
          return [7, 14];
        case 8:
          return [6, 12, 18, 24];
      }
    },
    activeRoundConfiguration() {
      return this.allRoundConfigurations[this.playerCount](this.totalRounds) || [];
    },
    nextCellCoords() {
      const currentConfig = this.activeRoundConfiguration;
      const numRounds = currentConfig.length;

      for (let roundIndex = 0; roundIndex < numRounds; roundIndex++) {
        const playersInRound = currentConfig[roundIndex]?.length || 0;
        for (let raceIndex = 0; raceIndex < this.racesPerRound; raceIndex++) {
          for (let columnIndex = 0; columnIndex < playersInRound; columnIndex++) {
            if (!this.enteredScores[roundIndex] ||
              !this.enteredScores[roundIndex][raceIndex] ||
              !this.enteredScores[roundIndex][raceIndex][columnIndex]) {
              return {round: roundIndex, race: raceIndex, col: columnIndex};
            }
          }
        }
      }
      return null;
    },
    rankedPlayers() {
      return [...this.playerData].slice(0, this.playerCount).map(player => ({
        ...player,
        averagePoints: player.racesPlayed === 0 ? 0
          : (player.totalPoints / player.racesPlayed)
      })).sort((a, b) => {
        if (b.averagePoints !== a.averagePoints) {
          return b.averagePoints - a.averagePoints;
        }
        return b.averagePoints - a.averagePoints;
      });
    },
    podiumPlayers() {
      return this.rankedPlayers.slice(0, 3);
    }
  },
  methods: {
    getRandomTrack(cooldown = 8) {
      const tracksToIgnore = lastSelectedTracks.slice(-cooldown);

      const eligibleTracks = allTracks.filter(track => !tracksToIgnore.includes(track.name));

      const randomIndex = Math.floor(Math.random() * eligibleTracks.length);
      const selectedTrack = eligibleTracks[randomIndex];

      lastSelectedTracks.push(selectedTrack.name);

      if (lastSelectedTracks.length > cooldown) {
        lastSelectedTracks.shift();
      }

      return selectedTrack;
    },
    selectPlayerCount(count) {
      if (count === this.playerCount) {
        return;
      }

      if (this.scoreHistory.length > 0) {
        if (!confirm(`Changing player count will reset the current tournament progress. Are you sure?`)) {
          return;
        }
      }
      this.playerCount = count;
      this.totalRounds = this.possibleRoundCount.at(0);
    },
    setDefaultNameIfEmpty(index) {
      if (this.playerData[index] && !this.playerData[index].name.trim()) {
        this.playerData[index].name = `Player ${String.fromCharCode(65 + index)}`;
      }
    },
    getCell(roundIndex, raceIndex, columnIndex) {
      return this.enteredScores[roundIndex]?.[raceIndex]?.[columnIndex] ?? null;
    },
    isNextCell(roundIndex, raceIndex, columnIndex) {
      return this.nextCellCoords &&
        this.nextCellCoords.round === roundIndex &&
        this.nextCellCoords.race === raceIndex &&
        this.nextCellCoords.col === columnIndex;
    },
    enterScore(place) {
      if (!this.nextCellCoords || !this.POINTS_MAP[place] || !this.canBeSelected(place)) {
        return;
      }

      const coords = this.nextCellCoords;
      if (!this.activeRoundConfiguration[coords.round]) {
        return;
      }
      const playerIndex = this.activeRoundConfiguration[coords.round][coords.col];

      if (this.playerData[playerIndex] === undefined) {
        console.error("Invalid player index derived:", playerIndex, "for coords:", coords);
        return;
      }

      let score = this.POINTS_MAP[place];

      if (!this.enteredScores[coords.round]) {
        this.enteredScores[coords.round] = {};
      }
      if (!this.enteredScores[coords.round][coords.race]) {
        this.enteredScores[coords.round][coords.race] = {};
      }
      this.enteredScores[coords.round][coords.race][coords.col] = {
        score,
        playerIndex,
        place
      };

      const playerRound = Math.floor(this.playerData[playerIndex].racesPlayed / 4);
      const roundedBonusPoints = Math.round(playerRound * 0.1 * score * 10) / 10;
      score += roundedBonusPoints;
      this.playerData[playerIndex].totalPoints += score;
      this.playerData[playerIndex].racesPlayed += 1;
      this.scoreHistory.push({coords, score, playerIndex});

      if (this.nextCellCoords === null && !this.resultsVisible) {
        setTimeout(this.showResultsOverlay, 300);
      }
    },
    canBeSelected(place) {
      if (this.nextCellCoords) {
        const {round, race} = this.nextCellCoords;
        const raceEntries = this.enteredScores[round]?.[race];
        if (raceEntries) {
          for (const colKey in raceEntries) {
            if (raceEntries[colKey]?.place === place) {
              return false;
            }
          }
        }
      }
      return true;
    },
    revertLast() {
      if (this.scoreHistory.length === 0) {
        return;
      }
      const lastEntry = this.scoreHistory.pop();
      const {coords, score, playerIndex} = lastEntry;

      this.playerData[playerIndex].totalPoints -= score;
      this.playerData[playerIndex].racesPlayed -= 1;

      if (this.enteredScores[coords.round] &&
        this.enteredScores[coords.round][coords.race] &&
        this.enteredScores[coords.round][coords.race][coords.col]) {
        delete this.enteredScores[coords.round][coords.race][coords.col];

        if (Object.keys(this.enteredScores[coords.round][coords.race]).length === 0) {
          delete this.enteredScores[coords.round][coords.race];
        }
        if (Object.keys(this.enteredScores[coords.round]).length === 0) {
          delete this.enteredScores[coords.round];
        }
      }
    },
    showResultsOverlay() {
      this.resultsVisible = true;
    },
    hideResultsOverlay() {
      this.resultsVisible = false;
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
      if (isInputFocused || this.resultsVisible) {
        return;
      }

      if (event.key >= '1' && event.key <= '9' && this.nextCellCoords) {
        const place = parseInt(event.key, 10);
        event.preventDefault();
        this.enterScore(place);
      }
    },
    handleBeforeUnload(event) {
      if (this.scoreHistory.length > 0 && !this.resultsVisible) {
        event.preventDefault();
        event.returnValue = '';
      }
    }
  },
  mounted() {
    window.addEventListener('keydown', this.handleGlobalKeyPress);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleGlobalKeyPress);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
  }
};

createApp(appConfig).mount('#app');