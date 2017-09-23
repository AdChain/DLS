const DLS = artifacts.require('./DLS.sol')
const sha3 = require('solidity-sha3').default
const {soliditySHA3} = require('ethereumjs-abi')

const Relationship = {
  Direct: 0,
  Reseller: 1
}

contract('DLS', function (accounts) {
  const owner = accounts[0]

  it('should add publisher to registry', async () => {
    const instance = await DLS.deployed()

    const id = accounts[1]
    const domain = 'nytimes.com'
    const name = 'New York Times'

    const isRegistered = await instance.isRegisteredPublisher(id)
    assert.equal(isRegistered, false)

    const isDomainRegistered = await instance.isRegisteredPublisherDomain(domain)
    assert.equal(isDomainRegistered, false)

    await instance.registerPublisher(id, domain, name, {from: owner})
    const [id2, domain2, name2] = await instance.publishers.call(id)

    assert.equal(id2, id)
    assert.equal(domain2, domain)
    assert.equal(name2, name)

    const isRegistered2 = await instance.isRegisteredPublisher(id)
    assert.equal(isRegistered2, true)

    const isDomainRegistered2 = await instance.isRegisteredPublisherDomain(domain)
    assert.equal(isDomainRegistered2, true)
  })

  it('should add seller to publisher sellers', async () => {
    const instance = await DLS.deployed()

    const publisher = accounts[1]
    const id = accounts[2]
    const pubDomain = 'nytimes.com'
    const domain = 'google.com'
    const rel = Relationship.Reseller
    const tagId = ''

    await instance.addSeller(domain, id, rel, tagId, {from: publisher})


    /*
    // can't figure how to generate proper hash to test this
    const hash = soliditySHA3(['string', 'string'], [domain, id]).toString('hex')
    const [domain2, id2, rel2] = await instance.sellers.call(publisher, hash)

    assert.equal(id2, id)
    assert.equal(domain2, domain)
    assert.equal(rel2, rel)
    */

    const [domain3, id3, rel3] = await instance.getSellerForPublisher.call(publisher, domain, id)
    assert.equal(id3, id)
    assert.equal(domain3, domain)
    assert.equal(rel3, rel)

    const [domain4, id4, rel4] = await instance.getSellerForPublisherDomain.call(pubDomain, domain, id)
    assert.equal(id4, id)
    assert.equal(domain4, domain)
    assert.equal(rel4, rel)
  })

  it('should remove seller from publisher sellers', async () => {
    const instance = await DLS.deployed()

    const publisher = accounts[1]
    const id = accounts[2]
    const domain = 'nytimes.com'

    await instance.removeSeller(domain, id, {from: publisher})

    const [domain2, id2] = await instance.sellers.call(publisher, id)

    assert.equal(id2, 0)
  })

  it('should deregister publisher from registry', async () => {
    const instance = await DLS.deployed()

    const publisher = accounts[1]
    const domain = 'nytimes.com'

    await instance.deregisterPublisher(publisher, {from: owner})
    const [id, domain2, name] = await instance.publishers.call(publisher)

    assert.equal(id, 0)
    assert.equal(name, '')
    assert.equal(domain2, '')

    const id2 = await instance.domainPublisher.call(sha3(domain))
    assert.equal(id2, 0)

    const isRegistered = await instance.isRegisteredPublisher(publisher)
    assert.equal(isRegistered, false)

    const isDomainRegistered = await instance.isRegisteredPublisherDomain(domain)
    assert.equal(isDomainRegistered, false)
  })
})
