// TODO: use react

const tc = require('truffle-contract')
const { soliditySHA3 } = require('ethereumjs-abi')
const hex2ascii = require('hex2ascii')
const detectNetwork = require('web3-detect-network')
const h = require('h')

const source = require('../../build/contracts/DLS.json')

let contract = null
let instance = null
let account = null
let provider = null

const publisherInfo = document.querySelector('.PublisherInfo')
const sellerInfo = document.querySelector('.SellerInfo')
const addSellerForm = document.querySelector('.AddSellerForm')
const removeSellerForm = document.querySelector('.RemoveSellerForm')
const getSellerForm = document.querySelector('.GetSellerForm')
const logs = document.querySelector('#logs')

let sellerList = require('./sellerList.json')
sellerList.unshift("")
sellerList = sellerList.map(x => {
   return {
      label: x,
      value: x
   }
})

const choices = new window.Choices('.AddPubliserSellerDomain', {
  choices: sellerList,
   editItems: true,
})

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

async function addSellerHash (sellerDomain, sellerId, sellerRel) {
  try {
    const hash = `0x${soliditySHA3(['string', 'string', 'uint8'], [sellerDomain, sellerId, sellerRel]).toString('hex')}`
    await instance.addSellerHash(hash, {from: account})
    alert('added seller (hash only)')
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
    let [sdomain, sid, srel, tagId, hash] = await instance.sellers.call(domainHash, sellerHash)

    srel = srel.toNumber()

    if (srel === 1) {
      srel = 'direct'
    } else if (srel === 2) {
      srel = 'reseller'
    } else {
      srel = ''
    }

    if (parseInt(hash, 16) !== 0) {
      // TODO: not use innerHTML
      sellerInfo.innerHTML = `<div class="green">IS A SELLER</div><div>Seller hash: ${hash}</div><div>Seller domain: ${sellerDomain}</div><div>Seller ID: ${sellerId}</div><div>Seller Relationship: ${sellerRel}</div><div>Seller TAG ID: ${tagId}</div>`
    } else {
      sellerInfo.innerHTML = `<div class="red">NOT A SELLER</div>`
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

  const sellerDomainChoice = choices.getValue().value.toLowerCase().trim()
  const sellerDomainInput = target.sellerDomain.value.toLowerCase().trim()

  if (!(sellerDomainChoice || sellerDomainInput)) {
    alert('please select a seller')
    return false
  }

  const sellerId = target.sellerId.value.toLowerCase().trim()
  const sellerRel = parseInt(target.sellerRel.value, 10) || 0
  //tagId = (tagId && tagId.trim()) || ''
  const hashOnly = target.hash.checked

  let sellerDomain = sellerDomainChoice

  if (sellerDomainInput) {
    sellerDomain = sellerDomainInput
    choices.setValueByChoice('')
  } else if (sellerDomainChoice) {
    sellerDomainInput.value = ''
  }

  if (!sellerId) {
    alert('Please enter a seller ID')
    return false
  }

  try {
    target.classList.toggle('loading', true)
    if (hashOnly) {
      await addSellerHash(sellerDomain, sellerId, sellerRel, tagId)
    } else {
      await addSeller(sellerDomain, sellerId, sellerRel, tagId)
    }
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
  const sellerRel = parseInt(target.sellerRel.value, 10) || 0

  const registered = await isRegisteredPublisher(pubDomain)

  if (registered) {
    getSeller(pubDomain, sellerDomain, sellerId, sellerRel)
  } else {
    // TODO: not use innerHTML
    sellerInfo.innerHTML = `<div class="red">Publisher domain is not in DLS</div>`
  }
}

function setUpEvents () {
  instance.allEvents({fromBlock: 0, toBlock: 'latest'})
  .watch((error, log) => {
    if (error) {
      console.error(error)
      return false
    }
    console.log(log)

    const name = log.event
    const args = log.args

    if (args && args.publisherDomain) {
      args.publisherDomain = hex2ascii(args.publisherDomain)
    }

    // TODO: not use innerHTML
    logs.innerHTML += `<li>${name} ${JSON.stringify(args)}</li>`
  })
}

async function init () {
  contract = tc(source)

  provider = getProvider()
  contract.setProvider(provider)

  const {id:netId, type:netType} = await detectNetwork(provider)
  if (netType !== 'rinkeby') {
    alert('Please connect to the Rinkeby testnet')
  }

  instance = await contract.deployed()
  account = getAccount()
}

async function onLoad () {
  try {
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
  } catch (error) {
    alert(error.message)
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
