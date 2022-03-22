require('@nomiclabs/hardhat-ethers');

const hre = require('hardhat');
const { expect } = require("chai");
const GAMEJAM_NFT_721 = "JamNFT721";

before("Deploy JamNFT721 contracts", async () => {
  // Prepare parameters
  const [deployer, minter, user1, user2, user3] = await hre.ethers.getSigners();
  this.deployer = deployer;
  this.minter = minter;
  this.user1 = user1;
  this.user2 = user2;
  this.user3 = user3;

  // Deploy JamNFT721 contract
  this.nftFactory = await hre.ethers.getContractFactory(GAMEJAM_NFT_721);
  this.nftContract = await this.nftFactory.deploy(
    "Gamejam Main NFT",
    "JamNFT",
    "https://gamejam.com/nft/",
    "0x0000000000000000000000000000000000000011",
    7
  );
});

describe("Test JamNFT721 contract", () => {
  it("Check NFTs limit", async () => {
    let limit = await this.nftContract.nftLimit();
    expect(limit.toString()).to.equal("7");
  });

  it("Set minter role", async () => {
    let minterRole = await this.nftContract.MINTER_ROLE();
    await this.nftFactory
      .connect(this.deployer)
      .attach(this.nftContract.address)
      .grantRole(minterRole, this.minter.address);
    let checkRole = await this.nftContract.hasRole(minterRole, this.minter.address);
    expect(checkRole).to.equal(true);
  });

  it("Mint specific NFTs", async () => {
    await expect(this.nftContract.tokenURI(3)).to.be.revertedWith("JamNFT721: token does not exist");
    await this.nftFactory
      .connect(this.minter)
      .attach(this.nftContract.address)
      .mint(this.user1.address, 3, "https://gamejam.com/nft-mint/3");
    let totalSupply = await this.nftContract.totalSupply();
    let tokenId = await this.nftContract.tokenOfOwnerByIndex(this.user1.address, 0);
    let tokenByIndex = await this.nftContract.tokenByIndex(0);
    let tokenUri = await this.nftContract.tokenURI(3);
    let baseUri = await this.nftContract.baseTokenURI();
    expect(totalSupply.toString()).to.equal("1");
    expect(tokenId.toString()).to.equal("3");
    expect(tokenByIndex.toString()).to.equal("3");
    expect(tokenUri).to.equal("https://gamejam.com/nft-mint/3");
    expect(baseUri).to.equal("https://gamejam.com/nft/");
  });

  it("Mint an existed NFT", async () => {
    await expect(
      this.nftFactory
        .connect(this.minter)
        .attach(this.nftContract.address)
        .mint(this.user2.address, 3, "#3")
    ).to.be.revertedWith("ERC721: token already minted");
  });

  it("Mint with increment ids", async () => {
    await this.nftFactory
      .connect(this.minter)
      .attach(this.nftContract.address)
      .mintTo(this.user3.address);
    await this.nftFactory
      .connect(this.minter)
      .attach(this.nftContract.address)
      .mintTo(this.user2.address);
    await this.nftFactory
      .connect(this.minter)
      .attach(this.nftContract.address)
      .mintBulk(
        [this.user2.address, this.user1.address],
        [2, 4],
        ["https://test.com/2.json", "https://test.gamejam.com/4.json"]
      );
    let balance1 = await this.nftContract.balanceOf(this.user1.address);
    let balance2 = await this.nftContract.balanceOf(this.user2.address);
    let balance3 = await this.nftContract.balanceOf(this.user3.address);
    let totalSupply = await this.nftContract.totalSupply();
    let tokenId0 = await this.nftContract.tokenOfOwnerByIndex(this.user1.address, 0);
    let tokenId1 = await this.nftContract.tokenOfOwnerByIndex(this.user1.address, 1);
    let tokenId2 = await this.nftContract.tokenOfOwnerByIndex(this.user2.address, 0);
    let tokenId3 = await this.nftContract.tokenOfOwnerByIndex(this.user2.address, 1);
    let tokenId4 = await this.nftContract.tokenOfOwnerByIndex(this.user3.address, 0);
    expect(balance1.toString()).to.equal("2");
    expect(balance2.toString()).to.equal("2");
    expect(balance3.toString()).to.equal("1");
    expect(totalSupply.toString()).to.equal("5");
    expect(tokenId0.toString()).to.equal("3");
    expect(tokenId1.toString()).to.equal("4");
    expect(tokenId2.toString()).to.equal("1");
    expect(tokenId3.toString()).to.equal("2");
    expect(tokenId4.toString()).to.equal("0");
  });

  it("Check URI of some NFTs", async () => {
    let tokenUri = await this.nftContract.tokenURI(4);
    await expect(this.nftContract.tokenURI(5)).to.be.revertedWith("JamNFT721: token does not exist");
    expect(tokenUri).to.equal("https://test.gamejam.com/4.json");
  });

  it("Burn an NFT", async () => {
    await this.nftFactory
      .connect(this.user1)
      .attach(this.nftContract.address)
      .burn(3);
    let totalSupply = await this.nftContract.totalSupply();
    let balance = await this.nftContract.balanceOf(this.user1.address);
    let tokenId = await this.nftContract.tokenOfOwnerByIndex(this.user1.address, 0);
    expect(totalSupply.toString()).to.equal("4");
    expect(balance.toString()).to.equal("1");
    expect(tokenId.toString()).to.equal("4");
  });

  it("Check ids of all NFTs", async () => {
    let tokenIds = [];
    let totalSupply = await this.nftContract.totalSupply();
    for (let i = 0; i < parseInt(totalSupply.toString()); i++)
      tokenIds.push((await this.nftContract.tokenByIndex(i)).toString());
    expect(tokenIds.length).to.equal(4);
    expect(tokenIds[0]).to.equal("4");
    expect(tokenIds[1]).to.equal("0");
    expect(tokenIds[2]).to.equal("1");
    expect(tokenIds[3]).to.equal("2");
  });

  it("Mint a large NFT id", async () => {
    await expect(
      this.nftFactory
        .connect(this.minter)
        .attach(this.nftContract.address)
        .mint(this.user2.address, 8, "#8")
    ).to.be.revertedWith("JamNFT721: Maximum NFTs minted");
    await this.nftFactory
      .connect(this.minter)
      .attach(this.nftContract.address)
      .mintTo(this.user1.address);
    await this.nftFactory
      .connect(this.minter)
      .attach(this.nftContract.address)
      .mintTo(this.user3.address);
    await this.nftFactory
      .connect(this.minter)
      .attach(this.nftContract.address)
      .mintTo(this.user2.address);
    await expect(
      this.nftFactory
        .connect(this.minter)
        .attach(this.nftContract.address)
        .mintTo(this.user2.address)
    ).to.be.revertedWith("JamNFT721: Maximum NFTs minted");
    let totalSupply = await this.nftContract.totalSupply();
    expect(totalSupply.toString()).to.equal("7");
  });

  it("Re-set base URI", async () => {
    await this.nftFactory
      .connect(this.deployer)
      .attach(this.nftContract.address)
      .setBaseTokenURI("https://nft-gamejam.com/721/");
    let baseURI = await this.nftContract.baseTokenURI();
    expect(baseURI).to.equal("https://nft-gamejam.com/721/");
  });

  it("Check owned tokens", async () => {
    let user1Tokens = await this.nftContract.getOwnedTokens(this.user1.address, 0, 4);
    let user2Tokens = await this.nftContract.getOwnedTokens(this.user2.address, 0, 6);
    let user3Tokens = await this.nftContract.getOwnedTokens(this.user3.address, 1, 3);
    expect(user1Tokens.length).to.equal(2);
    expect(user1Tokens[0].tokenId.toString()).to.equal("4");
    expect(user1Tokens[0].tokenURI).to.equal("https://test.gamejam.com/4.json");
    expect(user1Tokens[1].tokenId.toString()).to.equal("3");
    expect(user1Tokens[1].tokenURI).to.equal("https://nft-gamejam.com/721/3.json");
    expect(user2Tokens.length).to.equal(3);
    expect(user2Tokens[0].tokenId.toString()).to.equal("1");
    expect(user2Tokens[0].tokenURI).to.equal("https://nft-gamejam.com/721/1.json");
    expect(user2Tokens[1].tokenId.toString()).to.equal("2");
    expect(user2Tokens[1].tokenURI).to.equal("https://test.com/2.json");
    expect(user2Tokens[2].tokenId.toString()).to.equal("6");
    expect(user2Tokens[2].tokenURI).to.equal("https://nft-gamejam.com/721/6.json");
    expect(user3Tokens.length).to.equal(1);
    expect(user3Tokens[0].tokenId.toString()).to.equal("5");
    expect(user3Tokens[0].tokenURI).to.equal("https://nft-gamejam.com/721/5.json");
  });
});