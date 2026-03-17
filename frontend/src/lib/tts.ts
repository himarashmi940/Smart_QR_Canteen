export function speak(text: string, opts?: { rate?: number; pitch?: number; lang?: string }) {
  if (typeof window === "undefined") return
  const synth = window.speechSynthesis
  if (!synth) return
  const utter = new SpeechSynthesisUtterance(text)
  utter.rate = opts?.rate ?? 1
  utter.pitch = opts?.pitch ?? 1
  utter.lang = opts?.lang ?? "en-IN"
  synth.cancel()
  synth.speak(utter)
}

