var ADSR = artifacts.require("./ADSR.sol");

module.exports = function(deployer) {
  deployer.deploy(ADSR);
};
