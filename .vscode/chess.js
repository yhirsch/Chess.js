

const chessboardParent = document.getElementById("chessboard");

// Chess Game
class Chess {
	constructor() {
		this.setDefault();
	}

	// set chess info as default
	setDefault() {
		this.info = {
		
		};

		this.data = {
			players: [], 
			board: null,
		};
	}

	// initialize game
	async init(callback) {
		// create new board
		this.data.board = new Board(this);
		// then create board elements
		this.data.board.create();

	
		await this.assignPlayers();

		// make sure that players is ready
		await this.data.players[0].init(this);
		await this.data.players[1].init(this);

		callback && callback.call(this);
	}

	// assign players (player1,player2)
//add assign players

	// game start
	start() {
		this.info.started = true;
		this.info.ended = false;
		this.info.won = false;

		this.data.board.placePiecesAsDefault();
		
	}



	// end the game
	checkmate(player) {
		this.info.started = false;
		this.info.ended = true;
		this.info.won = player;

		console.log(`${this.info.turn.data.username} is Mate`);

		this.winner();
	}

	updatePlayers() {
		this.data.players.forEach((player) => player.update());
	}

	checkedPlayer() {
		const players = this.data.players;
		return players.filter((player) => {
			return player.info.isChecked == true;
		})[0];
	}

	// change turning player
	changeTurn() {
		const turn = this.info.turn;
		const players = this.data.players;
		this.info.turn = players.filter((p, index) => {
			return players.indexOf(turn) != index;
		})[0];
	}

	// switch player into another player
	switchTurn(player) {
		const players = this.data.players;
		return players.filter((p, index) => {
			return players.indexOf(player) != index;
		})[0];
	}


