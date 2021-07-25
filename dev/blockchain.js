const hashSHA256 = require("./util/hashSHA256");

function Blockchain() {
  this.chain = [];
  this.pendingTransactions = [];
  this.networkNodes = [];

  this.createNewBlock(100, "0", "0"); // genesis block
}

Blockchain.prototype.setCurrentNodeUrl = function (currentNodeUrl) {
  this.currentNodeUrl = currentNodeUrl;
};

Blockchain.prototype.createNewBlock = function (
  nonce,
  previousBlockHash,
  hash
) {
  const newBlock = {
    index: this.chain.length,
    timestamp: Date.now(),
    transactions: this.pendingTransactions,
    nonce,
    previousBlockHash,
    hash,
  };

  this.pendingTransactions = [];
  this.chain.push(newBlock);

  return newBlock;
};

Blockchain.prototype.getLastBlock = function () {
  return this.chain[this.chain.length - 1];
};

Blockchain.prototype.createNewTransaction = function (
  amount,
  sender,
  recipient
) {
  this.pendingTransactions.push({ amount, sender, recipient });
  return this.getLastBlock()["index"] + 1;
};

Blockchain.prototype.hashBlock = function (
  prevBlockHash,
  currentBlockData,
  nonce
) {
  const dataStr =
    prevBlockHash + nonce.toString() + JSON.stringify(currentBlockData);
  return hashSHA256(dataStr);
};

Blockchain.prototype.proofOfWork = function (prevBlockHash, currentBlockData) {
  let nonce = 0;
  let hash = this.hashBlock(prevBlockHash, currentBlockData, nonce);
  while (hash.substring(0, 4) != "0000") {
    nonce++;
    hash = this.hashBlock(prevBlockHash, currentBlockData, nonce);
  }
  return nonce;
};

module.exports = Blockchain;
