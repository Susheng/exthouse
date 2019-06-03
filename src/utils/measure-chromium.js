const chromeLauncher = require('chrome-launcher')
const puppeteer = require('puppeteer')
const lighthouse = require('lighthouse')
const request = require('request')
const { promisify } = require('util')
const delay = require('delay')
const { defaultName, defaultCacheType } = require('../config')

const lhConfig = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance']
  }
}

/**
 * @typedef {import('../index').Extension} Extension
 *
 * @param {string} url
 * @param {Extension} ext
 * @param {string} [cacheType]
 * @return {Promise<{ lhr: {audits: Object} }>}
 */

exports.measureChromium = async function(url, ext, cacheType = defaultCacheType.cold) {
  const isDefault = ext.name === defaultName
  const opts = {
    output: 'json'
  }

  // Launch chrome using chrome-launcher.
  const chrome = await chromeLauncher.launch({
    ...opts,
    chromeFlags: isDefault ? [] : [`--disable-extensions-except=${ext.path}`, `--load-extension=${ext.path}`]
  })
  const lhOpts = {
    ...opts,
    port: chrome.port,
    emulatedFormFactor: 'desktop',
    disableStorageReset: cacheType !== defaultCacheType.cold
  }

  if (!isDefault) await delay(10000) // await extension to be installed

  // Connect to it using puppeteer.connect().
  const resp = await promisify(request)(`http://localhost:${lhOpts.port}/json/version`)
  const { webSocketDebuggerUrl } = JSON.parse(resp.body)
  const browser = await puppeteer.connect({ browserWSEndpoint: webSocketDebuggerUrl })

  if (cacheType === defaultCacheType.warm) {
    await lighthouse(url, lhOpts, lhConfig)
  } else if (cacheType === defaultCacheType.hot) {
    await lighthouse(url, lhOpts, lhConfig)
    await lighthouse(url, lhOpts, lhConfig)
  }

  // Run Lighthouse.
  const { lhr } = await lighthouse(url, lhOpts, lhConfig)

  await browser.disconnect()
  await chrome.kill()

  return { lhr }
}