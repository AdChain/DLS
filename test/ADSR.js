const ADSR = artifacts.require('./ADSR.sol')

const Relationship = {
  Direct: 0,
  Reseller: 1
}

contract('ADSR', function (accounts) {
  it('should add publisher to registry', async () => {
    const instance = await ADSR.deployed()

    const id = accounts[1]
    const domain = 'nytimes.com'
    const name = 'New York Times'

    await instance.registerPublisher(id, domain, name, {from: accounts[0]})
    const [id2, domain2, name2] = await instance.publishers.call(id)

    assert.equal(id2, id)
    assert.equal(domain2, domain)
    assert.equal(name2, name)
  })

  it('should add reseller to publisher resellers', async () => {
    const instance = await ADSR.deployed()

    const publisher = accounts[1]
    const id = accounts[2]
    const domain = 'google.com'
    const rel = Relationship.Reseller

    await instance.addReseller(id, domain, rel, {from: publisher})

    const [id2, domain2, rel2] = await instance.resellers.call(publisher, id)

    assert.equal(id2, id)
    assert.equal(domain2, domain)
    assert.equal(rel2, rel)
  })

  it('should remove reseller from publisher resellers', async () => {
    const instance = await ADSR.deployed()

    const publisher = accounts[1]
    const id = accounts[2]

    await instance.removeReseller(id, {from: publisher})

    const [id2] = await instance.resellers.call(publisher, id)

    assert.equal(id2, 0)
  })
})
