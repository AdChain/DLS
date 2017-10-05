// TODO: use react

const tc = require('truffle-contract')
const { soliditySHA3 } = require('ethereumjs-abi')
const hex2ascii = require('hex2ascii')
const h = require('h')

const source = require('../../build/contracts/DLS.json')

let instance = null
let account = null

const publisherInfo = document.querySelector('.PublisherInfo')
const sellerInfo = document.querySelector('.SellerInfo')
const addSellerForm = document.querySelector('.AddSellerForm')
const removeSellerForm = document.querySelector('.RemoveSellerForm')
const getSellerForm = document.querySelector('.GetSellerForm')
const logs = document.querySelector('#logs')

async function isRegisteredPublisher (domain) {
  try {
    const isRegistered = await instance.isRegisteredPublisherDomain(domain, {from: account})

    return isRegistered
  } catch (error) {
    alert(error)
  }
}

async function getPublisherData () {
  try {
    let domain = await instance.domains.call(account, {from: account})
    domain = hex2ascii(domain)

    if (!domain) {
      publisherInfo.innerHTML = `This account is not tied to a domain. Learn how to set up <a href="#register">here</a>.`
      return false
    }

   const dom = h('div', h('div', `account: ${account}`), h('div', `domain: ${domain}`))

    publisherInfo.innerHTML = ''
    publisherInfo.appendChild(dom)
    return true
  } catch (error) {
    alert(error)
    return false
  }
}

async function addSeller (sellerDomain, sellerId, sellerRel, tagId) {
  try {
    await instance.addSeller(sellerDomain, sellerId, sellerRel, tagId, {from: account})
    alert('added seller')
  } catch (error) {
    alert(error)
  }
}

async function removeSeller (sellerDomain, sellerId, sellerRel) {
  try {
    await instance.removeSeller(sellerDomain, sellerId, sellerRel, {from: account})
    alert('removed seller')
  } catch (error) {
    alert(error)
  }
}

async function getSeller (pubDomain, sellerDomain, sellerId, sellerRel) {
  try {
    const sellerHash = `0x${soliditySHA3(['string', 'string', 'uint8'], [sellerDomain, sellerId, sellerRel]).toString('hex')}`
    const domainHash = `0x${soliditySHA3(['bytes32'], [pubDomain]).toString('hex')}`
    let [sdomain, sid, srel, tagId] = await instance.sellers.call(domainHash, sellerHash)

    if (srel.toNumber() === 1) {
      srel = 'direct'
    } else {
      srel = 'reseller'
    }

    if (sdomain) {
      // TODO: not use innerHTML
      sellerInfo.innerHTML = `<div>is a seller</div><div>${sdomain}</div><div>${sid}</div><div>${srel}</div><div>${tagId}</div>`
    } else {
      sellerInfo.textContent = `not a seller`
    }
  } catch (error) {
    alert(error)
  }
}

function getProvider () {
  if (window.web3) {
    return window.web3.currentProvider
  }

  const providerUrl = 'https://rinkeby.infura.io:443'
  const provider = new window.Web3.providers.HttpProvider(providerUrl)

  return provider
}

function getAccount () {
  if (window.web3) {
    return window.web3.defaultAccount || window.web3.eth.accounts[0]
  }
}

async function onAddSellerSubmit (event) {
  event.preventDefault()
  const {target} = event

  let [domain, id, rel, tagId] = target.seller.value.split(',')

  domain = domain.trim().toLowerCase()
  id = (id && id.trim()) || ''
  rel = (rel && rel.trim().toLowerCase()) || ''
  tagId = (tagId && tagId.trim()) || ''

  if (rel === 'direct') {
    rel = 1
  } else {
    rel = 2
  }

  try {
    target.classList.toggle('loading', true)
    await addSeller(domain, id, rel, tagId)
  } catch (error) {

  }
  target.classList.toggle('loading', false)
}

async function onRemoveSellerSubmit (event) {
  event.preventDefault()
  const {target} = event

  let [sellerDomain, sellerId, sellerRel] = target.seller.value.split(',')

  sellerDomain = sellerDomain.trim().toLowerCase()
  sellerId = sellerId.trim()
  sellerRel = (sellerRel && sellerRel.trim().toLowerCase()) || ''

  if (sellerRel === 'direct') {
    sellerRel = 1
  } else {
    sellerRel = 2
  }

  try {
    target.classList.toggle('loading', true)
    await removeSeller(sellerDomain, sellerId, sellerRel)
  } catch (error) {

  }

  target.classList.toggle('loading', false)
}

async function onGetSellerSubmit (event) {
  event.preventDefault()
  const {target} = event

  const pubDomain = target.publisherDomain.value.trim()
  const sellerDomain = target.sellerDomain.value.trim()
  const sellerId = target.sellerId.value.trim()
  let sellerRel = target.sellerRel.value.toLowerCase().trim()

  if (sellerRel === 'direct') {
    sellerRel = 1
  } else {
    sellerRel = 2
  }

  const registered = await isRegisteredPublisher(pubDomain)

  if (registered) {
    getSeller(pubDomain, sellerDomain, sellerId, sellerRel)
  } else {
    sellerInfo.textContent = `publisher is not in DLS`
  }
}

function setUpEvents () {
  instance.allEvents()
  .watch((error, log) => {
    if (error) {
      console.error(error)
      return false
    }
    console.log(log)

    const name = log.event
    const args = log.args

    // TODO: not use innerHTML
    logs.innerHTML += `<li>${name} ${JSON.stringify(args)}</li>`
  })
}

async function init () {
  const contract = tc(source)
  contract.setProvider(getProvider())
  instance = await contract.deployed()
  account = getAccount()
}

async function onLoad () {
  await init()

  if (getAccount()) {
    const isConnected = await getPublisherData()

    if (isConnected) {
      removeSellerForm.classList.toggle('disabled', false)
      addSellerForm.classList.toggle('disabled', false)
    }

    setUpEvents()
  } else {
    // TODO: not use innerHTML
    publisherInfo.innerHTML = `Please install or unlock MetaMask to update your list of sellers`
  }
}

// wait for MetaMask to inject script
window.addEventListener('load', onLoad)

addSellerForm.addEventListener('submit', onAddSellerSubmit, false)
removeSellerForm.addEventListener('submit', onRemoveSellerSubmit, false)
getSellerForm.addEventListener('submit', onGetSellerSubmit, false)


/**
 * Register form
 */
const registerForm = document.querySelector('#RegisterForm')
registerForm.addEventListener('submit', onRegisterSubmit, false)

async function onRegisterSubmit (event) {
  event.preventDefault()
  const target = event.target
  const domain = target.domain.value
  target.classList.toggle('loading', true)

  const url = `https://dls-api.adchain.com/register?domain=${domain}`
  window.fetch(url)
  .then(function(response) {
    return response.json()
  })
  .then(function(json) {
    alert(JSON.stringify(json))
  })
  .catch(function(error) {
   alert(error)
  })
  .then(function() {
    target.classList.toggle('loading', false)
  })
}
