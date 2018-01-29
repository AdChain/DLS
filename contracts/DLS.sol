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

  /**
   * @notice a mapping of domains to publisher public keys
   *
   * @example
   * "nytimes.com" -> "0x123...abc"
   * publishers[domainHash] = pubKey
   */
  mapping (bytes32 => address) public publishers;

  /**
   * @notice a mapping of publisher public keys and domainHash to domains
   *
   * @example
   * "0x123...abc" -> "nytimes.com"
   */
  mapping (address => bytes32) public domains;

   /**
    * @notice a mapping of publsher domains to
    * their hashes of authorized sellers
    *
    * @example example
    * sellers[keccak256(domain)][sellerHash] -> sellerHash
    */
  mapping (bytes32 => mapping (bytes32 => bytes32)) public sellers;

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
   * a registered publisher.
   */
  modifier isRegistered() {
    require(domains[msg.sender] != 0)
    // continue with code execution
    _;
  }

  /**
   * @notice modifier which checks that
   * publisher doesn't exist.
   */
  modifier publisherDoesNotExist(address pubKey) {
    require(domains[pubKey] == 0)
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

  /**
   * @notice Register new publisher.
   * Only the owner of the contract can register new publishers.
   * Publisher public key must not already exist in order to
   * be added or modified.
   * @param domain pubisher domain
   * @param pubKey pubisher public key
   */
  function registerPublisher(bytes32 domain, address pubKey) onlyOwner publisherDoesNotExist(pubKey) external {
    publishers[keccak256(domain)] = pubKey;
    domains[pubKey] = domain;
    _PublisherRegistered(domain, pubKey);
  }

  /**
   * @notice Update new publisher.
   * Only the owner of the contract can update publishers.
   * Publisher public key must already exist in order to
   * be modified.
   * @param domain pubisher domain
   * @param pubKey pubisher public key
   */
  function updatePublisher(bytes32 domain, address pubKey) onlyOwner external {
    bytes32 domainHash = keccak256(domain);
    require(publishers[domainHash] != address(0));

    // remove old publisher key
    address oldPubKey = publishers[domainHash];
    delete domains[oldPubKey];

    // Update Publisher pubKey 
    publishers[domainHash] = pubKey;
    domains[pubKey] = domain;

    _PublisherUpdated(domain, pubKey);
  }

  /**
   * @notice Deregister existing publisher.
   * Only contract owner is allowed to deregister.
   * @param domain pubisher public key
   */
  function deregisterPublisher(bytes32 domain) onlyOwner external {
    bytes32 domainHash = keccak256(domain);
    address pubKey = publishers[domainHash];
    require(publishers[domainHash] != address(0));
    // order matters here, delete pub from map first.
    delete publishers[domainHash];
    delete domains[pubKey];

    _PublisherDeregistered(domains[pubKey], pubKey);
  }

  /**
   * @notice Allow publisher to add a seller by the hash of the seller information.
   * @param hash keccak256 hash of seller information
   */
  function addSeller(bytes32 hash) isRegistered public {
    sellers[keccak256(domains[msg.sender])][hash] = hash;
    _SellerAdded(domains[msg.sender], hash);
  }

  /**
   * @notice Allow publisher to add multiple sellers by providing an array of hashes of the seller information.
   * @param hashes an array of hashes of seller information
   */
  function addSellers(bytes32[] hashes) isRegistered public {
    for (uint256 i = 0; i < hashes.length; i++) {
      addSeller(hashes[i]);
    }
  }

  /**
   * @notice Remove seller from publisher
   * @param hash keccak256 hash of seller information
   */
  function removeSeller(bytes32 hash) isRegistered public {
    delete sellers[keccak256(domains[msg.sender])][hash];
    _SellerRemoved(domains[msg.sender], hash);
  }

  /**
   * @notice Allow publisher to remove multiple sellers by providing an array of hashes of the seller information.
   * @param hashes an array of hashes of the seller information
   */
  function removeSellers(bytes32[] hashes) isRegistered public {
    for (uint256 i = 0; i < hashes.length; i++) {
      removeSeller(hashes[i]);
    }
  }

  /**
    * @notice Get publisher public key from domain name
    * @param publisherDomain domain of publisher
    * @return publisher public key
    */
  function getPublisherFromDomain(string publisherDomain) public constant returns (address) {
    return publishers[keccak256(publisherDomain)];
  }

  /**
   * @notice Check if publisher is registered.
   * @param pubKey pubisher public key
   * @return bool
   */
  function isRegisteredPublisher(address pubKey) external constant returns (bool) {
    return (domains[pubKey] != "");
  }

  /**
   * @notice Check if publisher is registered by domain
   * @param domain pubisher domain
   * @return bool
   */
  function isRegisteredPublisherDomain(bytes32 domain) external constant returns (bool) {
    return (publishers[keccak256(domain)] != address(0));
  }

  /**
   * @notice Return true if is seller for publisher
   * @param pubKey publisher public key
   * @param sellerDomain domain of seller
   * @param pubsAccountId ID associated with seller or reseller in advertising system 
   * @param sellerRel Relationship of seller. (Direct: 0, Reseller: 1)
   * @param optional Optional Params (tagId, format, region)
   * @return boolean
   */
  function isSellerForPublisher(
    address pubKey,
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
    return (sellers[keccak256(domains[pubKey])][hash] != "");
  }
}

