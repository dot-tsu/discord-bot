import { expect, test } from 'bun:test'
import { parseCommand } from '../parse-command.ts'

const BOT_ID = '123'
const CHANNEL_ID = '456'

function parse(content: string, channelIds: string[] = []) {
  const botMentioned = content.includes(`<@${BOT_ID}>`) || content.includes(`<@!${BOT_ID}>`)

  return parseCommand(content, BOT_ID, botMentioned, channelIds)
}

test('bot mention plus one channel mention configures', () => {
  expect(parse(`<@${BOT_ID}> <#${CHANNEL_ID}>`, [CHANNEL_ID])).toEqual({ type: 'configure' })
  expect(parse(`<@!${BOT_ID}> <#${CHANNEL_ID}>`, [CHANNEL_ID])).toEqual({ type: 'configure' })
})

test('extra words make it a command or query, not a config', () => {
  expect(parse(`<@${BOT_ID}> skip <#${CHANNEL_ID}>`, [CHANNEL_ID])).toEqual({ type: 'skip' })
  expect(parse(`<@${BOT_ID}> play that song from <#${CHANNEL_ID}>`, [CHANNEL_ID]))
    .toEqual({ type: 'query', query: 'play that song from <#456>' })
  expect(parse(`<@${BOT_ID}> <#${CHANNEL_ID}> please`, [CHANNEL_ID]))
    .toEqual({ type: 'query', query: '<#456> please' })
})

test('each command word maps to its command', () => {
  expect(parse(`<@${BOT_ID}> skip`)).toEqual({ type: 'skip' })
  expect(parse(`<@${BOT_ID}> pause`)).toEqual({ type: 'pause' })
  expect(parse(`<@${BOT_ID}> resume`)).toEqual({ type: 'resume' })
  expect(parse(`<@${BOT_ID}> queue`)).toEqual({ type: 'queue' })
  expect(parse(`<@${BOT_ID}> shuffle`)).toEqual({ type: 'shuffle' })
  expect(parse(`<@${BOT_ID}> clear`)).toEqual({ type: 'clear' })
})

test('remove takes a number, or is null when missing or invalid', () => {
  expect(parse(`<@${BOT_ID}> remove 3`)).toEqual({ type: 'remove', index: 3 })
  expect(parse(`<@${BOT_ID}> remove`)).toEqual({ type: 'remove', index: null })
  expect(parse(`<@${BOT_ID}> remove x`)).toEqual({ type: 'remove', index: null })
  expect(parse(`<@${BOT_ID}> remove 2.5`)).toEqual({ type: 'remove', index: null })
  expect(parse(`<@${BOT_ID}> remove 2abc`)).toEqual({ type: 'remove', index: null })
})

test('more than one channel mention is not a config', () => {
  expect(parse(`<@${BOT_ID}> <#${CHANNEL_ID}> <#789>`, [CHANNEL_ID, '789']))
    .toEqual({ type: 'query', query: '<#456> <#789>' })
})

test('mentioning the same channel twice still configures that channel', () => {
  expect(parse(`<@${BOT_ID}> <#${CHANNEL_ID}> <#${CHANNEL_ID}>`, [CHANNEL_ID])).toEqual({ type: 'configure' })
})

test('no bot mention or no channel mention is not a config', () => {
  expect(parse(`<#${CHANNEL_ID}>`, [CHANNEL_ID])).toEqual({ type: 'query', query: '<#456>' })
  expect(parse(`<@${BOT_ID}>`)).toEqual({ type: 'query', query: '' })
  expect(parse('never gonna give you up')).toEqual({ type: 'query', query: 'never gonna give you up' })
})

test('mentions inside a code block are not real mentions', () => {
  const content = `\`<@${BOT_ID}> <#${CHANNEL_ID}>\``

  expect(parseCommand(content, BOT_ID, false, [])).toEqual({ type: 'query', query: content })
})

test('bot mention is stripped from the query', () => {
  expect(parse(`<@${BOT_ID}> never gonna give you up`)).toEqual({ type: 'query', query: 'never gonna give you up' })
  expect(parse(`<@!${BOT_ID}> never gonna give you up`)).toEqual({ type: 'query', query: 'never gonna give you up' })
})
