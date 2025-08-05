import TetrisGame from "@/components/tetris-game"

export default function Home() {
  return (
    <div
      className="min-h-screen flex items-center justify-center tetris-background" // Menggunakan kelas CSS baru
    >
      <TetrisGame />
    </div>
  )
}
