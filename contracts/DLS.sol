pragma solidity ^0.4.4;


contract DLS {
  /*
   * A container for publisher-reseller relationship data.
   * This is the equivalent of a single row in ads.txt
   */
  struct Seller {
    string domain; // SSP/Exchange Domain
    string id; // SellerAccountID
    Relationship rel; // PaymentsType
    string tagId; // TAGID - Trustworthy Accountability Group ID
    bytes32 hash; // hash of: (domain, id, rel)
  }

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
   */
  mapping (bytes32 => address) public publishers;

  /**
   * @notice a mapping of publisher public keys to domains
   *
   * @example
   * "0x123...abc" -> "nytimes.com"
   */
  mapping (address => bytes32) public domains;

   /**
    * @notice a mapping of publsher domains to
    * their authorized sellers and their data.
    *
    * @example example
    * sellers[sha3(domain)][sellerHash] -> Seller
    *
    * Publishers ads.txt
    * Row 1 - reseller1.com, 1293sdf, direct, tagId, hash
    * Row 2 - reseller2.com, 1293sdf, reseller, tagId, hash
    */
  mapping (bytes32 => mapping (bytes32 => Seller)) public sellers;

  /**
   * @notice The owner of this contract.
   */
  address public owner;

  /**
   * Events, when triggered, record logs in the blockchain.
   * Clients can listen on specific events to fetch data.
   */
  event _PublisherRegistered(bytes32 indexed publisherDomain, address indexed publisherKey);
  event _PublisherDeregistered(bytes32 indexed publisherDomain, address indexed publisherKey);
  event _SellerAdded(bytes32 indexed publisherDomain, bytes32 indexed sellerHash);
  event _SellerRemoved(bytes32 indexed publisherDomain, bytes32 indexed sellerHash);

  /**
   * @notice modifier which limits execution
   * of the function to the owner.
   */
  modifier only_owner () {
    if (msg.sender != owner) {
      revert();
    }

    // continue with code execution
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
  function changeOwner(address newOwner) only_owner external {
    owner =  newOwner;
  }

  /**
   * @notice Register new publisher.
   * Only the owner of the contract can register new publishers.
   * Publisher public key must not already exist in order to
   * be added or modified.
   * @param domain pubisher domain
   * @param pubKey pubisher public key
   */
  function registerPublisher(bytes32 domain, address pubKey) only_owner external {
    require(domains[pubKey] == "");
    publishers[sha3(domain)] = pubKey;
    domains[pubKey] = domain;
    _PublisherRegistered(domain, pubKey);
  }

  /**
   * @notice Deregister existing publisher.
   * Only contract owner is allowed to deregister.
   * @param pubKey pubisher public key
   */
  function deregisterPublisher(address pubKey) only_owner external {
    require(publishers[sha3(domains[pubKey])] != address(0));
    // order matters here, delete pub from map first.
    delete publishers[sha3(domains[pubKey])];
    delete domains[pubKey];
    _PublisherDeregistered(domains[pubKey], pubKey);
  }

  /**
   * @notice Check if publisher is registered.
   * @param pubKey pubisher public key
   * @return bool
   */
  function isRegisteredPublisher(address pubKey) external constant returns (bool) {
    if (domains[pubKey] != "") return true;
    return false;
  }

  /**
   * @notice Check if publisher is registered by domain
   * @param domain pubisher domain
   * @return bool
   */
  function isRegisteredPublisherDomain(bytes32 domain) external constant returns (bool) {
    if (publishers[sha3(domain)] != address(0)) return true;
    return false;
  }

  /**
   * @notice add seller for publisher.
   * Only allowed once publisher is registered.
   * @param sellerDomain domain of seller/exchange
   * @param sellerId ID of seller
   * @param sellerRel Relationship of seller. (Direct: 0, Reseller: 1)
   * @param sellerTagId Trustworthy Accountability Group (TAG) ID
   */
  function addSeller(
    string sellerDomain,
    string sellerId,
    Relationship sellerRel,
    string sellerTagId
  ) external {
    require(sha3(domains[msg.sender]) != sha3(""));
    bytes32 hash = sha3(sellerDomain, sellerId, sellerRel);
    sellers[sha3(domains[msg.sender])][hash] = Seller(sellerDomain, sellerId, Relationship(sellerRel), sellerTagId, hash);
    _SellerAdded(domains[msg.sender], hash);
  }

  /**
   * @notice Allow publisher to add a seller by hash (instead of plain text attributes)
   * @param hash sha3 hash of seller information
   */
  function addSellerHash(bytes32 hash) external {
    require(sha3(domains[msg.sender]) != sha3(""));
    sellers[sha3(domains[msg.sender])][hash] = Seller("", "", Relationship.Null, "", hash);
    _SellerAdded(domains[msg.sender], hash);
  }

  /**
   * @notice Remove seller from publisher.
   * @param sellerDomain domain of seller
   * @param sellerId ID of seller
   * @param sellerRel Relationship of seller. (Direct: 0, Reseller: 1)
   */
  function removeSeller(
    string sellerDomain,
    string sellerId,
    Relationship sellerRel
  ) external {
    // Check that this ethereum address is a registered publisher.
    require(sha3(domains[msg.sender]) != sha3(""));
    bytes32 hash = sha3(sellerDomain, sellerId, sellerRel);
    delete sellers[sha3(domains[msg.sender])][hash];
    _SellerRemoved(domains[msg.sender], hash);
  }

  /**
    * @notice Get publisher public key from domain name
    * @param publisherDomain domain of publisher
    * @return publisher public key
    */
  function getPublisherFromDomain(
    string publisherDomain
  ) public constant returns (address) {
    return publishers[sha3(publisherDomain)];
  }

  /**
   * @notice Return true if is seller for publisher
   * @param pubKey publisher public key
   * @param sellerDomain domain of seller
   * @param sellerId ID of seller
   * @param sellerRel Relationship of seller. (Direct: 0, Reseller: 1)
   * @return boolean
   */
  function isSellerForPublisher(
    address pubKey,
    string sellerDomain,
    string sellerId,
    Relationship sellerRel
  ) external constant returns (bool) {
    bytes32 hash = sha3(sellerDomain, sellerId, sellerRel);
    Seller storage seller = sellers[sha3(domains[pubKey])][hash];

    if (sha3(seller.id) != sha3("")) {
      if (seller.rel == sellerRel) {
        return true;
      }
    }

    return false;
  }
}
