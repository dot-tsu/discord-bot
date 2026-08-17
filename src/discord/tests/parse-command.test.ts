import { expect, test } from 'bun:test'
import { isConfigurationCommand } from '../parse-command.ts'

const BOT_ID = '123'
const CHANNEL_ID = '456'

function isConfig(content: string, channelIds: string[]) {
  const botMentioned = content.includes(`<@${BOT_ID}>`) || content.includes(`<@!${BOT_ID}>`)

  return isConfigurationCommand(content, BOT_ID, botMentioned, channelIds)
}

test('bot mention plus one channel mention configures', () => {
  expect(isConfig(`<@${BOT_ID}> <#${CHANNEL_ID}>`, [CHANNEL_ID])).toBe(true)
  expect(isConfig(`<@!${BOT_ID}> <#${CHANNEL_ID}>`, [CHANNEL_ID])).toBe(true)
})

test('extra words make it a query, not a config', () => {
  expect(isConfig(`<@${BOT_ID}> skip <#${CHANNEL_ID}>`, [CHANNEL_ID])).toBe(false)
  expect(isConfig(`<@${BOT_ID}> play that song from <#${CHANNEL_ID}>`, [CHANNEL_ID])).toBe(false)
  expect(isConfig(`<@${BOT_ID}> <#${CHANNEL_ID}> please`, [CHANNEL_ID])).toBe(false)
})

test('more than one channel mention is not a config', () => {
  expect(isConfig(`<@${BOT_ID}> <#${CHANNEL_ID}> <#789>`, [CHANNEL_ID, '789'])).toBe(false)
})

test('mentioning the same channel twice still configures that channel', () => {
  expect(isConfig(`<@${BOT_ID}> <#${CHANNEL_ID}> <#${CHANNEL_ID}>`, [CHANNEL_ID])).toBe(true)
})

test('no bot mention or no channel mention is not a config', () => {
  expect(isConfig(`<#${CHANNEL_ID}>`, [CHANNEL_ID])).toBe(false)
  expect(isConfig(`<@${BOT_ID}>`, [])).toBe(false)
  expect(isConfig('never gonna give you up', [])).toBe(false)
})

test('mentions inside a code block are not real mentions', () => {
  expect(isConfigurationCommand(`\`<@${BOT_ID}> <#${CHANNEL_ID}>\``, BOT_ID, false, [])).toBe(false)
})
