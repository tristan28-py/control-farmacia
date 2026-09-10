import { MedicalIcon } from './MedicalIcon'

// Motivo decorativo, sin lecturas ni datos médicos.
export function WellnessVisual() {
  return (
    <div className="wellness-visual" aria-hidden="true">
      <div className="visual-orbit orbit-outer" />
      <div className="visual-orbit orbit-inner" />
      <span className="orbit-spark spark-one" />
      <span className="orbit-spark spark-two" />
      <div className="visual-cross"><MedicalIcon name="cross" /></div>
      <div className="visual-icon visual-heart"><MedicalIcon name="heart" /></div>
      <div className="visual-icon visual-pill"><MedicalIcon name="pill" /></div>
      <div className="pulse-strip">
        <span className="pulse-label"><MedicalIcon name="pulse" /> A tu ritmo</span>
        <svg viewBox="0 0 300 70" className="pulse-line" fill="none">
          <path className="pulse-track" d="M0 38H62L77 25L91 46L110 8L130 64L148 30L161 38H300" />
          <path className="pulse-trace" d="M0 38H62L77 25L91 46L110 8L130 64L148 30L161 38H300" />
        </svg>
      </div>
    </div>
  )
}
