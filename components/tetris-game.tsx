"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import type { CanvasRenderingContext2D } from "canvas"

const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const BLOCK_SIZE = 30 // pixels

const TETROMINOES = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: "cyan",
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "blue",
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "orange",
  },
  O: {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: "yellow",
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    color: "green",
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "purple",
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    color: "red",
  },
} as const

type TetrominoKey = keyof typeof TETROMINOES
type Tetromino = {
  shape: number[][]
  color: string
}

type Board = (string | 0)[][]

const createBoard = (): Board => Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0))

const getRandomTetromino = (): TetrominoKey => {
  const keys = Object.keys(TETROMINOES) as TetrominoKey[]
  return keys[Math.floor(Math.random() * keys.length)]
}

const rotate = (matrix: number[][], dir: number): number[][] => {
  // Transpose
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < y; x++) {
      ;[matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]]
    }
  }
  // Reverse rows
  if (dir > 0) {
    return matrix.map((row) => row.reverse())
  }
  // Reverse columns
  return matrix.reverse()
}

const checkCollision = (tetromino: number[][], board: Board, { x, y }: { x: number; y: number }): boolean => {
  for (let row = 0; row < tetromino.length; row++) {
    for (let col = 0; col < tetromino[row].length; col++) {
      if (tetromino[row][col] !== 0) {
        const boardX = x + col
        const boardY = y + row

        if (boardX < 0 || boardX >= BOARD_WIDTH) {
          return true
        }
        if (boardY >= BOARD_HEIGHT) {
          return true
        }
        if (boardY >= 0 && board[boardY] && board[boardY][boardX] !== 0) {
          return true
        }
      }
    }
  }
  return false
}

export default function TetrisGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [board, setBoard] = useState<Board>(createBoard())
  const [currentTetromino, setCurrentTetromino] = useState<Tetromino | null>(null)
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 })
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)

  // Refs for game state to be accessed inside gameLoop without recreating it
  const gameStartedRef = useRef(gameStarted)
  const gameOverRef = useRef(gameOver)
  const currentTetrominoRef = useRef(currentTetromino)
  const currentPosRef = useRef(currentPos)
  const boardRef = useRef(board)

  // Update refs whenever state changes
  useEffect(() => {
    gameStartedRef.current = gameStarted
  }, [gameStarted])

  useEffect(() => {
    gameOverRef.current = gameOver
  }, [gameOver])

  useEffect(() => {
    currentTetrominoRef.current = currentTetromino
  }, [currentTetromino])

  useEffect(() => {
    currentPosRef.current = currentPos
  }, [currentPos])

  useEffect(() => {
    boardRef.current = board
  }, [board])

  const dropTimeRef = useRef(0)
  const lastTimeRef = useRef(0)
  const animationFrameId = useRef<number | null>(null) // To store animation frame ID for cancellation

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

      boardRef.current.forEach((row, y) => {
        // Use ref here
        row.forEach((block, x) => {
          if (block !== 0) {
            ctx.fillStyle = block as string
            ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE)
            ctx.strokeStyle = "black"
            ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE)
          }
        })
      })

      if (currentTetrominoRef.current) {
        // Use ref here
        currentTetrominoRef.current.shape.forEach((row, y) => {
          // Use ref here
          row.forEach((block, x) => {
            if (block !== 0) {
              ctx.fillStyle = currentTetrominoRef.current!.color // Use ref here
              ctx.fillRect(
                (currentPosRef.current.x + x) * BLOCK_SIZE,
                (currentPosRef.current.y + y) * BLOCK_SIZE,
                BLOCK_SIZE,
                BLOCK_SIZE,
              ) // Use ref here
              ctx.strokeStyle = "black"
              ctx.strokeRect(
                (currentPosRef.current.x + x) * BLOCK_SIZE,
                (currentPosRef.current.y + y) * BLOCK_SIZE,
                BLOCK_SIZE,
                BLOCK_SIZE,
              ) // Use ref here
            }
          })
        })
      }
    },
    [], // No dependencies, as it uses refs
  )

  const updateBoard = useCallback((newTetromino: Tetromino, newPos: { x: number; y: number }) => {
    setBoard((prevBoard) => {
      const newBoard = prevBoard.map((row) => [...row])

      newTetromino.shape.forEach((row, y) => {
        row.forEach((block, x) => {
          if (block !== 0) {
            newBoard[newPos.y + y][newPos.x + x] = newTetromino.color
          }
        })
      })

      let linesCleared = 0
      for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
        if (newBoard[y].every((block) => block !== 0)) {
          newBoard.splice(y, 1)
          newBoard.unshift(Array(BOARD_WIDTH).fill(0))
          linesCleared++
          y++
        }
      }
      if (linesCleared > 0) {
        setScore((prevScore) => prevScore + linesCleared * 100)
      }
      return newBoard
    })
  }, [])

  const newTetromino = useCallback(() => {
    const type = getRandomTetromino()
    const tetromino = TETROMINOES[type]
    const startX = Math.floor(BOARD_WIDTH / 2) - Math.floor(tetromino.shape[0].length / 2)
    const startY = 0

    // Use boardRef.current for collision check
    if (checkCollision(tetromino.shape, boardRef.current, { x: startX, y: startY })) {
      setGameOver(true)
      setGameStarted(false)
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current)
      }
      return null
    }

    setCurrentTetromino(tetromino)
    setCurrentPos({ x: startX, y: startY })
    return tetromino
  }, []) // No dependencies, as it uses boardRef.current

  const gameLoop = useCallback(
    (time: DOMHighResTimeStamp) => {
      if (!gameStartedRef.current || gameOverRef.current) {
        // Use refs here
        return
      }

      if (!lastTimeRef.current) lastTimeRef.current = time
      const deltaTime = time - lastTimeRef.current
      lastTimeRef.current = time

      dropTimeRef.current += deltaTime
      const dropInterval = 1000 // milliseconds - Tetromino drops every 1 second automatically

      if (dropTimeRef.current > dropInterval) {
        dropTimeRef.current = 0
        if (currentTetrominoRef.current) {
          // Use ref here
          const newY = currentPosRef.current.y + 1 // Use ref here
          if (
            !checkCollision(currentTetrominoRef.current.shape, boardRef.current, {
              x: currentPosRef.current.x,
              y: newY,
            })
          ) {
            // Use refs here
            setCurrentPos((prev) => ({ ...prev, y: newY }))
          } else {
            updateBoard(currentTetrominoRef.current, currentPosRef.current) // Use refs here
            newTetromino()
          }
        }
      }

      const ctx = canvasRef.current?.getContext("2d")
      if (ctx) {
        draw(ctx)
      }

      animationFrameId.current = requestAnimationFrame(gameLoop) // Store ID
    },
    [draw, updateBoard, newTetromino], // Dependencies are now only functions that don't change frequently
  )

  const startGame = useCallback(() => {
    setBoard(createBoard())
    setScore(0)
    setGameOver(false)
    setGameStarted(true)
    newTetromino()
    lastTimeRef.current = 0
    dropTimeRef.current = 0
    if (animationFrameId.current) {
      // Cancel any existing loop
      cancelAnimationFrame(animationFrameId.current)
    }
    animationFrameId.current = requestAnimationFrame(gameLoop) // Start new loop
  }, [newTetromino, gameLoop])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameStartedRef.current || gameOverRef.current || !currentTetrominoRef.current) return // Use refs here

      let newX = currentPosRef.current.x // Use ref here
      let newY = currentPosRef.current.y // Use ref here
      let newShape = currentTetrominoRef.current.shape // Use ref here

      if (e.key === "ArrowLeft") {
        newX -= 1
      } else if (e.key === "ArrowRight") {
        newX += 1
      } else if (e.key === "ArrowDown") {
        newY += 1
      } else if (e.key === "ArrowUp") {
        newShape = rotate(
          currentTetrominoRef.current.shape.map((row) => [...row]), // Use ref here
          1,
        )
      } else if (e.key === " ") {
        let dropY = currentPosRef.current.y // Use ref here
        while (
          !checkCollision(currentTetrominoRef.current.shape, boardRef.current, {
            x: currentPosRef.current.x,
            y: dropY + 1,
          })
        ) {
          // Use refs here
          dropY++
        }
        setCurrentPos((prev) => ({ ...prev, y: dropY }))
        return
      }

      if (!checkCollision(newShape, boardRef.current, { x: newX, y: newY })) {
        // Use ref here
        setCurrentPos({ x: newX, y: newY })
        setCurrentTetromino((prev) => (prev ? { ...prev, shape: newShape } : null))
      } else if (e.key === "ArrowDown") {
        updateBoard(currentTetrominoRef.current, currentPosRef.current) // Use refs here
        newTetromino()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      if (animationFrameId.current) {
        // Clean up on unmount
        cancelAnimationFrame(animationFrameId.current)
      }
    }
  }, []) // Dependencies removed, as it uses refs

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d")
    if (ctx) {
      draw(ctx)
    }
  }, [draw])

  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-4">
      <h1 className="text-3xl font-bold text-gray-800">Tetris</h1>
      <canvas
        ref={canvasRef}
        width={BOARD_WIDTH * BLOCK_SIZE}
        height={BOARD_HEIGHT * BLOCK_SIZE}
        className="border-4 border-gray-700 bg-transparent"
      />
      <div className="flex justify-between w-full px-4">
        <div className="text-lg font-semibold text-gray-700">AIR: {score}</div>
        {gameOver && <div className="text-lg font-bold text-red-600">Game Over!</div>}
      </div>
      <Button onClick={startGame} disabled={gameStarted && !gameOver} className="w-full">
        {gameStarted && !gameOver ? "Playing..." : "Start Game"}
      </Button>
      <div className="text-sm text-gray-600 text-center">
        <p>Use Arrow Keys to Move/Rotate</p>
        <p>Spacebar to Hard Drop</p>
      </div>
    </div>
  )
}
