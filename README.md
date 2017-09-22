# ADSR - Authorized Digital Sellers Registry

> [ads.txt](https://iabtechlab.com/ads-txt/) - on the blockchain.

Proof of concept.

# Usage

Add seller for publisher

**addSeller(sellerId, sellerDomain, sellerRelationship)**

Add seller for publisher

**removeSeller(sellerId)**

Get seller by publisher id

**getSellerForPublisher(publisherId, sellerId)**

Get seller by publisher domain

**getSellerForPublisherDomain(publisherDomain, sellerId)**

Terminology:

 - *sellerId* is also known as *SellerAccountID* in ads.txt
 - *sellerDomain* is also known as *SSP/Exchange Domain* in ads.txt
 - *sellerRelationship* is also known as *PaymentsType* in ads.txt

# Test

```bash
truffle test
```

# Resources

- [Ads.txt – Authorized Digital Sellers](https://iabtechlab.com/ads-txt/)

- [truffle framework](https://github.com/trufflesuite/truffle)

- [Solidity](https://solidity.readthedocs.io)

# License

MIT
