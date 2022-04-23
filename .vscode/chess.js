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
      board: undefined,
    };
  }
  async init(callback) {
    this.data.board = new Board(this);
    this.data.board.create();
    await this.assignPlayers();
    // makes ure that players are ready
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

  // TODO-create ui
  create() {
    const col_row = this.default.col_row;
    const col = this.default.col;
    const row = this.default.row;

    let role = "white";

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

        squares.push(square);
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
  getAllPossibilities() {
    const players = this.game.data.players;
    const white = players[0].analyze();
    const black = players[1].analyze();

    return { white, black };
  }
  analyze() {
    let status = true;
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
        }

      }
    }
    return status;
  }
  setSquarePossibilities(possibilities, insertUI) {
    if (!possibilities) return;
    let { moves, enemies, castling } = possibilities;
    // reset first
    this.resetSquares();
    // sets square properties according to possibilities values
    moves.forEach((square) => square.setAs("move", true, insertUI));
    enemies.forEach((square) => square.setAs("enemy", true, insertUI));
  }

  // remove all classes from squares
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
      if (piece.info.alias == alias) {
        if (piece.info.index == index) {
          return piece;
        }
      }
    }
  }
  findPiece(squares, piece, isPieces) {
    if (!squares || !squares.length || !piece) return false;

    // if not object ==> just return piece means it is alias or name of piece
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
class Piece {
  constructor(pieceObj, player, game) {
    this.info = {
      ...pieceObj,
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
    square.info.element.appendChild(this.info.element);
  }
  move(square) {
    let old = this.square;
    // eat piece inside
    this.eat(square.piece);
    this.silentMove(square);
    // move the image into the square element
    this.moveElementTo(square);
    this.game.moved(old, square);
  }
  silentMove(square) {
    const piece = this;
    const board = this.game.data.board;
    square = board.filterSquare(square);
    square.piece = false;
    piece.square.piece = false;
    square.piece = piece;
    piece.square = square;
    piece.info.position = square.info.position;
    piece.square.piece = piece;
  }
  create() {
    const pieceElement = new Image();
    const classname = "chessboard-piece";
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
      // move the piece towards direction
      const move = function (pageX, pageY) {
        element.style.cursor = "grabbing"; // set the cursor as grab effect
        element.style.left = pageX - element.offsetWidth / 2 + "px";
        element.style.top = pageY - element.offsetHeight / 2 + "px";
      };
      const mousemove = function (event) {
        move(event.pageX, event.pageY); // move the piece in mouse position

        element.hidden = true; 
        elemBelow = document.elementFromPoint(event.clientX, event.clientY); // search from point x and y
        element.hidden = false; // then show again

        if (!elemBelow) return;
        droppableBelow = elemBelow.closest(".chessboard-square");
        if (current != droppableBelow) current = droppableBelow;
      };
      const drop = function () {
        document.removeEventListener("mousemove", mousemove);
        element.removeAttribute("style");

        if (!current) return false;
        if (game.info.turn != piece.player) return false;

        piece.player.move(piece, current.getAttribute("data-position"));
      };
      const setStyle = function () {
        element.style.position = "absolute";
        element.style.zIndex = 1000;
      };

      //listeners
      const manageListener = function () {
        element.onmouseup = drop;
        element.ondragstart = function () {
          return false;
        };
        document.addEventListener("mousemove", mousemove);
      };
      setStyle();
      manageListener();
      move(event.pageX, event.pageY);
      if (game.info.turn != piece.player) return false;
      board.setSquarePossibilities(piece.getPossibleSqOnly(), true);
      piece.player.data.currentPiece = piece;
    };
    element.addEventListener("mousedown", mousedown);
  }
  getPossibilities() {
    const piece = this; // the current piece
    const square = this.square; // the current square where piece located
    const player = this.player; // the turning player
    const role = player.data.role; // player role values(white, black)
    const game = this.game; // the game
    const gameboard = game.data.board;
    const board = gameboard.data;
    const pos = { moves: [], enemies: [], castling: [] };
    let { x, y } = square.info.boardPosition;

    // TODO- check if the piece inside the given square is enemy or not
    const testEnemy = function (y, x) {
      // check if the position is valid
      if (!gameboard.isValidPos(y, x)) return false;

      const square = board[y][x]; // target square
      const piece = square.piece; // piece inside the target square

      if (!square || !piece) return false;
      if (piece.player.data.role == role) return false;
      pos.enemies.push(square);
    };

    // TODO-test the square when piece can be move-depends on enemy
    const testSquare = function (y, x) {
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
    // test directions
    // yi / xi = y/x need to change
    // yo / xo = what operation, true = addition while false = subtract
    // un = until (number), how many squares need to check
    const testLoopSquare = function (yi, yo, xi, xo, un = 8, is) {
      for (let i = 1; i < un; i++) {
        const ny = yi ? (yo ? y + i : y - i) : y;
        const nx = xi ? (xo ? x + i : x - i) : x;
        if (!gameboard.isValidPos(ny, nx)) return false;
        const square = board[ny][nx]; // target square
        const sqpiece = square.piece; // piece inside the target square
        if (square) {
          if (sqpiece) {
            // if not pawn then test if there is enemy
            if (piece.info.name != "Pawn") testEnemy(ny, nx);
            break;
          } else if (is && i == 2) {
            const check = function (condition) {
              if (condition) pos.castling.push(square);
            };
          }
          pos.moves.push(square);
        }
      }
    };
    //TODO, make pawn move two squares//
    const Pattern = {
      Pawn: function () {
        // check if pawn can skip a space, increment 1 to it's possible move
        let until = piece.info.fastpawn ? 3 : 2;
        for (let i = 1; i < until; i++) {
          if (role == "white") {
            if (!testSquare(y - i, x)) break;
          } else {
            if (!testSquare(y + i, x)) break;
          }
        }
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
        testLoopSquare(true, false, false, false);
        testLoopSquare(true, true, false, false);
        testLoopSquare(false, false, true, false);
        testLoopSquare(false, false, true, true);
      },

      Bishop: function () {
        testLoopSquare(true, false, true, false);
        testLoopSquare(true, true, true, false);
        testLoopSquare(true, false, true, true);
        testLoopSquare(true, true, true, true);
      },

      Knight: function () {
        testSquare(y - 2, x - 1);
        testSquare(y - 2, x + 1);
        testSquare(y + 2, x - 1);
        testSquare(y + 2, x + 1);
        testSquare(y - 1, x - 2);
        testSquare(y + 1, x - 2);
        testSquare(y - 1, x + 2);
        testSquare(y + 1, x + 2);
      },

      Queen: function () {
        Pattern.Rook(); // can move like a rook
        Pattern.Bishop(); // can move like a bishop
      },
      King: function () {
        testSquare(y - 1, x);
        testSquare(y + 1, x);
        testSquare(y - 1, x - 1);
        testSquare(y - 1, x + 1);
        testSquare(y + 1, x - 1);
        testSquare(y + 1, x + 1);

        if (piece.info.castling) {
          testLoopSquare(false, false, true, true, 3, true);
          testLoopSquare(false, false, true, false, 3, true);
        }
      },
    };
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
    return moves.length || enemies.length || castling.length
      ? { moves, enemies, castling }
      : false;
  }
}

class Square {
  constructor(boardPosition, position, role, game) {
    this.info = {
      boardPosition,
      position,
      role,
      element: null,
      isMove: false,
      isEnemy: false,
    };
    this.piece = null;
    this.game = game;
    this.init();
  }
  init() {
    this.create(); // create square element
    this.listener(); // some listeners
  }
  create() {
    const squareElement = document.createElement("DIV"); // new Div 
    const classname = "chessboard-square";

    squareElement.classList.add(classname);
    squareElement.setAttribute("role", this.info.role);
    squareElement.setAttribute("data-position", this.info.position);
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

      //  TODO-move the player on the selected squares
      player.move(currentPiece, this);
    };

    this.info.element.addEventListener("click", action.bind(this));
  }
  setAs(classname, bool, ui) {
    const element = this.info.element;

    this.info.isEnemy = classname == "enemy" && bool; // if there's enemy on the square
    this.info.isMove = classname == "move" && bool; // if can possibly move the piece
    if (!ui) return;
    // TODO - add class if true and remove if false
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
      ...player, // rewrite player information
      total_moves: 0, // all the moves
      piecesData: {}, // data pieces
      pieces: [],
      dropped: [],
      eated: [],
      enemies: [],
      currentPiece: null,
      card: null,
    };
  }
  analyze() {
    this.data.moves = []; // empty the array
    this.data.enemies = []; // empty the array

    const game = this.game;
    const turnPlayer = game.info.turn;
    const pieces = this.data.pieces;
    const pos = { moves: [], enemies: [] };

    // loop through the pieces
    for (const piece of pieces) {
      for (const data of Object.entries(piece.getPossibilities())) {
        for (const square of data[1]) {
          if (!square) return;
          if (!pos[data[0]].includes(square.info.position)) {
            pos[data[0]].push(square.info.position);
          }
        }
      }
    }

    this.data.moves = pos.moves; // set the moves
    this.data.enemies = pos.enemies; // set the enemies
    this.info.isTurn = turnPlayer.data.username == this.data.username; // if the player is equal to turning player

    return pos;
  }
  update() {
    const game = this.game;
    const players = game.data.players;
    const pos = players.indexOf(this) + 1;
    const playerCard = document.querySelector(`.player-card.player-${pos}`);
    const isTurn = game.info.turn == this;
  }
  // move target piece to the target square
  move(piece, square) {
    if (!piece || !square) return false;
    const board = this.game.data.board;
    // make sure piece and square is an object
    piece = board.filterPiece(this, piece);
    square = board.filterSquare(square);
    const game = this.game;
    const test = game.testMove(piece, square);
    const info = square.info;
    const isQualified = info.isMove || info.isEnemy || info.isCastle;
    // if not qualified, or not possible (move, enemy)
    if (!isQualified) return false;

    // if theres no wrong in move, then move
    if (test) piece.move(square, info.isCastle);

    return test;
  }
  //TODO-get and set
  async setPieces() {
    const player = this;
    const game = this.game;
    const pieces = this.data.pieces; // array of class Pieces
    const piecesData = this.data.piecesData;
    const set = function (setPieceObj) {
      // Get Values
      let { name, length, alias, position } = setPieceObj;
      let { letter: letters, number } = position;
      // Loop through their lengths
      for (let i = 0; i < length; i++) {
        const position = `${letters[i]}${number}`; // get the position
        const obj = { name, alias, position, index: i }; // create piece information
        const piece = new Piece(obj, player, game); // new Piece
        pieces.push(piece); // insert to the array of class Pieces
      }
    };
    piecesData.forEach(set);
  }
  async init(game) {
    this.game = game; // initialize the game
    await this.getPieces(); // get all data pieces
    await this.setPieces(); // set object pieces to class Pieces
    this.update();
  }
}
const Game = new Chess(); // game
Game.init(function () {
  this.start();

}); 
