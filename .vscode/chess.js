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
	// get all players possibilities
	// enemies, moves and castling
	getAllPossibilities() {
		const players = this.game.data.players; // players
		const white = players[0].analyze(); // player 1
		const black = players[1].analyze(); // player 2

		return { white, black };
	}

	// analyze the board
	analyze() {
		let status = true; // stat
		let turnPlayer = this.game.info.turn;
		let AP = this.getAllPossibilities(); // all player possibilities
		let entries = Object.entries(AP); // convert as object

		// loop through players and collect their enemies
		for (let data of entries) {
			const King = this.findPiece(data[1].enemies, "King");
			if (King) {
				King.player.info.isChecked = true;
				// if the turn player role is equal to the king player role
				if (turnPlayer.data.role != data[0]) {
					status = false; // set as false
					King.player.info.isChecked = false;
				}
				break;
			}
		}

		return status;
	}

	// setting classess and possiblities
	setSquarePossibilities(possibilities, insertUI) {
		if (!possibilities) return;
		let { moves, enemies, castling } = possibilities;

		// reset first
		this.resetSquares();

		// then set square properties according to possibilities values
		moves.forEach((square) => square.setAs("move", true, insertUI));
		enemies.forEach((square) => square.setAs("enemy", true, insertUI));
		castling.forEach((square) => square.setAs("castling", true, insertUI));
	}

	// remove all class from all squares
	resetSquares() {
		for (let squares of this.data) {
			for (let square of squares) {
				square.setAs("move", false, true);
				square.setAs("enemy", false, true);
				square.setAs("castling", false, true);
				square.setAs("from", false, true);
				square.setAs("to", false, true);
			}
		}
	}

	setMovedSquare(from, to) {
		from.setAs("from", true, true);
		to.setAs("to", true, true);
	}
	isValidPos(y, x) {
		return this.data[y] ? this.data[y][x] : false;
	}
	filterSquare(sq) {
		// check if it is already an object
		if (!sq || typeof sq == "object") return sq;

		// loop in board
		for (let squares of this.data) {
			// loop through the squares
			for (let square of squares) {
				// check if square the position is equal to the given pos
				if (square.info.position == sq) {
					return square;
				}
			}
		}
	}
	filterPiece(player, piece) {
		// check if it is already an object
		if (!piece || !player || typeof piece == "object") return piece;

		const pieces = player.data.pieces; // player pieces
		const alias = piece.substring(0, 2); // alias
		const index = piece.charAt(2); // index

		// loop through the pieces
		for (let piece of pieces) {
			// check if the alias and index is correct
			// the return it
			if (piece.info.alias == alias) {
				if (piece.info.index == index) {
					return piece;
				}
			}
		}
	}
// find piece on array of piece or array of squares
	findPiece(squares, piece, isPieces) {
		if (!squares || !squares.length || !piece) return false;

		// if is not object then just return piece means it is alias or name of piece
		piece = this.filterPiece(piece) ?? piece;

		const filter = squares.filter((square) => {
			const p = isPieces
				? square
				: typeof square == "object"
				? square.piece
				: this.filterSquare(square).piece; // the piece
			const name = piece.info ? piece.info.name : piece; // piece name
			const alias = piece.info ? piece.info.alias : piece; // piece alias
			return p.info.name == name || p.info.alias == alias; // find piece where alias or name is equal to the given piece
		});

		return (
			filter.map((sq) => {
				return this.filterSquare(sq).piece ?? sq;
			})[0] ?? false
		);
	}
}

// Chess Piece
class Piece {
	constructor(pieceObj, player, game) {
		this.info = {
			...pieceObj, // piece information
			fastpawn: pieceObj.name == "Pawn", // only if pawn
			castling: pieceObj.name == "King", // only if king
			element: null,
		};

		this.data = {}; // just set to an empty * bug
		this.player = player; // players
		this.game = game; // game

		this.init();
	}

	init() {
		this.create(); // create new Image element
		this.listener(); // some listeners
	}

	eat(piece) {
		if (!piece) return;
		const piecePlayer = piece.player;
		const player = this.player;
		piece.info.element && piece.info.element.remove();
		piecePlayer.data.dropped.push(piece);
		piecePlayer.data.pieces.splice(piecePlayer.data.pieces.indexOf(piece), 1);
		player.data.eated.push(piece);

		return piece;
	}

	moveElementTo(square) {

		this.info.fastpawn = false;
		this.info.castling = false;
		square.info.element.appendChild(this.info.element);
	}
	move(square, castling) {
		let old = this.square;
		// eat piece inside
		this.eat(square.piece);
		this.silentMove(square);
		// move the image into the square element
		this.moveElementTo(square);

		this.game.moved(old, square);
	}

	// move in the background
	silentMove(square) {
		const piece = this;
		const board = this.game.data.board;
		square = board.filterSquare(square);
		square.piece = false;
		piece.square.piece = false;

		// change data
		square.piece = piece;
		piece.square = square;
		piece.info.position = square.info.position;
		piece.square.piece = piece;
	}

	create() {
		const pieceElement = new Image(); // new Image element
		const classname = "chessboard-piece";

		// apply
		pieceElement.src = `./assets/media/pieces/${this.info.alias}.png`;
		pieceElement.classList.add(classname);

		this.info.element = pieceElement; // store
	}

	listener() {
		const piece = this; 
		const game = this.game; 
		const element = this.info.element; 
		const board = game.data.board; 
		const mousedown = function (event) {
			let current = undefined; 
			let elemBelow, droppableBelow; // squares positioning

			// if player is previewing match history
			// return false
			if (game.info.preview) return;

			// move the piece towards direction
			const move = function (pageX, pageY) {
				element.style.cursor = "grabbing"; // set the cursor as grab effect
				element.style.left = pageX - element.offsetWidth / 2 + "px";
				element.style.top = pageY - element.offsetHeight / 2 + "px";
			};
			const mousemove = function (event) {
				move(event.pageX, event.pageY); // move the piece in mouse position

				element.hidden = true; // hide the element so it will not affect searching point
				elemBelow = document.elementFromPoint(event.clientX, event.clientY); // search from point x and y
				element.hidden = false; // then show again

				if (!elemBelow) return;

				// find the closest square from the mouse
				droppableBelow = elemBelow.closest(".chessboard-square");

				// if it is not the current square
				if (current != droppableBelow) current = droppableBelow;
			};

			// when the user drop the piece
			const drop = function () {
				// remove first the mousemove event
				document.removeEventListener("mousemove", mousemove);

				// then assign styles to go back to it's position in square
				element.removeAttribute("style");

				if (!current) return false;
				if (game.info.turn != piece.player) return false;

				piece.player.move(piece, current.getAttribute("data-position"));
			};

			// just setting the styles
			const setStyle = function () {
				// set the position to absolute so the image can drag anywhere on the screen
				element.style.position = "absolute";
				// set the z index to max so it will go above all elements
				element.style.zIndex = 1000;
			};

			// just sets some listeners
			const manageListener = function () {
				// drop on mouseup event
				element.onmouseup = drop;

				// disabled dragging
				element.ondragstart = function () {
					return false;
				};

				// add mousemove listener again
				document.addEventListener("mousemove", mousemove);
			};

			// declaration
			setStyle();
			manageListener();
			move(event.pageX, event.pageY);

			if (game.info.turn != piece.player) return false;
			// get the piece possibilities, values(moves(array), enemies(array), castling(array))
			// then show circles to all that squares
			board.setSquarePossibilities(piece.getPossibleSqOnly(), true);

			piece.player.data.currentPiece = piece;
		};

		// add mousedown listener
		element.addEventListener("mousedown", mousedown);
	}

	// get piece possibilites, move, enemies, castling
	getPossibilities() {
		const piece = this; // the current piece
		const square = this.square; // the current square where piece located
		const player = this.player; // the turning player
		const role = player.data.role; // player role values(white, black)
		const game = this.game; // the game
		const gameboard = game.data.board; // gameboard
		const board = gameboard.data; // and the board data
		const pos = { moves: [], enemies: [], castling: [] }; // possibilities object
		let { x, y } = square.info.boardPosition; // square position into board

		// will check if the piece inside the given square is enemy or not
		// then if it is push it into enemies pos
		const testEnemy = function (y, x) {
			// check if the position is valid
			if (!gameboard.isValidPos(y, x)) return false;

			const square = board[y][x]; // target square
			const piece = square.piece; // piece inside the target square

			if (!square || !piece) return false;
			if (piece.player.data.role == role) return false;

			pos.enemies.push(square);
		};

		// test the square when piece can be move or there is enemy
		const testSquare = function (y, x) {
			// check if the position is valid
			if (!gameboard.isValidPos(y, x)) return false;

			const square = board[y][x]; // target square
			const sqpiece = square.piece; // piece inside the target square

			if (!square) return false;

			if (sqpiece) {
				if (piece.info.name != "Pawn") testEnemy(y, x);
				return false;
			} else {
				pos.moves.push(square);
				return true;
			}
		};

		// test directions and check how long the piece can be move from the board
		// yi / xi = y/x need to change
		// yo / xo = what operation, true = addition while false = subtration
		// un = until (number), how many squares need to check
		// is = isking, then if it is check for castlings
		const testLoopSquare = function (yi, yo, xi, xo, un = 8, is) {
			for (let i = 1; i < un; i++) {
				const ny = yi ? (yo ? y + i : y - i) : y;
				const nx = xi ? (xo ? x + i : x - i) : x;

				// check if the position is valid
				if (!gameboard.isValidPos(ny, nx)) return false;

				const square = board[ny][nx]; // target square
				const sqpiece = square.piece; // piece inside the target square

				if (square) {
					if (sqpiece) {
						// if not pawn then test if there is enemy
						if (piece.info.name != "Pawn") testEnemy(ny, nx);
						break;
					} else if (is && i == 2) {
						// if isKing then check then run as one only in a loop

						const check = function (condition) {
							if (condition) pos.castling.push(square);
						};

						check(rightrook && rightrook.info.name == "Rook");
						check(leftrook && leftrook.info.name == "Rook");
					}

					pos.moves.push(square);
				}
			}
		};

const Pattern = {
			Pawn: function () {
				// check if pawn can fastpawn then if it is, increment 1 to it's possible move
				let until = piece.info.fastpawn ? 3 : 2;
				for (let i = 1; i < until; i++) {
					if (role == "white") {
						if (!testSquare(y - i, x)) break;
					} else {
						if (!testSquare(y + i, x)) break;
					}
				}

				// enemy detection
				if (role == "white") {
					//  check the top left and right square from it's position
					testEnemy(y - 1, x - 1);
					testEnemy(y - 1, x + 1);
				} else {
					//  check the bottom left and right square from it's position
					testEnemy(y + 1, x - 1);
					testEnemy(y + 1, x + 1);
				}
			},

			Rook: function () {
				// Top
				testLoopSquare(true, false, false, false);
				// Bottom
				testLoopSquare(true, true, false, false);
				// Left
				testLoopSquare(false, false, true, false);
				// Right
				testLoopSquare(false, false, true, true);
			},

			Bishop: function () {
				testLoopSquare(true, false, true, false);
				// Bottom Left
				testLoopSquare(true, true, true, false);
				// Bottom Right
				testLoopSquare(true, false, true, true);
				// Bottom Right
				testLoopSquare(true, true, true, true);
			},

			Knight: function () {
				// Top
				testSquare(y - 2, x - 1);
				testSquare(y - 2, x + 1);
				// Bottom
				testSquare(y + 2, x - 1);
				testSquare(y + 2, x + 1);
				// Left
				testSquare(y - 1, x - 2);
				testSquare(y + 1, x - 2);
				// Right
				testSquare(y - 1, x + 2);
				testSquare(y + 1, x + 2);
			},

			Queen: function () {
				Pattern.Rook(); // can move like a rook
				Pattern.Bishop(); // can move like a bishop
			},

			King: function () {
				// Top
				testSquare(y - 1, x);
				// Bottom
				testSquare(y + 1, x);
				// Top Left
				testSquare(y - 1, x - 1);
				// Top Right
				testSquare(y - 1, x + 1);
				// Bottom Left
				testSquare(y + 1, x - 1);
				// Bottom Right
				testSquare(y + 1, x + 1);

				if (piece.info.castling) {
					testLoopSquare(false, false, true, true, 3, true);
					testLoopSquare(false, false, true, false, 3, true);
				}
			},
		};

		// then get the pattern base on their name
		// and call it
		Pattern[this.info.name].call();

		// return possibilities
		return pos;
	}

	getPossibleSqOnly() {
		let { moves, enemies, castling } = this.getPossibilities();
		const game = this.game;

		const filter = (s) => {
			return s.filter((sq) => {
				return game.testMove(this, sq);
			});
		};

		game.data.board.resetSquares();
		moves = filter(moves);
		enemies = filter(enemies);
		castling = filter(castling);

		return moves.length || enemies.length || castling.length
			? { moves, enemies, castling }
			: false;
	}

	getAlias() {
		return `${this.info.alias}${this.info.index}`;
	}
}

// Chess Square
class Square {
	constructor(boardPosition, position, role, game) {
		this.info = {
			boardPosition, // square board position
			position, // square position
			role, // square role
			element: null, // square element
			isMove: false, // possible move
			isEnemy: false, // possible enemy
			isCastle: false, // possible castle
		};

		this.piece = null; // the piece
		this.game = game; // the game

		this.init();
	}

	// initialize and ready
	init() {
		this.create(); // create square element
		this.listener(); // some listeners
	}

	// create ui
	create() {
		const squareElement = document.createElement("DIV"); // new Div element
		const classname = "chessboard-square"; // element classname

		squareElement.classList.add(classname); // add
		squareElement.setAttribute("role", this.info.role); // set role
		squareElement.setAttribute("data-position", this.info.position); // and pos

		chessboardParent.appendChild(squareElement); // append to parent
		this.info.element = squareElement; // store
	}
listener() {
		const action = function () {
			const player = this.game.info.turn;
			const info = this.info;
			const isQualified = info.isMove || info.isEnemy || info.isCastle;
			const currentPiece = player.data.currentPiece;

			if (!isQualified || !currentPiece) return false;

			// move the player on the selected squares
			player.move(currentPiece, this);
		};

		this.info.element.addEventListener("click", action.bind(this));
	}
	setAs(classname, bool, ui) {
		const element = this.info.element;

		this.info.isEnemy = classname == "enemy" && bool; // if there's enemy on the square
		this.info.isMove = classname == "move" && bool; // if can possibly move the piece
		this.info.isCastle = classname == "castling" && bool; // if can castling through that position

		if (!ui) return;
		// add class if true and remove if false
		bool
			? element.classList.add(classname)
			: element.classList.remove(classname);
	}
}
class Player {
	constructor(player) {
		this.info = { 
		};
		this.data = {
			...player, 
			total_moves: 0, 
			piecesData: {}, 
			pieces: [], 
			dropped: [], 
			enemies: [], 
			currentPiece: null, 
		};
	}