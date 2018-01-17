pragma solidity ^0.4.4;


contract DLS {
  /*
   * The various types of relationships
   * (can be extended along with ads.txt spec)
   */
  enum Relationship {
    Null,
    Direct,
    Reseller
  }

  struct Domain {
    uint domainsListIndex; // index of domain in publisher["0x12345"][domainsListIndex]
    address publisherKey; // refer to owner of domain, publisherAddress
    uint publisherIndex;
  }

  /**
   * @notice a mapping of publisher public keys to array of domains
   *
   * @example 
   * publisher["0x12345"][0] = keccek256(domain)
   */
  mapping (address => bytes32[]) public publishers;
  //bytes32[] public publisherList; // allows sequential access

  /**
   * @notice a mapping of domainHash to Domain Struct 
   *
   * @example
   * "keccak256" -> Domain struct 
   */
  mapping (bytes32 => Domain) public domains; // allows random access
  bytes32[] public domainsList; // sequential access


   /**
    * @notice a mapping of publisher domainHashes to
    * their hashes of authorized sellers
    *
    * @example example
    * sellers[keccak256(domain)][sellerHash] -> sellerListIndex 
    */
  mapping (bytes32 => mapping (bytes32 => uint)) public sellers; // stores index in sellerList
  mapping (bytes32 => bytes32[]) public sellerList; // allow sequential access

  /**
   * @notice The owner of this contract.
   */
  address public owner;

  /**
   * Events, when triggered, record logs in the blockchain.
   * Clients can listen on specific events to fetch data.
   */
  event _PublisherRegistered(bytes32 indexed publisherDomain, address indexed publisherKey);
  event _PublisherUpdated(bytes32 indexed publisherDomain, address indexed publisherKey);
  event _PublisherDeregistered(bytes32 indexed publisherDomain, address indexed publisherKey);
  event _SellerAdded(bytes32 indexed publisherDomain, bytes32 indexed sellerHash);
  event _SellerRemoved(bytes32 indexed publisherDomain, bytes32 indexed sellerHash);

  /**
   * @notice modifier which limits execution
   * of the function to the owner.
   */
  modifier onlyOwner() {
    require(msg.sender == owner);

    // continue with code execution
    _;
  }

  /**
   * @notice modifier which checks if sender is
   * a registered publisher of domain
   */
  modifier isRegistered(bytes32 domain) {
    require(domains[keccak256(domain)].publisherKey == msg.sender);

    // continue with code execution
    _;
  }

  /**
   * @notice modifier which checks that
   * publisher doesn't exist. No domains registered to publisher
   */
  modifier publisherDoesNotExist(address pubKey) {
    require(publishers[pubKey].length > 0);

    _;
  }

  /*
   * @notice The constructor function,
   * called only once when this contract is initially deployed.
   */
  function DLS() {
    owner = msg.sender;
  }

  /**
   * @notice Change owner of contract.
   * @param newOwner new owner address
   */
  function changeOwner(address newOwner) onlyOwner external {
    owner = newOwner;
  }

  function isPublisher(address pubKey) 
    public 
    constant 
    returns(bool isIndeed) 
  {
    // Check if publisher Address has any domains registered to it.
    return publishers[pubKey].length != 0;
  }
  
  function isDomain(bytes32 domain) 
    public 
    constant 
    returns(bool isIndeed) 
  {
    if (domainsList.length == 0) return false;
    return domains[keccak256(domain)].publisherKey != address(0);
  }

  /**
   * @notice Register new publisher.
   * Only the owner of the contract can register new publishers.
   * Publisher public key must not already exist in order to
   * be added or modified.
   * @param domain publisher domain
   * @param pubKey publisher public key
   */
  function registerPublisher(bytes32 domain, address pubKey) onlyOwner external {
    bytes32 domainHash = keccak256(domain);

    // Domain shouldn't be registered already
    require(!isDomain(domain));

    domains[domainHash].domainsListIndex = domainsList.push(domainHash) - 1;
    domains[domainHash].publisherKey = pubKey;
    domains[domainHash].publisherIndex = publishers[pubKey].push(domainHash) - 1;

    _PublisherRegistered(domain, pubKey);
  }

  /**
   * @notice Update new publisher.
   * Only the owner of the contract can update publishers.
   * Publisher public key must already exist in order to
   * be modified.
   * @param domain publisher domain
   * @param pubKey publisher public key
   */
  function updatePublisher(bytes32 domain, address pubKey) onlyOwner external {
    bytes32 domainHash = keccak256(domain);

    // Require domain registered
    require(domains[domainHash].publisherKey != address(0));

    address oldPubKey = domains[domainHash].publisherKey;

    // Rwquire pubKeys are different
    require(oldPubKey != pubKey);

    // Remove old publisher Key
    publishers[oldPubKey][domains[domainHash].publisherIndex] = publishers[oldPubKey][publishers[oldPubKey].length - 1];
    publishers[oldPubKey].length--; 

    // assign domain to new publisherKey
    domains[domainHash].publisherKey = pubKey;
    domains[domainHash].publisherIndex = publishers[pubKey].push(domainHash) - 1;

    _PublisherUpdated(domain, pubKey);
  }

  /**
   * @notice Deregister existing publisher.
   * Only contract owner is allowed to deregister.
   * @param domain to deregister 
   */
  function deregisterPublisher(bytes32 domain) onlyOwner external {
    bytes32 domainHash = keccak256(domain);
    address pubKey = domains[domainHash].publisherKey;
    uint pubIndex = domains[domainHash].publisherIndex;
    require(isDomain(domain));

    // Remove domain from publishers
    publishers[pubKey][pubIndex] = publishers[pubKey][publishers[pubKey].length - 1];
    // Update moved domain publisherIndex
    domains[publishers[pubKey][pubIndex]].publisherIndex = pubIndex;
    publishers[pubKey].length--;

    // Remove Domain
    domainsList[domains[domainHash].domainsListIndex] = domainsList[domainsList.length - 1];
    domainsList.length--;
    delete domains[domainHash];

    // remove sellers
    sellerList[domainHash].length = 0;

    _PublisherDeregistered(domain, pubKey);
  }

  /**
   * @notice Allow publisher to add a seller by the hash of the seller information.
   * @param domain to add seller
   * @param hash keccak256 hash of seller information
   */
  function addSeller(bytes32 domain, bytes32 hash) isRegistered(domain) public {
    bytes32 domainHash = keccak256(domain);

    sellers[domainHash][hash] = sellerList[domainHash].push(hash) - 1;
    _SellerAdded(domain, hash);
  }

  /**
   * @notice Allow publisher to add multiple sellers by providing an array of hashes of the seller information.
   * @param domain to add seller to 
   * @param hashes an array of hashes of seller information
   */
  function addSellers(bytes32 domain, bytes32[] hashes) isRegistered(domain) public {

    for (uint256 i = 0; i < hashes.length; i++) {
      addSeller(domain, hashes[i]);
    }
  }

  /**
   * @notice Remove seller from publisher
   * @param hash keccak256 hash of seller information
   */
  function removeSeller(bytes32 domain, bytes32 hash) isRegistered(domain) public {
    bytes32 domainHash = keccak256(domain);
    uint numSellers = sellerList[domainHash].length;
    uint sellerIndex = sellers[domainHash][hash];
    require(domains[domainHash].publisherKey == msg.sender);
    require(numSellers != 0);
    require(sellerIndex < numSellers);

    sellerList[domainHash][sellerIndex] = sellerList[domainHash][sellerList[domainHash].length - 1];

    sellers[domainHash][hash] = numSellers; // set index out of range
    sellerList[domainHash].length--;
    _SellerRemoved(domain, hash);
  }

  /**
   * @notice Allow publisher to remove multiple sellers by providing an array of hashes of the seller information.
   * @param hashes an array of hashes of the seller information
   */
  function removeSellers(bytes32 domain, bytes32[] hashes) isRegistered(domain) public {
    require(domains[keccak256(domain)].publisherKey == msg.sender);

    for (uint256 i = 0; i < hashes.length; i++) {
      removeSeller(domain, hashes[i]);
    }
  }

  /**
    * @notice Get publisher public key from domain name
    * @param publisherDomain domain of publisher
    * @return publisher public key
    */
  function getPublisherFromDomain(string publisherDomain) public constant returns (address) {
    return domains[keccak256(publisherDomain)].publisherKey;
  }

  /**
   * @notice Check if publisher is registered.
   * @param pubKey pubisher public key
   * @return bool
   */
  function isRegisteredPublisher(address pubKey) external constant returns (bool) {
    return (publishers[pubKey].length > 0);
  }

  /**
   * @notice Check if publisher is registered by domain
   * @param domain pubisher domain
   * @return bool
   */
  function isRegisteredPublisherDomain(bytes32 domain) external constant returns (bool) {
    return (domains[keccak256(domain)].publisherKey != address(0));
  }

  /**
   * @notice Return true if is seller for publisher
   * @param pubDomain publisher public key
   * @param sellerDomain domain of seller
   * @param pubsAccountId ID associated with seller or reseller in advertising system 
   * @param sellerRel Relationship of seller. (Direct: 0, Reseller: 1)
   * @param optional Optional Params (tagId, format, region)
   * @return boolean
   */
  function isSellerForPublisher(
    bytes32 pubDomain,
    string sellerDomain,
    string pubsAccountId,
    Relationship sellerRel,
    string optional
  )
  external
  constant
  returns (bool) 
  {
    bytes32 hash = keccak256(sellerDomain, pubsAccountId, sellerRel, optional);

    uint sellerIndex = sellers[keccak256(pubDomain)][hash];
    if (sellerList[keccak256(pubDomain)].length == 0) {
      return false;
    }

    return (sellerIndex < sellerList[keccak256(pubDomain)].length);
  }
}

