import { ethers, upgrades } from "hardhat"
import { expect } from "chai"
import chai from "chai"
import { solidity } from "ethereum-waffle"
import { stringToEth, ethToString } from "../utils/utils"
import { MockCarbon, MockERC20, CarbonizedCollection, Celostrials, CarbonRewards } from "../types"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

chai.use(solidity)

describe("Celostrials Carbon Rewards Test", function () {
  let celostrials: Celostrials
  let carbonizedCollection: CarbonizedCollection
  let mockCelo: MockERC20
  let mockCarbon: MockCarbon
  let carbonRewards: CarbonRewards
  let accounts: SignerWithAddress[]

  this.beforeEach(async function () {
    accounts = await ethers.getSigners()
    // Deploy original collection
    const celostrialsFactory = await ethers.getContractFactory("Celostrials")
    celostrials = (await celostrialsFactory.deploy()) as Celostrials
    // Deploy mock carbon
    const mockCarbonFactory = await ethers.getContractFactory("MockCarbon")
    mockCarbon = (await mockCarbonFactory.deploy(stringToEth("100000"))) as MockCarbon
    // Deploy mock Celo
    const mockERC20Factory = await ethers.getContractFactory("MockERC20")
    mockCelo = (await mockERC20Factory.deploy(stringToEth("100000"))) as MockERC20
    // Deploy CarbonRewards Contract
    const carbonRewardsFactory = await ethers.getContractFactory("CarbonRewards")
    let args = [accounts[0].address, mockCelo.address]
    carbonRewards = (await upgrades.deployProxy(carbonRewardsFactory, args)) as CarbonRewards
    // Deploy CarbonizedCollection Contract
    const carbonizedCollectionFactory = await ethers.getContractFactory("CarbonizedCollection")
    args = [
      celostrials.address,
      mockCarbon.address,
      carbonRewards.address,
      "Carbonized Celostrials",
      "NFET02",
    ]
    carbonizedCollection = (await upgrades.deployProxy(
      carbonizedCollectionFactory,
      args
    )) as CarbonizedCollection
    // Initialize CarbonRewards with CarbonizedColleciton address
    await (await carbonRewards.setCarbonCollection(carbonizedCollection.address)).wait()
    // close original collection whitelist for minting
    await (await celostrials.closeWhitelist()).wait()
    // set approval for carbonizedContract to transfer original collection
    await expect(
      celostrials.setApprovalForAll(carbonizedCollection.address, true)
    ).to.not.be.reverted
    // set approval for carbon to transfer carbonized contract
    await expect(
      mockCarbon.approve(carbonizedCollection.address, ethers.constants.MaxUint256)
    ).to.not.be.reverted
    // set approval for carbonRewards to transfer mock celo
    await expect(
      mockCelo.approve(carbonRewards.address, ethers.constants.MaxUint256)
    ).to.not.be.reverted
    // batch carbonize 1, 2 and 3
    await expect(
      carbonizedCollection.carbonizeBatch(
        [1, 2, 3],
        [stringToEth("1"), stringToEth("2"), stringToEth("2")]
      )
    ).to.not.be.reverted
    // set reward period to be one block
    await expect(carbonRewards.setRewardsDuration(1)).to.not.be.reverted
  })

  it("Claim carbon rewards", async function () {
    // check rewards earned by 1 and 2
    expect(ethToString(await carbonRewards.earned(accounts[0].address))).to.equal("0.0")
    expect(ethToString(await carbonRewards.earned(accounts[1].address))).to.equal("0.0")
    // start reward period with 100 celo
    await expect(carbonRewards.notifyRewardAmount(stringToEth("100.0"))).to.not.be.reverted
    // increase time by 10 seconds
    await ethers.provider.send("evm_increaseTime", [10])
    await ethers.provider.send("evm_mine", [])
    // only account 0 has carbonized so whole reward period goes to 0
    expect(ethToString(await carbonRewards.earned(accounts[0].address))).to.equal("100.0")
    expect(ethToString(await carbonRewards.earned(accounts[1].address))).to.equal("0.0")
    // claim rewards
    await expect(carbonRewards.getReward()).to.not.be.reverted
    // check 0 rewards state (just claimed so should be 0)
    expect(ethToString(await carbonRewards.earned(accounts[0].address))).to.equal("0.0")
    expect(ethToString(await carbonRewards.rewards(accounts[0].address))).to.equal("0.0")
    // check 0 rewards state (not carbonized so should be 0)
    expect(ethToString(await carbonRewards.earned(accounts[1].address))).to.equal("0.0")
    expect(ethToString(await carbonRewards.rewards(accounts[1].address))).to.equal("0.0")
  })
  it("Transfer carbonized and claim rewards", async function () {
    // transfer token 2 from account 0 to 1
    await expect(carbonizedCollection.transferFrom(accounts[0].address, accounts[1].address, 2)).to
      .not.be.reverted
    // check 1 rewards (should be 0)
    expect(ethToString(await carbonRewards.rewards(accounts[1].address))).to.equal("0.0")
    // check carbonBalance of 0
    await expect(
      ethToString(await carbonizedCollection.carbonBalance(accounts[0].address))
    ).to.equal("3.0")
    // check carbonBalance of 1
    await expect(
      ethToString(await carbonizedCollection.carbonBalance(accounts[1].address))
    ).to.equal("2.0")
    // start reward period with 100 celo
    await expect(carbonRewards.notifyRewardAmount(stringToEth("100.0"))).to.not.be.reverted
    // increase time by 10
    await ethers.provider.send("evm_increaseTime", [10])
    await ethers.provider.send("evm_mine", [])
    // check earned rewards
    expect(ethToString(await carbonRewards.earned(accounts[0].address))).to.equal("60.0")
    expect(ethToString(await carbonRewards.earned(accounts[1].address))).to.equal("40.0")
    // claim rewards
    await expect(carbonRewards.getReward()).to.not.be.reverted
    await expect(carbonRewards.connect(accounts[1]).getReward()).to.not.be.reverted
  })
  it("Claim reward balances", async function () {
    // transfer tokens 1, 2 , 3 to account 1
    await expect(carbonizedCollection.transferFrom(accounts[0].address, accounts[1].address, 1)).to
      .not.be.reverted
    await expect(carbonizedCollection.transferFrom(accounts[0].address, accounts[1].address, 2)).to
      .not.be.reverted
    await expect(carbonizedCollection.transferFrom(accounts[0].address, accounts[1].address, 3)).to
      .not.be.reverted
    // start reward period for 100 celo
    await expect(carbonRewards.notifyRewardAmount(stringToEth("100.0"))).to.not.be.reverted
    // check celo balance of 1
    expect(ethToString(await mockCelo.balanceOf(accounts[1].address))).to.equal("0.0")
    // check rewards of 1
    expect(ethToString(await carbonRewards.rewards(accounts[1].address))).to.equal("0.0")
    // increase time by 10 seconds
    await ethers.provider.send("evm_increaseTime", [10])
    await ethers.provider.send("evm_mine", [])
    // check earned rewards of 1 (should be all rewards)
    expect(ethToString(await carbonRewards.earned(accounts[1].address))).to.equal("100.0")
    // check celo balance before claim rewards
    expect(ethToString(await mockCelo.balanceOf(accounts[1].address))).to.equal("0.0")
    // claim rewards
    await expect(carbonRewards.connect(accounts[1]).getReward()).to.not.be.reverted
    // check celo balance after claim
    expect(ethToString(await mockCelo.balanceOf(accounts[1].address))).to.equal("100.0")
  })
  it("Claim rewards after transfering", async function () {
    // transfer tokens 1, 2 , 3 to account 1
    await expect(carbonizedCollection.transferFrom(accounts[0].address, accounts[1].address, 1)).to
      .not.be.reverted
    await expect(carbonizedCollection.transferFrom(accounts[0].address, accounts[1].address, 2)).to
      .not.be.reverted
    await expect(carbonizedCollection.transferFrom(accounts[0].address, accounts[1].address, 3)).to
      .not.be.reverted
    // start reward period for 100 celo
    await expect(carbonRewards.notifyRewardAmount(stringToEth("100.0"))).to.not.be.reverted
    // check celo balance of 1
    expect(ethToString(await mockCelo.balanceOf(accounts[1].address))).to.equal("0.0")
    // check rewards of 1
    expect(ethToString(await carbonRewards.rewards(accounts[1].address))).to.equal("0.0")
    // increase time by 10 seconds
    await ethers.provider.send("evm_increaseTime", [10])
    await ethers.provider.send("evm_mine", [])
    // check earned rewards of 1 (should be all rewards)
    expect(ethToString(await carbonRewards.earned(accounts[1].address))).to.equal("100.0")
    // check celo balance before claim rewards
    expect(ethToString(await mockCelo.balanceOf(accounts[1].address))).to.equal("0.0")
    // transfer tokens 1, 2 and 3 from account 1 back to 0
    await expect(
      carbonizedCollection
        .connect(accounts[1])
        .transferFrom(accounts[1].address, accounts[0].address, 1)
    ).to.not.be.reverted
    await expect(
      carbonizedCollection
        .connect(accounts[1])
        .transferFrom(accounts[1].address, accounts[0].address, 2)
    ).to.not.be.reverted
    await expect(
      carbonizedCollection
        .connect(accounts[1])
        .transferFrom(accounts[1].address, accounts[0].address, 3)
    ).to.not.be.reverted
    // claim rewards
    await expect(carbonRewards.connect(accounts[1]).getReward()).to.not.be.reverted
    // check celo balance after claim
    expect(ethToString(await mockCelo.balanceOf(accounts[1].address))).to.equal("100.0")
  })
  it("Transfer halfway through period and claim half period rewards", async function () {
    // set rewards duration to 2 seconds
    await expect(carbonRewards.setRewardsDuration(2)).to.not.be.reverted
    // transfer tokens 1, 2 and 3 to 1
    await expect(carbonizedCollection.transferFrom(accounts[0].address, accounts[1].address, 1)).to
      .not.be.reverted
    await expect(carbonizedCollection.transferFrom(accounts[0].address, accounts[1].address, 2)).to
      .not.be.reverted
    await expect(carbonizedCollection.transferFrom(accounts[0].address, accounts[1].address, 3)).to
      .not.be.reverted
    // check rewards before reward period
    expect(ethToString(await carbonRewards.rewards(accounts[1].address))).to.equal("0.0")
    // start reward period for 100 celo
    await expect(carbonRewards.notifyRewardAmount(stringToEth("100.0"))).to.not.be.reverted
    // transfer token 2 from account 1 to account 2 halfway through reward period
    await expect(
      carbonizedCollection
        .connect(accounts[1])
        .transferFrom(accounts[1].address, accounts[2].address, 2)
    ).to.not.be.reverted
    // check rewards halfway through period (should only accrued half total rewards)
    expect(ethToString(await carbonRewards.earned(accounts[1].address))).to.equal("50.0")
    expect(ethToString(await carbonRewards.earned(accounts[2].address))).to.equal("0.0")
    // increase time by 10 seconds finishing out period
    await ethers.provider.send("evm_increaseTime", [10])
    await ethers.provider.send("evm_mine", [])
    // check rewards earned for 1 and 2
    expect(ethToString(await carbonRewards.earned(accounts[1].address))).to.equal("80.0")
    expect(ethToString(await carbonRewards.earned(accounts[2].address))).to.equal("20.0")
  })
})
