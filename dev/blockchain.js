const { v4: uuid } = require("uuid");
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
  const transaction = {
    amount,
    sender,
    recipient,
    transactionId: uuid().replace(/-/g, ""),
  };
  return transaction;
};

Blockchain.prototype.appendTransactionToPendingList = function (transaction) {
  this.pendingTransactions.push(transaction);
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

Blockchain.prototype.chainIsValid = function (chain) {
  for (let i = 1; i < chain.length; i++) {
    const currBlock = chain[i];
    const prevBlock = chain[i - 1];

    if (currBlock.previousBlockHash != prevBlock.hash) return false;

    if (currBlock.hash.substring(0, 4) !== "0000") return false;

    const currBlockHash = this.hashBlock(
      prevBlock.hash,
      {
        index: prevBlock.index + 1,
        transactions: currBlock.transactions,
      },
      currBlock.nonce
    );

    if (currBlockHash != currBlock.hash) return false;
  }

  const genesisBlock = chain[0];
  if (
    genesisBlock.nonce !== 100 ||
    genesisBlock.previousBlockHash !== "0" ||
    genesisBlock.hash !== "0" ||
    genesisBlock.transactions.length !== 0
  ) {
    return false;
  }

  return true;
};

Blockchain.prototype.getBlock = function (blockHash) {
  for (const block of this.chain) {
    if (block.hash === blockHash) return block;
  }
  return null;
};

Blockchain.prototype.getTransaction = function (tranId) {
  for (const block of this.chain) {
    for (const tran of block.transactions) {
      if (tran.transactionId === tranId) return { transaction: tran, block };
    }
  }
  return { transaction: null, block: null };
};

Blockchain.prototype.getAddressData = function (address) {
  const addrTrans = [];
  this.chain.forEach((block) => {
    block.transactions.forEach((tran) => {
      if (address === tran.sender || address === tran.recipient)
        addrTrans.push(tran);
    });
  });

  let balance = 0;
  addrTrans.forEach((tran) => {
    if (address === tran.sender) balance -= tran.amount;
    if (address === tran.recipient) balance += tran.amount;
  });

  return {
    addressData: {
      transactions: addrTrans,
      balance,
    },
  };
};

module.exports = Blockchain;
