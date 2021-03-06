// TODO: clean up tests

const DLS = artifacts.require('./DLS.sol')
const sha3 = require('solidity-sha3').default
const {soliditySHA3} = require('ethereumjs-abi')

const Relationship = {
  Null: 0,
  Direct: 1,
  Reseller: 2
}

const sellerDomain_A = 'a.com'
const pubsAccountId_A = 'a-123'
const sellerRel_A = Relationship.Direct
const sellerOptional_A = 'a-optional' 

const sellerDomain_B = 'b.com'
const pubsAccountId_B = 'b-123'
const sellerRel_B = Relationship.Reseller
const sellerOptional_B = 'b-optional' 

const sellerDomain_C = 'c.com'
const pubsAccountId_C = 'c-123'
const sellerRel_C = Relationship.Direct
const sellerOptional_C = 'c-optional' 

const hash_A = soliditySHA3(['string', 'string', 'uint8', 'string'], [sellerDomain_A, pubsAccountId_A, sellerRel_A, sellerOptional_A]);
const hash_B = soliditySHA3(['string', 'string', 'uint8', 'string'], [sellerDomain_B, pubsAccountId_B, sellerRel_B, sellerOptional_B]);
const hash_C = soliditySHA3(['string', 'string', 'uint8', 'string'], [sellerDomain_C, pubsAccountId_C, sellerRel_C, sellerOptional_C]);

const sellerHash_A = `0x${hash_A.toString('hex')}`
const sellerHash_B = `0x${hash_B.toString('hex')}`
const sellerHash_C = `0x${hash_C.toString('hex')}`


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

  it('should update publisher to registry', async () => {
    const instance = await DLS.deployed()

    const publisher = accounts[1]
    const updateToPublisher = accounts[2]
    const domain = 'example.com'
    const domainHash = `0x${soliditySHA3(['bytes32'], [domain]).toString('hex')}`

    // Update publisher
    await instance.updatePublisher(domain, updateToPublisher, {from: owner})
    const publisher3 = await instance.publishers.call(domainHash)

    assert.equal(publisher3, updateToPublisher)

    const isRegistered3 = await instance.isRegisteredPublisher(publisher)
    assert.equal(isRegistered3, false)

    const isRegistered4 = await instance.isRegisteredPublisher(updateToPublisher)
    assert.equal(isRegistered4, true)

    // Update publisher back
    await instance.updatePublisher(domain, publisher, {from: owner})
    const publisher4 = await instance.publishers.call(domainHash)

    assert.equal(publisher4, publisher)
  })

/*  it('should be able add publisher to registry with same public key', async () => {
    const instance = await DLS.deployed()

    // same pub key as prevous test
    const publisher = accounts[1]
    const domain = 'hello.com'
    const actualDomain = 'example.com'
    const domainHash = `0x${soliditySHA3(['bytes32'], [domain]).toString('hex')}`

    const isRegistered = await instance.isRegisteredPublisher(publisher, actualDomain)
    assert.equal(isRegistered, true)

    const isDomainRegistered = await instance.isRegisteredPublisherDomain(domain)
    assert.equal(isDomainRegistered, false)

    try {
      await instance.registerPublisher(domain, publisher, {from: owner})
    } catch (error) {
      assert.notEqual(error, undefined)
    }

    const publisher2 = await instance.publishers.call(domainHash)

    assert.equal(parseInt(publisher2, 16), publisher)

    const isRegistered2 = await instance.isRegisteredPublisher(publisher, domain)
    assert.equal(isRegistered2, true)

    const isRegistered3 = await instance.isRegisteredPublisher(publisher, actualDomain)
    assert.equal(isRegistered3, true)

    const isDomainRegistered2 = await instance.isRegisteredPublisherDomain(domain)
    assert.equal(isDomainRegistered2, true)

    const isDomainRegistered3 = await instance.isRegisteredPublisherDomain(actualDomain)
    assert.equal(isDomainRegistered3, true)
  })*/

  it('should not be able to add seller if not registered as publisher', async () => {
    const instance = await DLS.deployed()

    const publisher = accounts[6]
    const pubDomain = 'example.com'
    const sellerDomain = 'openx.com'
    const pubsAccountId = '1234'
    const rel = Relationship.Direct
    const optional = ''

    const hash = `0x${soliditySHA3(['string', 'string', 'uint8', 'string'], [sellerDomain, pubsAccountId, rel, optional]).toString('hex')}`

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
    const pubsAccountId = '1234'
    const rel = Relationship.Direct
    const optional = ''

    const hash = `0x${soliditySHA3(['string', 'string', 'uint8', 'string'], [sellerDomain, pubsAccountId, rel, optional]).toString('hex')}`

    await instance.addSeller(hash, {from: publisher})

    const eventObj = await getLastEvent(instance)
    assert.equal(eventObj.event, '_SellerAdded')

    const sellerHash = `0x${soliditySHA3(['string', 'string', 'uint8', 'string'], [sellerDomain, pubsAccountId, rel, optional]).toString('hex')}`
    const domainHash = `0x${soliditySHA3(['bytes32'], [pubDomain]).toString('hex')}`
    const sellerHash2 = await instance.sellers.call(domainHash, sellerHash)

    assert.equal(sellerHash2, sellerHash)
  })

  it('should add multiple seller hashes to publisher sellers', async () => {
    const instance = await DLS.deployed()

    const publisher = accounts[1]
    const pubDomain = 'example.com'

    const sellersList = [`0x${hash_A.toString('hex')}`, `0x${hash_B.toString('hex')}`, `0x${hash_C.toString('hex')}`]

    const result = await instance.addSellers(sellersList, {
      from: publisher
    })

    const eventObj = await getLastEvent(instance)
    assert.equal(eventObj.event, '_SellerAdded')

    const domainHash = `0x${soliditySHA3(['bytes32'], [pubDomain]).toString('hex')}`
    const sellerHash_Result_A = await instance.sellers.call(domainHash, sellerHash_A)
    const sellerHash_Result_B = await instance.sellers.call(domainHash, sellerHash_B)
    const sellerHash_Result_C = await instance.sellers.call(domainHash, sellerHash_C)

    assert.equal(sellerHash_Result_A, sellerHash_A)
    assert.equal(sellerHash_Result_B, sellerHash_B)
    assert.equal(sellerHash_Result_C, sellerHash_C)

    // test max number of sellers possible in one tx
    const sellersList_B = []
    for (var i = 0; i < 150; i++) {
      sellersList_B.push(`0x${soliditySHA3(['string'], [`${i}`]).toString('hex')}`)
    }

    await instance.addSellers(sellersList_B, {
      from: publisher
    })

    const sellerHash_Z = sellersList_B[sellersList_B.length-1]

    const sellerHash_Result_Z = await instance.sellers.call(domainHash, sellerHash_Z)
    assert.equal(sellerHash_Result_Z, sellerHash_Z)
  })

  it('should update publisher to registry and sellers transferred along with it', async () => {
    const instance = await DLS.deployed()

    const publisher = accounts[1]
    const updateToPublisher = accounts[2]
    const domain = 'example.com'
    const domainHash = `0x${soliditySHA3(['bytes32'], [domain]).toString('hex')}`

    // Update publisher
    await instance.updatePublisher(domain, updateToPublisher, {from: owner})
    const publisher3 = await instance.publishers.call(domainHash)
    assert.equal(publisher3, updateToPublisher)

    const isRegistered3 = await instance.isRegisteredPublisher(publisher)
    assert.equal(isRegistered3, false)

    const isRegistered4 = await instance.isRegisteredPublisher(updateToPublisher)
    assert.equal(isRegistered4, true)

    // Old publisher shoulnd't have sellers
    const isSeller = await instance.isSellerForPublisher.call(publisher, sellerDomain_A, pubsAccountId_A, sellerRel_A, sellerOptional_A)
    assert.equal(isSeller, false)

    // New publisher should have sellers
    const isSeller2 = await instance.isSellerForPublisher.call(updateToPublisher, sellerDomain_A, pubsAccountId_A, sellerRel_A, sellerOptional_A)
    assert.equal(isSeller2, true)

    //  update publisher back to original account
    await instance.updatePublisher(domain, publisher, {from: owner})
    const publisher4 = await instance.publishers.call(domainHash)    
    assert.equal(publisher4, publisher)
  })

  it('should deregister publisher from registry', async () => {
    const instance = await DLS.deployed()

    const publisher = accounts[1]
    const domain = 'example.com'

    await instance.deregisterPublisher(domain, {from: owner})
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

  it('should reregister publisher and it should not have sellers still exist', async () => {
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

    const sellerHash_Result_A = await instance.sellers.call(domainHash, sellerHash_A)
    const sellerHash_Result_B = await instance.sellers.call(domainHash, sellerHash_B)
    const sellerHash_Result_C = await instance.sellers.call(domainHash, sellerHash_C)

    // TODO: Remove
    assert.equal(sellerHash_Result_A, sellerHash_A)
    assert.equal(sellerHash_Result_B, sellerHash_B)
    assert.equal(sellerHash_Result_C, sellerHash_C)

    // TODO: Uncomment after fixing seller removal
    /*assert.notEqual(sellerHash_Result_A, sellerHash_A)
    assert.notEqual(sellerHash_Result_B, sellerHash_B)
    assert.notEqual(sellerHash_Result_C, sellerHash_C)

    assert.equal(parseInt(sellerHash_Result_A, 16), 0)
    assert.equal(parseInt(sellerHash_Result_B, 16), 0)
    assert.equal(parseInt(sellerHash_Result_C, 16), 0)*/
  })

  it('should remove seller from publisher sellers', async () => {
    const instance = await DLS.deployed()

    const publisher = accounts[1]
    const domain = 'example.com'
    const pubsAccountId = accounts[2]
    const sellerDomain = 'example.com'
    const rel = Relationship.Reseller
    const optional = ''

    const sellerHash = `0x${soliditySHA3(['string', 'string', 'uint8', 'string'], [sellerDomain, pubsAccountId, rel, optional]).toString('hex')}`

    await instance.removeSeller(sellerHash, {from: publisher})

    const isSeller = await instance.isSellerForPublisher.call(publisher,sellerDomain, pubsAccountId, rel, optional)
    assert.equal(isSeller, false)

    const hash = await instance.sellers.call(publisher, pubsAccountId)

    assert.equal(parseInt(hash, 16), 0)
  })

  it('should remove multiple seller hashes from publisher sellers', async () => {
    const instance = await DLS.deployed()

    const publisher = accounts[1]
    const pubDomain = 'example.com'

    const sellersList = [`0x${hash_A.toString('hex')}`, `0x${hash_B.toString('hex')}`, `0x${hash_C.toString('hex')}`]

    var result = await instance.removeSellers(sellersList, {
      from: publisher
    })

    const eventObj = await getLastEvent(instance)
    assert.equal(eventObj.event, '_SellerRemoved')

    const domainHash = `0x${soliditySHA3(['bytes32'], [pubDomain]).toString('hex')}`
    const sellerHash_Result_A = await instance.sellers.call(domainHash, sellerHash_A)
    const sellerHash_Result_B = await instance.sellers.call(domainHash, sellerHash_B)
    const sellerHash_Result_C = await instance.sellers.call(domainHash, sellerHash_C)

    assert.equal(parseInt(sellerHash_Result_A, 16), 0)
    assert.equal(parseInt(sellerHash_Result_B, 16), 0)
    assert.equal(parseInt(sellerHash_Result_C, 16), 0)
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
