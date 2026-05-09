import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, Dimensions,
  SafeAreaView,
} from 'react-native';

const { width } = Dimensions.get('window');

type Cell = null | 'X' | 'O';
type Board = Cell[];

function createBoard(): Board { return Array(9).fill(null); }

const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]
];

function checkWinner(b: Board): { winner: Cell; line: number[] | null } {
  for (const [a, bIdx, c] of WIN_LINES) {
    if (b[a] && b[a] === b[bIdx] && b[a] === b[c]) return { winner: b[a], line: [a, bIdx, c] };
  }
  return { winner: null, line: null };
}

function minimax(b: Board, isMax: boolean, depth: number): number {
  const { winner } = checkWinner(b);
  if (winner === 'O') return 10 - depth;
  if (winner === 'X') return depth - 10;
  if (b.every(c => c !== null)) return 0;

  if (isMax) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i] === null) {
        b[i] = 'O';
        best = Math.max(best, minimax(b, false, depth + 1));
        b[i] = null;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i] === null) {
        b[i] = 'X';
        best = Math.min(best, minimax(b, true, depth + 1));
        b[i] = null;
      }
    }
    return best;
  }
}

function bestMove(b: Board): number {
  let best = -Infinity, move = -1;
  for (let i = 0; i < 9; i++) {
    if (b[i] === null) {
      b[i] = 'O';
      const score = minimax(b, false, 0);
      b[i] = null;
      if (score > best) { best = score; move = i; }
    }
  }
  return move;
}

export default function App() {
  const [board, setBoard] = useState<Board>(createBoard);
  const [xTurn, setXTurn] = useState(true);
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [draw, setDraw] = useState(false);
  const [scoreX, setScoreX] = useState(0);
  const [scoreO, setScoreO] = useState(0);
  const [mode, setMode] = useState<'easy' | 'hard' | '2p'>('hard');

  const gameOver = winLine !== null || draw;
  const aiThinking = useRef(false);

  const handleCell = useCallback((idx: number) => {
    if (board[idx] || gameOver || aiThinking.current) return;
    const current = xTurn ? 'X' : 'O';

    // In 1P mode, X is player, O is AI
    if (mode !== '2p' && current === 'O') return;

    const nb = [...board];
    nb[idx] = current;
    setBoard(nb);

    const { winner, line } = checkWinner(nb);
    if (winner) {
      setWinLine(line);
      if (winner === 'X') setScoreX(s => s + 1);
      else setScoreO(s => s + 1);
      return;
    }
    if (nb.every(c => c !== null)) { setDraw(true); return; }

    const next = !xTurn;
    setXTurn(next);

    // AI move (next is O's turn; condition should trigger when it's O's turn)
    if (mode !== '2p' && !next) {
      aiThinking.current = true;
      setTimeout(() => {
        const aiBoard = [...nb];
        let move: number;
        if (mode === 'easy' && Math.random() < 0.4) {
          const empty = aiBoard.map((c, i) => c === null ? i : -1).filter(i => i >= 0);
          move = empty[Math.floor(Math.random() * empty.length)];
        } else {
          move = bestMove(aiBoard);
        }
        if (move >= 0) {
          aiBoard[move] = 'O';
          setBoard(aiBoard);
          const r = checkWinner(aiBoard);
          if (r.winner) {
            setWinLine(r.line);
            setScoreO(s => s + 1);
          } else if (aiBoard.every(c => c !== null)) {
            setDraw(true);
          }
        }
        setXTurn(true);
        aiThinking.current = false;
      }, 300);
    }
  }, [board, xTurn, gameOver, mode]);

  const newGame = useCallback(() => {
    setBoard(createBoard());
    setXTurn(true);
    setWinLine(null);
    setDraw(false);
    aiThinking.current = false;
  }, []);

  const resetAll = useCallback(() => {
    newGame();
    setScoreX(0);
    setScoreO(0);
  }, [newGame]);

  const cellSize = Math.floor((Math.min(width, 400) - 30) / 3);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Tic Tac Toe</Text>

      <View style={styles.modeRow}>
        {(['easy', 'hard', '2p'] as const).map(m => (
          <TouchableOpacity key={m} style={[styles.modeBtn, mode === m && styles.modeActive]} onPress={() => { setMode(m); resetAll(); }}>
            <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>
              {m === 'easy' ? 'Easy AI' : m === 'hard' ? 'Hard AI' : '2 Players'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.scoreRow}>
        <View style={styles.scoreBox}>
          <Text style={styles.xMark}>✕</Text>
          <Text style={styles.scoreValue}>{scoreX}</Text>
        </View>
        <Text style={styles.vs}>vs</Text>
        <View style={styles.scoreBox}>
          <Text style={styles.oMark}>○</Text>
          <Text style={styles.scoreValue}>{scoreO}</Text>
        </View>
      </View>

      {!gameOver && (
        <Text style={styles.turn}>
          {xTurn ? '✕' : '○'} {mode === '2p' ? "Player's turn" : (xTurn ? 'Your turn' : 'AI thinking...')}
        </Text>
      )}

      <View style={styles.boardContainer}>
        <View style={[styles.board, { width: cellSize * 3 + 6, height: cellSize * 3 + 6 }]}>
          {board.map((cell, i) => {
            const isWin = winLine?.includes(i);
            const row = Math.floor(i / 3), col = i % 3;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.cell,
                  { width: cellSize, height: cellSize },
                  col < 2 && styles.borderR,
                  row < 2 && styles.borderB,
                  isWin && styles.cellWin,
                ]}
                onPress={() => handleCell(i)}
                activeOpacity={0.5}
              >
                {cell === 'X' && <Text style={styles.xCell}>✕</Text>}
                {cell === 'O' && <Text style={styles.oCell}>○</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.newBtn} onPress={newGame}>
          <Text style={styles.newBtnText}>New Game</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resetBtn} onPress={resetAll}>
          <Text style={styles.resetBtnText}>Reset Score</Text>
        </TouchableOpacity>
      </View>

      {gameOver && (
        <View style={styles.overlay}>
          <Text style={styles.resultText}>
            {draw ? '🤝 Draw!' : winLine ? (board[winLine[0]] === 'X' ? '✕ Wins!' : '○ Wins!') : ''}
          </Text>
          <TouchableOpacity style={styles.playBtn} onPress={newGame}>
            <Text style={styles.playBtnText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', paddingTop: 15 },
  title: { fontSize: 30, fontWeight: 'bold', color: '#e94560', marginBottom: 8 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modeBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 15, backgroundColor: '#16213e' },
  modeActive: { backgroundColor: '#e94560' },
  modeText: { color: '#888', fontWeight: 'bold', fontSize: 13 },
  modeTextActive: { color: '#fff' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 10 },
  scoreBox: { alignItems: 'center' },
  xMark: { fontSize: 28, color: '#3498db', fontWeight: 'bold' },
  oMark: { fontSize: 32, color: '#e74c3c', fontWeight: 'bold' },
  scoreValue: { fontSize: 20, color: '#fff', fontWeight: 'bold' },
  vs: { color: '#555', fontSize: 16 },
  turn: { color: '#ccc', fontSize: 16, fontWeight: '600', marginBottom: 10 },
  boardContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  board: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#16213e' },
  borderR: { borderRightWidth: 2, borderRightColor: '#444' },
  borderB: { borderBottomWidth: 2, borderBottomColor: '#444' },
  cellWin: { backgroundColor: '#2d4a2d' },
  xCell: { fontSize: 48, color: '#3498db', fontWeight: 'bold' },
  oCell: { fontSize: 52, color: '#e74c3c', fontWeight: 'bold' },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 15 },
  newBtn: { backgroundColor: '#27ae60', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  newBtnText: { color: '#fff', fontWeight: 'bold' },
  resetBtn: { backgroundColor: '#333', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  resetBtnText: { color: '#aaa', fontWeight: 'bold' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  resultText: { fontSize: 42, fontWeight: 'bold', color: '#fff', marginBottom: 15 },
  playBtn: { backgroundColor: '#e94560', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },
  playBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
});
