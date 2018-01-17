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
    const domainHash = `0x${soliditySHA3(['bytes32'], [domain]).toString('hex')}`

    const isRegistered = await instance.isRegisteredPublisher(publisher)
    assert.equal(isRegistered, false)

    const isDomainRegistered = await instance.isRegisteredPublisherDomain(domain)
    assert.equal(isDomainRegistered, false)

    // register domain for publisher address
    await instance.registerPublisher(domain, publisher, {from: owner})
    const publisher2 = await instance.domains.call(domainHash)

    // structs returned as array, must know order in contract
    assert.equal(publisher2[1], publisher)

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
    const publisher3 = await instance.domains.call(domainHash)

    // domain registered to new publisher address
    assert.equal(publisher3[1], updateToPublisher)
    assert.notEqual(publisher3[1], publisher)

    const isRegistered3 = await instance.isRegisteredPublisher(publisher)
    assert.equal(isRegistered3, false)

    const isRegistered4 = await instance.isRegisteredPublisher(updateToPublisher)
    assert.equal(isRegistered4, true)

    // Update publisher back
    await instance.updatePublisher(domain, publisher, {from: owner})
    const publisher4 = await instance.domains.call(domainHash)

    assert.equal(publisher4[1], publisher)
  })

  it('should be able add publisher to registry with same public key', async () => {
    const instance = await DLS.deployed()

    // same pub key as prevous test
    const publisher = accounts[1]
    const domain = 'hello.com'
    const actualDomain = 'example.com'
    const domainHash = `0x${soliditySHA3(['bytes32'], [domain]).toString('hex')}`
    const actualDomainHash = `0x${soliditySHA3(['bytes32'], [actualDomain]).toString('hex')}`

    // Check publisher still registered 
    const isRegistered = await instance.isRegisteredPublisher(publisher)
    assert.equal(isRegistered, true)

    // domain not registered yet
    const isDomainRegistered = await instance.isRegisteredPublisherDomain(domain)
    assert.equal(isDomainRegistered, false)

    // actual domain already registered
    const isActualDomainRegistered = await instance.isRegisteredPublisherDomain(actualDomain)
    assert.equal(isActualDomainRegistered, true)

    try {
      await instance.registerPublisher(domain, publisher, {from: owner})
    } catch (error) {
      assert.notEqual(error, undefined)
    }

    //Make sure publisher is registered to domain
    const publisher2 = await instance.domains.call(domainHash)
    assert.equal(publisher2[1], publisher)

    const publisher3 = await instance.domains.call(actualDomainHash)
    assert.equal(publisher3[1], publisher)

    const isDomainRegistered2 = await instance.isRegisteredPublisherDomain(domain)
    assert.equal(isDomainRegistered2, true)

    const isDomainRegistered3 = await instance.isRegisteredPublisherDomain(actualDomain)
    assert.equal(isDomainRegistered3, true)

    // Deregister Publisher
    await instance.deregisterPublisher(domain, {from: owner})
    const isDomainRegistered4 = await instance.isRegisteredPublisherDomain(domain)
    assert.equal(isDomainRegistered4, false)

  })

  it('should not be able to add seller if not registered as publisher', async () => {
    const instance = await DLS.deployed()

    const publisher = accounts[6]
    const pubDomain = 'example.com'
    const sellerDomain = 'openx.com'
    const pubsAccountId = '1234'
    const rel = Relationship.Direct
    const optional = ''

    const sellerHash = `0x${soliditySHA3(['string', 'string', 'uint8', 'string'], [sellerDomain, pubsAccountId, rel, optional]).toString('hex')}`

    let _err = null

    try {
      await instance.addSeller(pubDomain, sellerHash, {from: publisher})
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

    const sellerHash = `0x${soliditySHA3(['string', 'string', 'uint8', 'string'], [sellerDomain, pubsAccountId, rel, optional]).toString('hex')}`

    await instance.addSeller(pubDomain, sellerHash, {from: publisher})

    const eventObj = await getLastEvent(instance)
    assert.equal(eventObj.event, '_SellerAdded')

    const domainHash = `0x${soliditySHA3(['bytes32'], [pubDomain]).toString('hex')}`
    const isSeller = await instance.isSellerForPublisher(pubDomain, sellerDomain, pubsAccountId, rel, optional);
    //const sellerHash2 = await instance.sellers.call(domainHash, sellerHash)
    assert(isSeller, true)

    //assert.equal(sellerHash2, sellerHash)
  })

  it('should add multiple seller hashes to publisher sellers', async () => {
    const instance = await DLS.deployed()

    const publisher = accounts[1]
    const pubDomain = 'example.com'
    const domainHash = `0x${soliditySHA3(['bytes32'], [pubDomain]).toString('hex')}`

    const sellersList = [`0x${hash_A.toString('hex')}`, `0x${hash_B.toString('hex')}`, `0x${hash_C.toString('hex')}`]

    const result = await instance.addSellers(pubDomain, sellersList, {
      from: publisher
    })

    const eventObj = await getLastEvent(instance)
    assert.equal(eventObj.event, '_SellerAdded')

    // Make sure all sellers added
    const sellerHash_Result_A = await instance.isSellerForPublisher(pubDomain, sellerDomain_A, pubsAccountId_A, sellerRel_A, sellerOptional_A);
    const sellerHash_Result_B = await instance.isSellerForPublisher(pubDomain, sellerDomain_B, pubsAccountId_B, sellerRel_B, sellerOptional_B);
    const sellerHash_Result_C = await instance.isSellerForPublisher(pubDomain, sellerDomain_C, pubsAccountId_C, sellerRel_C, sellerOptional_C);

    assert(sellerHash_Result_A, true)
    assert(sellerHash_Result_B, true)
    assert(sellerHash_Result_C, true)

    // test max number of sellers possible in one tx
    const MAX_SELLERS_TO_ADD = 88;
    const sellersList_B = []
    for (var i = 0; i < MAX_SELLERS_TO_ADD; i++) {
        const hash_X = soliditySHA3(['string', 'string', 'uint8', 'string'], [sellerDomain_A, `${i}`, sellerRel_A, sellerOptional_A]);

        const sellerHash_X = `0x${hash_X.toString('hex')}`
        sellersList_B.push(sellerHash_X)
    }

    await instance.addSellers(pubDomain, sellersList_B, {
      from: publisher
    })

    // Make sure last seller inserted
    const sellerHash_Z = sellersList_B[sellersList_B.length-1]
    const sellerHash_Result_Z = await instance.isSellerForPublisher(pubDomain, sellerDomain_A, `149`, sellerRel_A, sellerOptional_A)
    assert.equal(sellerHash_Result_Z, true)
  })

  it('should update publisher to registry and sellers transferred along with it', async () => {
    const instance = await DLS.deployed()

    const publisher = accounts[1]
    const updateToPublisher = accounts[2]
    const domain = 'example.com'
    const domainHash = `0x${soliditySHA3(['bytes32'], [domain]).toString('hex')}`

    // Update publisher
    await instance.updatePublisher(domain, updateToPublisher, {from: owner})
    const publisher3 = await instance.domains.call(domainHash)

    // domain registered to new publisher address
    assert.equal(publisher3[1], updateToPublisher)
    assert.notEqual(publisher3[1], publisher)

    const isRegistered3 = await instance.isRegisteredPublisher(publisher)
    assert.equal(isRegistered3, false)

    const isRegistered4 = await instance.isRegisteredPublisher(updateToPublisher)
    assert.equal(isRegistered4, true)

    // Old publisher shoulnd't have sellers
    // Check if still seller
    const isSeller = await instance.isSellerForPublisher.call(domain, sellerDomain_A, pubsAccountId_A, sellerRel_A, sellerOptional_A)
    assert.equal(isSeller, true)

    const registeredPublisher = await instance.domains.call(domainHash);
    assert.equal(registeredPublisher[1], updateToPublisher);
    assert.notEqual(registeredPublisher[1], publisher);

    //  update publisher back to original account
    await instance.updatePublisher(domain, publisher, {from: owner})
    const publisher4 = await instance.domains.call(domainHash)    
    assert.equal(publisher4[1], publisher)
    assert.notEqual(publisher4[1], updateToPublisher)
  })

  it('should deregister publisher domain from registry', async () => {
    const instance = await DLS.deployed()

    const publisher = accounts[1]
    const domain = 'example.com'
    const domainHash = `0x${soliditySHA3(['bytes32'], [domain]).toString('hex')}`


    // Deregister Publisher
    await instance.deregisterPublisher(domain, {from: owner})
    const isDomainRegistered = await instance.isRegisteredPublisherDomain(domain)
    assert.equal(isDomainRegistered, false)
  })

  it('should reregister publisher and it should not have sellers still exist', async () => {
    const instance = await DLS.deployed()

    const publisher = accounts[1]
    const domain = 'example.com'

    // Check publiser not registered
    const isRegistered = await instance.isRegisteredPublisher(publisher)
    assert.equal(isRegistered, false)

    // Check domain registered
    const isDomainRegistered = await instance.isRegisteredPublisherDomain(domain)
    assert.equal(isDomainRegistered, false)

    // reregister publisher and domain
    await instance.registerPublisher(domain, publisher, {from: owner})
    const domainHash = `0x${soliditySHA3(['bytes32'], [domain]).toString('hex')}`
    const publisher2 = await instance.domains.call(domainHash)

    assert.equal(publisher2[1], publisher)

    const isRegistered2 = await instance.isRegisteredPublisher(publisher)
    assert.equal(isRegistered2, true)

    const isDomainRegistered2 = await instance.isRegisteredPublisherDomain(domain)
    assert.equal(isDomainRegistered2, true)

    // Make sure sellers don't exists anymore after reregistering
    const sellerHash_Result_A = await instance.isSellerForPublisher(domain, sellerDomain_A, pubsAccountId_A, sellerRel_A, sellerOptional_A);
    const sellerHash_Result_B = await instance.isSellerForPublisher(domain, sellerDomain_B, pubsAccountId_B, sellerRel_B, sellerOptional_B);
    const sellerHash_Result_C = await instance.isSellerForPublisher(domain, sellerDomain_C, pubsAccountId_C, sellerRel_C, sellerOptional_C);

    assert.equal(sellerHash_Result_A, false)
    assert.equal(sellerHash_Result_B, false)
    assert.equal(sellerHash_Result_C, false)

    // Add sellers back in
    const sellersList = [`0x${hash_A.toString('hex')}`, `0x${hash_B.toString('hex')}`, `0x${hash_C.toString('hex')}`]
    const result = await instance.addSellers(domain, sellersList, {
      from: publisher
    })

    const eventObj = await getLastEvent(instance)
    assert.equal(eventObj.event, '_SellerAdded')

  })

  it('should remove seller from publisher sellers', async () => {
    const instance = await DLS.deployed()

    const publisher = accounts[1]
    const domain = 'example.com'

    await instance.removeSeller(domain, sellerHash_A, {from: publisher})

    const eventObj = await getLastEvent(instance)
    assert.equal(eventObj.event, '_SellerRemoved')

    const sellerHash_Result_A = await instance.isSellerForPublisher(domain, sellerDomain_A, pubsAccountId_A, sellerRel_A, sellerOptional_A);
    assert.equal(sellerHash_Result_A, false)
  })

  it('should remove multiple seller hashes from publisher sellers', async () => {
    const instance = await DLS.deployed()

    const publisher = accounts[1]
    const domain = 'example.com'
    const domainHash = `0x${soliditySHA3(['bytes32'], [domain]).toString('hex')}`

    const sellersList = [sellerHash_B. sellerHash_C]

    var result = await instance.removeSellers(domain, sellersList, {
      from: publisher
    })

    const eventObj = await getLastEvent(instance)
    assert.equal(eventObj.event, '_SellerRemoved')

    const sellerHash_Result_B = await instance.isSellerForPublisher(domain, sellerDomain_B, pubsAccountId_B, sellerRel_B, sellerOptional_B);
    const sellerHash_Result_C = await instance.isSellerForPublisher(domain, sellerDomain_C, pubsAccountId_C, sellerRel_C, sellerOptional_C);

    assert.equal(sellerHash_Result_B, false)
    assert.equal(sellerHash_Result_C, false)
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
