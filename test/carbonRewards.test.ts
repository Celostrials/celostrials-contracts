import { ethers, upgrades } from "hardhat"
import { expect } from "chai"
import chai from "chai"
import { solidity } from "ethereum-waffle"
import { stringToEth, ethToString } from "../utils/utils"
import { MockCarbon, MockERC20, CarbonizedCollection, Celostrials } from "../types"
import { CarbonRewards } from "../types/CarbonRewards"

chai.use(solidity)

describe("Celostrials Carbon Rewards Test", function () {
  let celostrials: Celostrials
  let carbonizedCollection: CarbonizedCollection
  let mockCelo: MockERC20
  let mockCarbon: MockCarbon
  let carbonRewards: CarbonRewards

  this.beforeEach(async function () {
    const accounts = await ethers.getSigners()
    const celostrialsFactory = await ethers.getContractFactory("Celostrials")
    celostrials = (await celostrialsFactory.deploy()) as Celostrials

    const mockCarbonFactory = await ethers.getContractFactory("MockCarbon")
    mockCarbon = (await mockCarbonFactory.deploy(stringToEth("100000"))) as MockCarbon
    const mockERC20Factory = await ethers.getContractFactory("MockERC20")
    mockCelo = (await mockERC20Factory.deploy(stringToEth("100000"))) as MockERC20

    const carbonRewardsFactory = await ethers.getContractFactory("CarbonRewards")
    let args = [accounts[0].address, mockCelo.address]
    carbonRewards = (await upgrades.deployProxy(carbonRewardsFactory, args)) as CarbonRewards

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

    await (await carbonRewards.setCarbonCollection(carbonizedCollection.address)).wait()

    await expect(
      celostrials.setApprovalForAll(carbonizedCollection.address, true)
    ).to.not.be.reverted
    await expect(
      mockCarbon.approve(carbonizedCollection.address, ethers.constants.MaxUint256)
    ).to.not.be.reverted
    await expect(
      mockCelo.approve(carbonRewards.address, ethers.constants.MaxUint256)
    ).to.not.be.reverted
    await expect(carbonizedCollection.carbonize(1, stringToEth("1"))).to.not.be.reverted
    await expect(carbonizedCollection.carbonize(2, stringToEth("2"))).to.not.be.reverted
    await expect(carbonizedCollection.carbonize(3, stringToEth("2"))).to.not.be.reverted
  })

  it("Successfully Claim Carbon Rewards", async function () {
    const accounts = await ethers.getSigners()

    await expect(carbonRewards.setRewardsDuration(1)).to.not.be.reverted
    expect(ethToString(await carbonRewards.earned(accounts[0].address))).to.equal("0.0")
    expect(ethToString(await carbonRewards.earned(accounts[1].address))).to.equal("0.0")
    await expect(carbonRewards.notifyRewardAmount(stringToEth("100.0"))).to.not.be.reverted

    await ethers.provider.send("evm_increaseTime", [10])
    await ethers.provider.send("evm_mine", [])
    expect(ethToString(await carbonRewards.earned(accounts[0].address))).to.equal("100.0")
    expect(ethToString(await carbonRewards.earned(accounts[1].address))).to.equal("0.0")
    await expect(carbonRewards.getReward()).to.not.be.reverted
    expect(ethToString(await carbonRewards.earned(accounts[0].address))).to.equal("0.0")
    expect(ethToString(await carbonRewards.rewards(accounts[0].address))).to.equal("0.0")
    expect(ethToString(await carbonRewards.earned(accounts[1].address))).to.equal("0.0")
    expect(ethToString(await carbonRewards.rewards(accounts[1].address))).to.equal("0.0")

    await expect(carbonizedCollection.transferFrom(accounts[0].address, accounts[1].address, 2)).to
      .not.be.reverted
    expect(ethToString(await carbonRewards.rewards(accounts[1].address))).to.equal("0.0")

    await expect(
      ethToString(await carbonizedCollection.carbonBalance(accounts[1].address))
    ).to.equal("2.0")
    await expect(
      ethToString(await carbonizedCollection.carbonBalance(accounts[0].address))
    ).to.equal("3.0")
    await expect(carbonRewards.notifyRewardAmount(stringToEth("100.0"))).to.not.be.reverted
    await ethers.provider.send("evm_increaseTime", [10])
    await ethers.provider.send("evm_mine", [])
    await expect(
      ethToString(await carbonizedCollection.carbonBalance(accounts[1].address))
    ).to.equal("2.0")
    await expect(
      ethToString(await carbonizedCollection.carbonBalance(accounts[0].address))
    ).to.equal("3.0")
    expect(ethToString(await carbonRewards.earned(accounts[0].address))).to.equal("60.0")
    expect(ethToString(await carbonRewards.earned(accounts[1].address))).to.equal("40.0")
  })
  it("Successfully Claim Carbon Rewards for 1", async function () {
    const accounts = await ethers.getSigners()
    await expect(carbonRewards.setRewardsDuration(1)).to.not.be.reverted
    await expect(carbonizedCollection.transferFrom(accounts[0].address, accounts[1].address, 1)).to
      .not.be.reverted
    await expect(carbonizedCollection.transferFrom(accounts[0].address, accounts[1].address, 2)).to
      .not.be.reverted
    await expect(carbonizedCollection.transferFrom(accounts[0].address, accounts[1].address, 3)).to
      .not.be.reverted
    await expect(carbonRewards.notifyRewardAmount(stringToEth("100.0"))).to.not.be.reverted
    expect(ethToString(await mockCelo.balanceOf(accounts[1].address))).to.equal("0.0")
    expect(ethToString(await carbonRewards.rewards(accounts[1].address))).to.equal("0.0")
    await ethers.provider.send("evm_increaseTime", [10])
    await ethers.provider.send("evm_mine", [])
    expect(ethToString(await carbonRewards.earned(accounts[1].address))).to.equal("100.0")
    expect(ethToString(await mockCelo.balanceOf(accounts[1].address))).to.equal("0.0")
    await expect(carbonRewards.connect(accounts[1]).getReward()).to.not.be.reverted
    expect(ethToString(await mockCelo.balanceOf(accounts[1].address))).to.equal("100.0")
  })
  it("Successfully claim rewards after transfering at end of period", async function () {
    const accounts = await ethers.getSigners()
    await expect(carbonRewards.setRewardsDuration(1)).to.not.be.reverted
    await expect(carbonizedCollection.transferFrom(accounts[0].address, accounts[1].address, 1)).to
      .not.be.reverted
    await expect(carbonizedCollection.transferFrom(accounts[0].address, accounts[1].address, 2)).to
      .not.be.reverted
    await expect(carbonizedCollection.transferFrom(accounts[0].address, accounts[1].address, 3)).to
      .not.be.reverted
    await expect(carbonRewards.notifyRewardAmount(stringToEth("100.0"))).to.not.be.reverted
    expect(ethToString(await mockCelo.balanceOf(accounts[1].address))).to.equal("0.0")
    expect(ethToString(await carbonRewards.rewards(accounts[1].address))).to.equal("0.0")
    await ethers.provider.send("evm_increaseTime", [10])
    await ethers.provider.send("evm_mine", [])
    expect(ethToString(await carbonRewards.earned(accounts[1].address))).to.equal("100.0")
    expect(ethToString(await mockCelo.balanceOf(accounts[1].address))).to.equal("0.0")
    await expect(
      carbonizedCollection
        .connect(accounts[1])
        .transferFrom(accounts[1].address, accounts[2].address, 2)
    ).to.not.be.reverted
    await expect(carbonRewards.connect(accounts[1]).getReward()).to.not.be.reverted
    expect(ethToString(await mockCelo.balanceOf(accounts[1].address))).to.equal("100.0")
    expect(ethToString(await carbonRewards.earned(accounts[2].address))).to.equal("0.0")
  })
  it("Successfully transfer halfway through period and claim half period rewards", async function () {
    const accounts = await ethers.getSigners()
    await expect(carbonRewards.setRewardsDuration(2)).to.not.be.reverted
    await expect(carbonizedCollection.transferFrom(accounts[0].address, accounts[1].address, 1)).to
      .not.be.reverted
    await expect(carbonizedCollection.transferFrom(accounts[0].address, accounts[1].address, 2)).to
      .not.be.reverted
    await expect(carbonizedCollection.transferFrom(accounts[0].address, accounts[1].address, 3)).to
      .not.be.reverted
    expect(ethToString(await mockCelo.balanceOf(accounts[1].address))).to.equal("0.0")
    expect(ethToString(await carbonRewards.rewards(accounts[1].address))).to.equal("0.0")

    await expect(carbonRewards.notifyRewardAmount(stringToEth("100.0"))).to.not.be.reverted
    await expect(
      carbonizedCollection
        .connect(accounts[1])
        .transferFrom(accounts[1].address, accounts[2].address, 2)
    ).to.not.be.reverted
    await ethers.provider.send("evm_increaseTime", [10])
    await ethers.provider.send("evm_mine", [])
    expect(ethToString(await carbonRewards.earned(accounts[1].address))).to.equal("80.0")
    expect(ethToString(await carbonRewards.earned(accounts[2].address))).to.equal("20.0")
    expect(ethToString(await mockCelo.balanceOf(accounts[1].address))).to.equal("0.0")
    expect(ethToString(await mockCelo.balanceOf(accounts[2].address))).to.equal("0.0")

    await expect(carbonRewards.connect(accounts[1]).getReward()).to.not.be.reverted
    await expect(carbonRewards.connect(accounts[2]).getReward()).to.not.be.reverted

    expect(ethToString(await mockCelo.balanceOf(accounts[1].address))).to.equal("80.0")
    expect(ethToString(await mockCelo.balanceOf(accounts[2].address))).to.equal("20.0")
  })
})
