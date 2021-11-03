const ERC20 = artifacts.require("ERC20");

module.exports = function (deployer, network, accounts) {
  const owner = accounts[0];
  deployer.deploy(ERC20, { from: owner});
};
