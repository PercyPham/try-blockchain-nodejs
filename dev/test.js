const Blockchain = require("./blockchain");
const bitcoin = new Blockchain();

console.log(bitcoin.proofOfWork("aaa", "bbb"));

console.log(bitcoin.hashBlock("aaa", "bbb", 13644));
