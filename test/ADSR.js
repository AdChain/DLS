const ADSR = artifacts.require('./ADSR.sol')

const Relationship = {
  Direct: 0,
  Reseller: 1
}

contract('ADSR', function (accounts) {
  const owner = accounts[0]

  it('should add publisher to registry', async () => {
    const instance = await ADSR.deployed()

    const id = accounts[1]
    const domain = 'nytimes.com'
    const name = 'New York Times'

    await instance.registerPublisher(id, domain, name, {from: owner})
    const [id2, domain2, name2] = await instance.publishers.call(id)

    assert.equal(id2, id)
    assert.equal(domain2, domain)
    assert.equal(name2, name)
  })

  it('should add seller to publisher sellers', async () => {
    const instance = await ADSR.deployed()

    const publisher = accounts[1]
    const id = accounts[2]
    const domain = 'google.com'
    const rel = Relationship.Reseller

    await instance.addSeller(id, domain, rel, {from: publisher})

    const [id2, domain2, rel2] = await instance.sellers.call(publisher, id)

    assert.equal(id2, id)
    assert.equal(domain2, domain)
    assert.equal(rel2, rel)
  })

  it('should remove seller from publisher sellers', async () => {
    const instance = await ADSR.deployed()

    const publisher = accounts[1]
    const id = accounts[2]

    await instance.removeSeller(id, {from: publisher})

    const [id2] = await instance.sellers.call(publisher, id)

    assert.equal(id2, 0)
  })

  it('should deregister publisher from registry', async () => {
    const instance = await ADSR.deployed()

    const publisher = accounts[1]

    await instance.deregisterPublisher(publisher, {from: owner})
    const [id] = await instance.publishers.call(publisher)

    assert.equal(id, 0)
  })
})
