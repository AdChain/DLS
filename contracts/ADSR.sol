pragma solidity ^0.4.4;

contract ADSR {
  // A container for publisher profile metadata
  struct Publisher {
    address id; // 0xabcde1234...20
    string domain; // nytimes.com
    string name; // New York Times
  }

  /*
   * A container for publisher-reseller relationship data.
   * This is the equivalent of a single row in ads.txt
   */
  struct Reseller {
    address id;
    string domain;
    Relationship rel;
  }

  // The various types of relationships (can be extended along with ads.txt spec)
  enum Relationship { Direct, Reseller }

  // 1. a mapping of publisher addresses to their profile metadata
  mapping (address => Publisher) public publishers;
  // 0xabcd -> Publisher = { address: 0xabcd, string: nytimes.com, name: New York Times }
  // publishers[0xabcd]

  // 2. a mapping of publisher addresses to their authorized resellers and their data
  mapping (address => mapping (address => Reseller)) public resellers;
  // resellers[publisherAddress][resellerAddress] -> Reseller
  // resellers[publisherAddress2][resellerAddress] -> Reseller
  // resellers[publisherAddress][resellerAddress2] -> Reseller

  // Publishers ads.txt
  // Row 1 - reseller1.com, 1293sdf, direct, tagId
  // Row 2 - reseller2.com, 1293sdf, direct, tagId

  // The owner of this contract (could be another contract e.g. the adchain registry)
  address owner;

  // events, when triggered, record logs in the blockchain
  // clients can listen on specific events to get fresh data
  event PublisherRegistered(address indexed id);
  event PublisherDeregistered(address indexed id);
  event ResellerAdded(address indexed publisherId, address indexed resellerId);
  event ResellerRemoved(address indexed publisherId, address indexed resellerId);

  // A function modifier which limits execution of the function to the "owner"
  modifier only_owner() {
    if (msg.sender != owner) {
      revert();
    }
    _;
  }

  // The constructor function, called only once when this contract is initially deployed
  function ADSR() {
    owner = msg.sender;
  }

  // Only the owner of the contract can register new publishers
  function registerPublisher(address id, string domain, string name) only_owner {
    publishers[id] = Publisher(id, domain, name);
    PublisherRegistered(id);
  }

  // The owner can also deregister existing publishers
  // (e.g. fail to renew adchain registry membership)
  function deregisterPublisher(address id) only_owner {
    PublisherDeregistered(id);
    delete publishers[id];
  }

  // Once registered, publishers are free to add certified resellers
  function addReseller(address id, string domain, Relationship rel) {
    // First, check that this ethereum address is a registered publisher
    // If their "id" has been set, then they have been registered by the owner
    // Note - in Ethereum, mapping values are initiated to all 0s if not set
    if (publishers[msg.sender].id != 0) {
      resellers[msg.sender][id] = Reseller(id, domain, rel);
      ResellerAdded(msg.sender, id);
    }
  }

  // Publishers can also remove resellers at will
  function removeReseller(address id) {
    // First, check that this ethereum address is a registered publisher
    if (publishers[msg.sender].id != 0) {
      delete resellers[msg.sender][id];
      ResellerRemoved(msg.sender, id);
    }
  }
}
