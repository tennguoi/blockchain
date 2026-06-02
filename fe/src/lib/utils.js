export function cn(...inputs) {
  const classes = []

  const add = (input) => {
    if (!input) return

    if (typeof input === 'string' || typeof input === 'number') {
      classes.push(String(input))
      return
    }

    if (Array.isArray(input)) {
      input.forEach(add)
      return
    }

    if (typeof input === 'object') {
      Object.entries(input).forEach(([className, shouldUse]) => {
        if (shouldUse) classes.push(className)
      })
    }
  }

  inputs.forEach(add)
  return classes.join(' ')
}
