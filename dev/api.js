const express = require("express");
const { v4: uuid } = require("uuid");
const axios = require("axios");
const Blockchain = require("./blockchain");

const port = process.argv[2];

const nodeAddr = uuid().replace("-", "");

const bitcoin = new Blockchain();
bitcoin.setCurrentNodeUrl(`http://localhost:${port}`);

const app = express();

app.use(express.json());

app.get("/blockchain", (req, res) => {
  res.json(bitcoin);
});

app.post("/transaction", (req, res) => {
  const { newTransaction } = req.body;
  const blockIdx = bitcoin.appendTransactionToPendingList(newTransaction);
  res.json({ note: `Transaction will be added in block ${blockIdx}` });
});

app.post("/transaction/broadcast", (req, res) => {
  const { amount, sender, recipient } = req.body;
  const trans = bitcoin.createNewTransaction(amount, sender, recipient);
  bitcoin.appendTransactionToPendingList(trans);

  const requests = bitcoin.networkNodes.map((node) => {
    return axios.post(`${node}/transaction`, { newTransaction: trans });
  });

  Promise.all(requests).then((_) => {
    res.json({ note: `OK` });
  });
});

app.get("/mine", (req, res) => {
  const lastBlock = bitcoin.getLastBlock();
  const prevBlockHash = lastBlock.hash;
  const currentBlockData = {
    index: lastBlock.index + 1,
    transactions: bitcoin.pendingTransactions,
  };
  const nonce = bitcoin.proofOfWork(prevBlockHash, currentBlockData);
  const currentBlockHash = bitcoin.hashBlock(
    prevBlockHash,
    currentBlockData,
    nonce
  );

  const newBlock = bitcoin.createNewBlock(
    nonce,
    prevBlockHash,
    currentBlockHash
  );

  const requests = bitcoin.networkNodes.map((node) => {
    return axios.post(`${node}/receive-new-block`, { newBlock });
  });

  Promise.all(requests).then((_) => {
    axios
      .post(`${bitcoin.currentNodeUrl}/transaction/broadcast`, {
        amount: 12.5,
        sender: "00",
        recipient: nodeAddr,
      })
      .then((_) => {
        res.json({
          note: "New block is mined successfully",
          block: newBlock,
        });
      });
  });
});

app.post("/receive-new-block", (req, res) => {
  const { newBlock } = req.body;

  const lastBlock = bitcoin.getLastBlock();

  if (
    newBlock.index != lastBlock.index + 1 ||
    newBlock.prevBlockHash != lastBlock.hash
  ) {
    res.json({ note: "Not OK" });
  }
  // TODO: check hash also

  bitcoin.chain.push(newBlock);
  bitcoin.pendingTransactions = [];
  res.json({ note: "OK " });
});

app.post("/register-node-and-broadcast-node", (req, res) => {
  const { newNodeUrl } = req.body;

  if (!bitcoin.networkNodes.includes(newNodeUrl)) {
    bitcoin.networkNodes.push(newNodeUrl);
  }

  const requests = bitcoin.networkNodes.map((nodeURL) => {
    return axios.post(`${nodeURL}/register-node`, {
      newNodeUrl,
    });
  });

  Promise.all(requests)
    .then((_) =>
      axios.post(`${newNodeUrl}/register-nodes-bulk`, {
        networkNodes: [...bitcoin.networkNodes, bitcoin.currentNodeUrl],
      })
    )
    .then(() => {
      res.json({
        note: "Broadcast successfully",
      });
    });
});

app.post("/register-node", (req, res) => {
  const { newNodeUrl } = req.body;
  if (
    !bitcoin.networkNodes.includes(newNodeUrl) &&
    newNodeUrl != bitcoin.currentNodeUrl
  ) {
    bitcoin.networkNodes.push(newNodeUrl);
  }
  res.json({ note: "OK" });
});

app.post("/register-nodes-bulk", (req, res) => {
  req.body.networkNodes.forEach((node) => {
    if (
      !bitcoin.networkNodes.includes(node) &&
      node != bitcoin.currentNodeUrl
    ) {
      bitcoin.networkNodes.push(node);
    }
  });

  res.json({ note: "OK" });
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port} ...`);
});
