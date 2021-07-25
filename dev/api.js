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
  const { amount, sender, recipient } = req.body;
  const blockIdx = bitcoin.createNewTransaction(amount, sender, recipient);
  res.json({ note: `Transaction will be added in block ${blockIdx}` });
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

  bitcoin.createNewTransaction(12.5, "00", nodeAddr);

  const newBlock = bitcoin.createNewBlock(
    nonce,
    prevBlockHash,
    currentBlockHash
  );
  res.json({
    note: "New block is mined successfully",
    block: newBlock,
  });
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
