interface AppleSliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (val: number) => void
}

const PRESET_COLORS = [
  "#FFFFFF",
  "#EBEBF5",
  "#8E8E93",
  "#000000",
  "#FF453A",
  "#FF9F0A",
  "#FFD60A",
  "#32D74B",
  "#64D2FF",
  "#0A84FF",
  "#5E5CE6",
  "#FF375F",
]

export function AlignmentButton({
  icon,
  onClick,
}: {
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex cursor-pointer items-center justify-center rounded-lg p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
    >
      {icon}
    </button>
  )
}

export function FormatButton({
  icon,
  isActive,
  onClick,
}: {
  icon: React.ReactNode
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer rounded-lg p-2 transition-all ${isActive ? "bg-white text-black" : "text-white/60 hover:bg-white/[0.08] hover:text-white"}`}
    >
      {icon}
    </button>
  )
}

export function ColorCircle({
  color,
  onClick,
}: {
  color: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="h-6 w-6 cursor-pointer rounded-full border border-white/20 shadow-inner transition-transform hover:scale-105 active:scale-95"
      style={{ backgroundColor: color }}
    />
  )
}

export function ColorPickerDropdown({
  isOpen,
  currentColor,
  onChange,
}: {
  isOpen: boolean
  currentColor: string
  onChange: (color: string) => void
}) {
  if (!isOpen) return null

  return (
    <div className="absolute top-8 right-0 z-50 w-60 animate-in rounded-lg border border-white/[0.1] bg-[#2C2C2E] p-3 shadow-[0_10px_40px_rgba(0,0,0,0.5)] duration-150 zoom-in-95 fade-in">
      <div className="mb-3 grid grid-cols-4 gap-2">
        {PRESET_COLORS.map((preset) => (
          <button
            key={preset}
            onClick={() => onChange(preset)}
            className={`aspect-square h-12 w-12 cursor-pointer rounded-full shadow-inner transition-transform hover:scale-110 active:scale-95 ${currentColor === preset ? "ring-2 ring-white ring-offset-2 ring-offset-[#2C2C2E]" : ""}`}
            style={{ backgroundColor: preset }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-black/40 p-1.5">
        <span className="pl-1 font-mono text-[11px] font-medium text-white/40">
          HEX
        </span>
        <input
          type="text"
          value={currentColor}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent font-mono text-[12px] text-white uppercase outline-none"
        />
      </div>
    </div>
  )
}

export function PresetButton({
  label,
  onClick,
  isDanger,
}: {
  label: string
  onClick: () => void
  isDanger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 cursor-pointer rounded-lg py-1.5 text-[10px] font-medium tracking-wider uppercase transition-all active:scale-95 ${
        isDanger
          ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
          : "border border-white/[0.05] bg-white/[0.05] text-white/70 hover:bg-white/[0.1] hover:text-white"
      }`}
    >
      {label}
    </button>
  )
}

export function AppleSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: AppleSliderProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-[12px] font-medium text-white/60">
        <span>{label}</span>
        <span className="text-white/40 tabular-nums">
          {value?.toFixed(step < 1 ? 1 : 0)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.1] outline-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(0,0,0,0.5)]"
      />
    </div>
  )
}
