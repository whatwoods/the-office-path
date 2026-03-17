export function LandingBackground() {
  return (
    <div
      aria-hidden="true"
      data-testid="landing-background"
      className="absolute inset-0 overflow-hidden"
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/landing/office-night-hero.png')" }}
      />
      <div className="absolute inset-0 bg-black/60 sm:bg-black/45" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,52,96,0.14),rgba(0,0,0,0.62))]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--pixel-bg)] to-transparent" />
    </div>
  )
}
