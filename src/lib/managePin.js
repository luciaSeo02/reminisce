const PIN_KEY = 'reminisce-manage-pin'

export function getStoredPin() {
  return localStorage.getItem(PIN_KEY)
}

export function setStoredPin(pin) {
  localStorage.setItem(PIN_KEY, pin)
}

export function removeStoredPin() {
  localStorage.removeItem(PIN_KEY)
}
