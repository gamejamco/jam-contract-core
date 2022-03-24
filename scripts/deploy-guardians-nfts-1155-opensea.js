const hre = require("hardhat");
const FileSystem = require("fs");
const deployInfo = require("../deploy.json");

const CONTRACT_NAME = "GuardianOfGloryItems";
const OWNER = "0xb23ff606F4D9bbBBf81ca1573CD43793f95C27e1";
const MINTER = "0xb23ff606F4D9bbBBf81ca1573CD43793f95C27e1";

async function deploy() {
  // Deploy
  const [deployer] = await hre.ethers.getSigners();
  const networkName = hre.network.name;
  console.log("Deployer:", deployer.address);
  console.log("Balance:", (await deployer.getBalance()).toString());
  const factory = await hre.ethers.getContractFactory(CONTRACT_NAME);
  console.log(`Deploying ${CONTRACT_NAME} with parameters: "https://assets.gamejam.co/platform/GuardianGlory/nft/items/"`);
  const contract = await factory.deploy("GuardianOfGlory", "GOG", "https://assets.gamejam.co/platform/GuardianGlory/nft/items/", "0x0000000000000000000000000000000000000001");
  await contract.deployed();
  console.log(`${CONTRACT_NAME} deployed address: ${contract.address}`);

  // Write the result to deploy.json
  deployInfo[networkName][CONTRACT_NAME] = contract.address;
  FileSystem.writeFile("deploy.json", JSON.stringify(deployInfo, null, "\t"), err => {
    if (err)
      console.log("Error when trying to write to deploy.json!", err);
    else
      console.log("Information has been written to deploy.json!");
  });
}

deploy();