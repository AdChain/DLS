// TODO: clean up tests

const DLS = artifacts.require('./DLS.sol')
const sha3 = require('solidity-sha3').default
const {soliditySHA3} = require('ethereumjs-abi')

const Relationship = {
  Null: 0,
  Direct: 1,
  Reseller: 2
}

function getLastEvent(instance) {
  return new Promise((resolve, reject) => {
    instance.allEvents()
    .watch((error, log) => {
      if (error) return reject(error)
      resolve(log)
    })
  })
}

contract('DLS', function (accounts) {
  const owner = accounts[0]

  it('should add publisher to registry', async () => {
    const instance = await DLS.deployed()

    const publisher = accounts[1]
    const domain = 'example.com'

    const isRegistered = await instance.isRegisteredPublisher(publisher)
    assert.equal(isRegistered, false)

    const isDomainRegistered = await instance.isRegisteredPublisherDomain(domain)
    assert.equal(isDomainRegistered, false)

    await instance.registerPublisher(domain, publisher, {from: owner})
    const domainHash = `0x${soliditySHA3(['bytes32'], [domain]).toString('hex')}`
    const publisher2 = await instance.publishers.call(domainHash)

    assert.equal(publisher2, publisher)

    const isRegistered2 = await instance.isRegisteredPublisher(publisher)
    assert.equal(isRegistered2, true)

    const isDomainRegistered2 = await instance.isRegisteredPublisherDomain(domain)
    assert.equal(isDomainRegistered2, true)
  })

  it('should not be able add publisher to registry with same public key', async () => {
    const instance = await DLS.deployed()

    // same pub key as prevous test
    const publisher = accounts[1]
    const domain = 'hello.com'
    const actualDomain = 'example.com'
    const domainHash = `0x${soliditySHA3(['bytes32'], [domain]).toString('hex')}`

    const isRegistered = await instance.isRegisteredPublisher(publisher)
    assert.equal(isRegistered, true)

    const isDomainRegistered = await instance.isRegisteredPublisherDomain(domain)
    assert.equal(isDomainRegistered, false)

    try {
      await instance.registerPublisher(domain, publisher, {from: owner})
    } catch (error) {
      assert.notEqual(error, undefined)
    }

    const publisher2 = await instance.publishers.call(domainHash)

    assert.equal(parseInt(publisher2, 16), 0)

    const isRegistered2 = await instance.isRegisteredPublisher(publisher)
    assert.equal(isRegistered2, true)

    const isDomainRegistered2 = await instance.isRegisteredPublisherDomain(domain)
    assert.equal(isDomainRegistered2, false)

    const isDomainRegistered3 = await instance.isRegisteredPublisherDomain(actualDomain)
    assert.equal(isDomainRegistered3, true)
  })

  it('should not be able to add seller if not registered as publisher', async () => {
    const instance = await DLS.deployed()

    const publisher = accounts[6]
    const pubDomain = 'example.com'
    const sellerDomain = 'openx.com'
    const sellerId = '1234'
    const rel = Relationship.Direct

    const hash = `0x${soliditySHA3(['string', 'string', 'uint8'], [sellerDomain, sellerId, rel]).toString('hex')}`

    let _err = null

    try {
      await instance.addSeller(hash, {from: publisher})
    } catch (error) {
      _err = error
    }

    assert.ok(_err !== null)
  })

  it('should add seller hash to publisher sellers', async () => {
    const instance = await DLS.deployed()

    const publisher = accounts[1]
    const pubDomain = 'example.com'
    const sellerDomain = 'openx.com'
    const sellerId = '1234'
    const rel = Relationship.Direct

    const hash = `0x${soliditySHA3(['string', 'string', 'uint8'], [sellerDomain, sellerId, rel]).toString('hex')}`

    await instance.addSeller(hash, {from: publisher})

    const eventObj = await getLastEvent(instance)
    assert.equal(eventObj.event, '_SellerAdded')

    const sellerHash = `0x${soliditySHA3(['string', 'string', 'uint8'], [sellerDomain, sellerId, rel]).toString('hex')}`
    const domainHash = `0x${soliditySHA3(['bytes32'], [pubDomain]).toString('hex')}`
    const sellerHash2 = await instance.sellers.call(domainHash, sellerHash)

    assert.equal(sellerHash2, sellerHash)
  })

  it('should remove seller from publisher sellers', async () => {
    const instance = await DLS.deployed()

    const publisher = accounts[1]
    const sellerId = accounts[2]
    const sellerDomain = 'example.com'
    const rel = Relationship.Reseller

    const sellerHash = `0x${soliditySHA3(['string', 'string', 'uint8'], [sellerDomain, sellerId, rel]).toString('hex')}`

    await instance.removeSeller(sellerHash, {from: publisher})

    const isSeller = await instance.isSellerForPublisher.call(publisher, sellerDomain, sellerId, rel)
    assert.equal(isSeller, false)

    const hash = await instance.sellers.call(publisher, sellerId)

    assert.equal(hash, 0)
  })

  it('should deregister publisher from registry', async () => {
    const instance = await DLS.deployed()

    const publisher = accounts[1]
    const domain = 'example.com'

    await instance.deregisterPublisher(publisher, {from: owner})
    const domainHash = `0x${soliditySHA3(['bytes32'], [domain]).toString('hex')}`
    const [publisher2] = await instance.publishers.call(domainHash)

    assert.equal(publisher2, 0)

    const domain2 = await instance.domains.call(publisher)
    assert.equal(parseInt(domain2, 16), 0)

    const isRegistered = await instance.isRegisteredPublisher(publisher)
    assert.equal(isRegistered, false)

    const isDomainRegistered = await instance.isRegisteredPublisherDomain(domain)
    assert.equal(isDomainRegistered, false)
  })

  it('should be able to change owner if owner', async () => {
    const instance = await DLS.deployed()

    const owner = await instance.owner.call()
    assert.equal(owner, accounts[0])

    const newOwner = accounts[1]
    await instance.changeOwner(newOwner)
    const owner2 = await instance.owner.call()
    assert.equal(owner2, newOwner)
  })

  it('should not be able to change owner if not owner', async () => {
    const instance = await DLS.deployed()

    const owner = await instance.owner.call()
    assert.equal(owner, accounts[1])

    const newOwner = accounts[2]
    try {
      await instance.changeOwner(newOwner, {from: accounts[0]})
      const owner2 = await instance.owner.call()
      assert.notEqual(owner2, newOwner)
    } catch (error) {
      assert.notEqual(error, undefined)
    }
  })
})
