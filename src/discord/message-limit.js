const DISCORD_MESSAGE_LIMIT = 2000

// Discord rejects messages over 2000 UTF-16 units, and slicing can split a
// surrogate pair at the boundary; drop a trailing lone high surrogate rather
// than send half an emoji. Empty input speaks nothing, so it comes back null.
export function clampMessage(text) {
  if (!text)
    return null

  const clamped = text.trim().slice(0, DISCORD_MESSAGE_LIMIT)
  const last = clamped.charCodeAt(clamped.length - 1)
  const whole = last >= 0xD800 && last <= 0xDBFF ? clamped.slice(0, -1) : clamped

  return whole || null
}
