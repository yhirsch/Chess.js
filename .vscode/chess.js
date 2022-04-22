

const chessboardParent = document.getElementById("chessboard");

class Chess {
  constructor() {
    this.setDefault();
  }

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
    this.data.board = new Board(this);
    this.data.board.create();


    await this.assignPlayers();

    // ensure that players is ready
    await this.data.players[0].init(this);
    await this.data.players[1].init(this);

    callback && callback.call(this);
  }
  async assignPlayers() {
    return new Promise((resolve) => {
      const player1 = new Player({ username: "P1", id: 1, role: "white" }); 
      const player2 = new Player({ username: "P2", id: 2, role: "black" }); 

      this.data.players = [player1, player2];


      this.info.turn = player1;
      player1.info.isTurn = true;

      resolve(); // return
    });
  }
  start() {
    this.info.started = true;
    this.info.ended = false;
    this.info.won = false;

    this.data.board.placePiecesAsDefault();

  }

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


  testMove(piece, square) {
    const board = this.data.board;
    piece = board.filterPiece(this, piece); // filter piece
    square = board.filterSquare(square); // filter square

    if (!piece || !square) return false;
    const backup = { square: piece.square, piece: square.piece }; // back up current data
    let player = backup.piece ? backup.piece.player : null;
    let pieces = backup.piece ? player.data.pieces : null;
    let index = backup.piece ? pieces.indexOf(backup.piece) : null; // if there's piece inside store
    let status = false;

    // if there is piece, remove it from the board
    index && pieces.splice(index, 1);
    piece.silentMove(square);
    status = this.data.board.analyze(); 
    piece.silentMove(backup.square);
    square.piece = backup.piece;
    index && pieces.splice(index, 0, backup.piece);

    return status;
  }
// After the player moves
moved(...param) {
  this.data.board.resetSquares(); 
  this.data.board.setMovedSquare(...param);
  this.changeTurn(); 
  this.notify(); 
  this.isMate(); 
  this.updatePlayers(); 
}

isReady() {
  return this.info.started && !this.info.ended && !this.info.won;
} 
isMate() {
  const playerTurn = this.info.turn; // turning player
  const pieces = playerTurn.data.pieces; // player pieces
  const King = this.data.board.findPiece(pieces, "King", true); // find a king
  const moves = []; // store the possible moves

  if (playerTurn.info.isChecked) {
    for (const piece of pieces) {
      for (const square of piece.getPossibilities().moves) {
        if (this.testMove(piece, square)) {
          // if move was successful
          // insert that move into moves array
          moves.push(piece);
        }
      }
    }
    if (!moves.length && !King.getPossibleSqOnly()) {
      this.checkmate(this.switchTurn(playerTurn));
      return true;
    }
  }
}
}
class Board {
	constructor(game) {
		this.default = {
			col_row: 8, // col len
			col: ["a", "b", "c", "d", "e", "f", "g", "h"], // col literals
			row: [8, 7, 6, 5, 4, 3, 2, 1], // row literals
		};

		this.game = game; // the game
		this.data = []; // empty data values
	}

  // create ui
	create() {
		const col_row = this.default.col_row;
		const col = this.default.col;
		const row = this.default.row;

		let role = "white"; // start with white

    	// change role
		const setRole = () => {
			return (role = role == "white" ? "black" : "white");
		};

		for (let r = 0; r < col_row; r++) {
			const squares = []; // store all the square
			for (let c = 0; c < col_row; c++) {
				const letter = col[c];
				const number = row[r];
				const position = `${letter}${number}`; // new position
				const boardPos = { y: r, x: c };
				const square = new Square(boardPos, position, setRole(), this.game); // new square

				squares.push(square); // push the square
			}

			this.data.push(squares) && setRole(); // push the squares in the board data
		}
	}
	placePiecesAsDefault() {
		const board = this;
		const game = this.game; // the game
		const players = game.data.players; // all player

    const place = function (piece) {
			const position = piece.info.position; 
			const square = board.filterSquare(position); 
			const pieceElement = piece.info.element; 
			const squareElement = square.info.element; 

			piece.square = square; 
			square.piece = piece; 

			squareElement.appendChild(pieceElement); // append the image to the square el
		};
    players.forEach((player) => player.data.pieces.forEach(place));

  }
}