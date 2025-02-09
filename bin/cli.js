#!/usr/bin/env node

const program = require('commander')
const globby = require('globby')
const { launch } = require('../src')
const log = require('../src/utils/logger')
const { formats, defaultTotalRuns, defaultFormat, defaultUrl } = require('../src/config')
const { version } = require('../package.json')

program
  .name('exthouse')
  .usage('[path/to/extension.crx] [options]')
  .option('--runs <number>', 'amount of runs to evaluate median performance value', defaultTotalRuns.toString())
  .option('--url <url>', 'url to evaluate extension performance', defaultUrl)
  .option('--format <format>', `output format options: [${Object.values(formats)}]`, defaultFormat)
  .option('--disableGather', 'disable gathering and use /exthouse to produce results')
  .version(version)

program.parse(process.argv)

const totalRuns = parseInt(program.runs)

/** @typedef {import('../src').Options} Options */
/** @type {Options} */
const opts = {
  format: program.format,
  url: program.url,
  totalRuns: Number.isInteger(totalRuns) && totalRuns <= 9 && totalRuns >= 0 ? totalRuns : defaultTotalRuns,
  disableGather: program.disableGather
}

const files = globby.sync(program.args)
launch(files, opts)
  .catch(e => {
    log.error(e.message)
    log.info('\nRun:\n  exthouse --help\n')
    process.exit(1)
  })
  .then(() => process.exit())
