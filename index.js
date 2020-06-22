// jshint ignore: start

// your management wallet ethereum private key, make sure never to share this with anyone en remove this value right after using
const yourPrivateKey = "<your private key>";
// Create a free account on https://infura.io, create a application and put the mainnet api uri here as value
const infuraUrl = "https://mainnet.infura.io/v3/<uniqueid>";
// the ERC725 identity of the node you want to check your payouts for. On your node at https://othub.origin-trail.network/ this is the value under Identity
const identity = "0x<the rest of your identity>";
// check gas price on https://ethgasstation.info/. (best to take the highest/average).
// Be carefull, when the gas price is around 50 Gwei, a transaction will cost about 0.0095 ETH (which currently is $2)
const gasPrice = 25000000000;

// never changing params
const contractUri = "0x52e0E21A45d0140b73929439B87652f50001c24C";
const apiUrl =  `https://othub-api.origin-trail.network/api/nodes/dataholders/${identity}?includeNodeUptime=true`;

const contractAbi = require('./contract.json'); // https://raw.githubusercontent.com/OriginTrail/ot-node/release/mariner/modules/Blockchain/Ethereum/abi/holding.json
const Web3 = require('web3');
const fetch = require('node-fetch');

(async () => {
    try {
        const web3 = new Web3(new Web3.providers.HttpProvider(infuraUrl));

        web3.eth.accounts.wallet.create(0, web3.utils.randomHex(32));
        const account = web3.eth.accounts.privateKeyToAccount(yourPrivateKey);
        web3.eth.accounts.wallet.add(account);

        const response = await fetch(apiUrl, { method: "Get" })
        const data = await response.json();
        for(const offer of data.Offers) {
            try {
                if (offer.Paidout) {
                    console.log(`Offer ${offer.OfferId} is already paid out`);
                    continue;
                } else if (!offer.CanPayout) {
                    console.log(`Not possible to pay out ${offer.OfferId}`);
                    continue;
                }

                console.log(`Starting payout for offer ${offer.OfferId}, check the progress on your management wallet on etherscan`);
                const offerId = offer.OfferId;
                const contract = new web3.eth.Contract(contractAbi, contractUri);
                
                const from = web3.eth.accounts.wallet[0].address;
                const offerIdUint = web3.eth.abi.encodeParameter('uint256',offerId)
                const gas = await contract.methods.payOut(identity, offerIdUint).estimateGas({ from: from, value: 0 });
                const receiptResult = await new Promise(async (resolve, reject) => {
                    contract.methods.payOut(identity, offerIdUint).send({
                        from: from,
                        gas: gas,
                        gasPrice: gasPrice,
                        value: 0
                    }).on('transactionHash', (hash) => {
                        //console.log("hash", hash);
                    }).on('confirmation', (confirmationNumber, receipt) => {
                        //console.log("confirmation", confirmationNumber, receipt);
                    }).on('receipt', (receipt) => {
                        console.log(`Paid out ${offerId}`);
                        resolve(receipt);
                    }).on('error', (err) => {
                        // if there's an out of gas error the second parameter is the receipt
                        console.log(`Failed to pay out ${offerId}`);
                        reject(err.message);
                    });
                });
            } catch (e) {
                console.error(e);
            }
        }
    } catch (e) {
        console.error(e);
    }
})();