# ADSR - Authorized Digital Sellers Registry

> [ads.txt](https://iabtechlab.com/ads-txt/) - on the blockchain.

Rinkeby Address

https://rinkeby.etherscan.io/address/0x343c82f96358e0bac16845fb718ea1d44e107270

# Usage

Check if publisher is in registry

**isRegisteredPublisher(publisherId)**

Check if publisher is in registry by publisher domain

**isRegisteredPublisherDomain(publisherDomain)**

Add seller for publisher

**addSeller(sellerDomain, sellerId, sellerRelationship, sellerTAGID)**

Add seller for publisher

**removeSeller(sellerDomain, sellerId)**

Get seller for publisher id

**getSellerForPublisher(publisherId, sellerDomain, sellerId)**

Get seller for publisher domain

**getSellerForPublisherDomain(publisherDomain, sellerDomain, sellerId)**

Terminology:

 - *sellerId* is also known as *SellerAccountID* in ads.txt
 - *sellerDomain* is also known as *SSP/Exchange Domain* in ads.txt
 - *sellerRelationship* is also known as *PaymentsType* in ads.txt
 - *sellerTagId* is also known as *TAGID* in ads.txt

# Test

```bash
truffle test
```

# Resources

- [Ads.txt – Authorized Digital Sellers](https://iabtechlab.com/ads-txt/)

- [About Ads.txt](https://iabtechlab.com/ads-txt-about/)

- [truffle framework](https://github.com/trufflesuite/truffle)

- [Solidity](https://solidity.readthedocs.io)

# License

MIT
