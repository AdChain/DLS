// TODO: use react

const tc = require('truffle-contract')

const source = require('../../build/contracts/DLS.json')
let instance = null
let account = null

const publisherInfo = document.querySelector('.PublisherInfo')
const sellerInfo = document.querySelector('.SellerInfo')
const addSellerForm = document.querySelector('.AddSellerForm')
const removeSellerForm = document.querySelector('.RemoveSellerForm')
const getSellerForm = document.querySelector('.GetSellerForm')


async function addPublisher (address, domain, name) {
  try {
    await instance.registerPublisher(address, domain, name, {from: account})
    alert('added')
  } catch (error) {
    alert(error)
  }
}

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
    const [id, domain, name] = await instance.publishers.call(account, {from: account})

    if (parseInt(id, 16) === 0) {
      publisherInfo.innerHTML = `This account is not tied to a domain. Learn how to set up <a href="register.html">here</a>.`
      return false
    }

    publisherInfo.innerHTML = `<div>address: ${id}</div><div>domain: ${domain}</div><div>name: ${name}</div>`
  } catch (error) {
    alert(error)
  }
}

async function addSeller (domain, id, rel, tagId) {
  try {
    await instance.addSeller(domain, id, rel, tagId, {from: account})
    alert('added seller')
  } catch (error) {
    alert(error)
  }
}

async function removeSeller (domain, id) {
  try {
    await instance.removeSeller(domain, id, {from: account})
    alert('removed seller')
  } catch (error) {
    alert(error)
  }
}

async function getSeller (pubDomain, sellerDomain, sellerId) {
  const tagId = ''
  try {
    let [domain, sid, rel, tagId] = await instance.getSellerForPublisherDomain(pubDomain, sellerDomain, sellerId, {from: account})

    if (rel.toNumber() === 1) {
      rel = 'reseller'
    } else {
      rel = 'direct'
    }

    if (domain) {
      sellerInfo.innerHTML = `<div>is a seller</div><div>${domain}</div><div>${sid}</div><div>${rel}</div><div>${tagId}</div>`
    } else {
      sellerInfo.innerHTML = `<div>not a seller</div>`
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

async function main () {

  const contract = tc(source)
  contract.setProvider(getProvider())
  instance = await contract.deployed()
  account = getAccount()
}


addSellerForm.addEventListener('submit', event => {
  event.preventDefault()
  const {target} = event

  let [domain, id, rel, tagId] = target.seller.value.split(',')

  domain = domain.trim().toLowerCase()
  id = (id && id.trim()) || ''
  rel = (rel && rel.trim().toLowerCase()) || ''
  tagId = (tagId && tagId.trim()) || ''

  if (rel === 'reseller') {
    rel = 1
  } else {
    rel = 0
  }

  addSeller(domain, id, rel, tagId)
})

removeSellerForm.addEventListener('submit', event => {
  event.preventDefault()
  const {target} = event

  let [domain, id] = target.seller.value.split(',')

  domain = domain.trim().toLowerCase()
  id = id.trim()

  removeSeller(domain, id)
})

getSellerForm.addEventListener('submit', async event => {
  event.preventDefault()
  const {target} = event

  const pubDomain = target.publisherDomain.value.trim()
  const sellerDomain = target.sellerDomain.value.trim()
  const sellerId = target.sellerId.value.trim()

  const registered = await isRegisteredPublisher(pubDomain)

  if (registered) {
    getSeller(pubDomain, sellerDomain, sellerId)
  } else {
    sellerInfo.innerHTML = `<div>publisher is not in registry</div>`
  }
})

function setUpEvents () {
  instance.allEvents()
  .watch((error, log) => {
    if (error) {
      console.error(error)
      return false
    }
    console.log(log)
  })
}

const addr = '0x3b69D38EE4040d118F30F8ad21660FC0CA3769cC'
const domain = 'nytimes.com'
const name = 'New York Times'

setTimeout(async () => {
  await main()

  if (getAccount()) {
    //addPublisher(addr, domain, name)
    getPublisherData()
    setUpEvents()
  } else {
    publisherInfo.innerHTML = `Please install MetaMask to update your list of sellers`
  }
}, 1e3)