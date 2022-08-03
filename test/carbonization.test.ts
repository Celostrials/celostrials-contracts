import { ethers, upgrades } from "hardhat"
import { expect } from "chai"
import chai from "chai"
import { solidity } from "ethereum-waffle"
import { stringToEth, stringToWei, ethToString, weiToString } from "../utils/utils"
import {
  MockCarbon,
  MockERC20,
  CarbonStaking,
  CarbonizedCollection,
  Celostrials,
  CarbonRewards,
} from "../types"

chai.use(solidity)

describe("Celostrials Carbonization Tests", function () {
  let celostrials: Celostrials
  let carbonizedCollection: CarbonizedCollection
  let carbonRewards: CarbonRewards
  let mockCelo: MockERC20
  let mockCarbon: MockCarbon

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
  })

  it("Successfully Carbonize Original Collection", async function () {
    await (await celostrials.closeWhitelist()).wait()
    const accounts = await ethers.getSigners()

    const supply = ethers.utils.formatUnits(await celostrials.totalSupply(), "wei")
    expect(supply).to.equal("51")
    expect(await celostrials.ownerOf(1)).to.equal(accounts[0].address)
    await expect(carbonizedCollection.carbonize(stringToWei("1"), stringToEth("1"))).to.be.reverted
    await (await celostrials.setApprovalForAll(carbonizedCollection.address, true)).wait()
    await (
      await mockCarbon.approve(carbonizedCollection.address, ethers.constants.MaxUint256)
    ).wait()
    await expect(carbonizedCollection.carbonize(1, stringToEth("1"))).to.not.be.reverted
    await expect(carbonizedCollection.carbonize(2, stringToEth("2"))).to.not.be.reverted
    await expect(carbonizedCollection.carbonize(3, stringToEth("3"))).to.be.reverted

    expect(ethToString(await carbonizedCollection.carbonDeposit(1))).to.equal("1.0")
    expect(ethToString(await carbonizedCollection.carbonDeposit(2))).to.equal("2.0")
    expect(await carbonizedCollection.ownerOf(1)).to.equal(accounts[0].address)
    expect(await celostrials.ownerOf(1)).to.equal(carbonizedCollection.address)
    await expect(carbonizedCollection.decarbonize(1)).to.not.be.reverted
    expect(await carbonizedCollection.exists(1)).to.be.false
    expect(await carbonizedCollection.exists(2)).to.be.true
    expect(await celostrials.ownerOf(1)).to.equal(accounts[0].address)

    await (
      await carbonizedCollection.carbonizeBatch(
        [1, 3, 4],
        [stringToEth("1"), stringToEth("1"), stringToEth("2")]
      )
    ).wait()

    expect(ethToString(await carbonizedCollection.carbonDeposit(3))).to.equal("1.0")
    expect(ethToString(await carbonizedCollection.carbonDeposit(4))).to.equal("2.0")
    await expect(carbonizedCollection.setMaxCarbon(stringToEth("3.0"))).to.not.be.reverted
    await expect(carbonizedCollection.carbonize(5, stringToEth("3.0"))).to.not.be.reverted

    await expect(
      celostrials.connect(accounts[1]).setApprovalForAll(carbonizedCollection.address, true)
    ).to.not.be.reverted

    await (
      await mockCarbon
        .connect(accounts[1])
        .approve(carbonizedCollection.address, ethers.constants.MaxUint256)
    ).wait()

    await expect(carbonizedCollection.connect(accounts[1]).carbonize(6, stringToEth("2"))).to.be
      .reverted

    await expect(celostrials.transferFrom(accounts[0].address, accounts[1].address, 6)).to.not.be
      .reverted

    await expect(carbonizedCollection.connect(accounts[1]).carbonize(6, stringToEth("2"))).to.be
      .reverted

    await expect(mockCarbon.transfer(accounts[1].address, stringToEth("10"))).to.not.be.reverted

    await expect(carbonizedCollection.connect(accounts[1]).carbonize(6, stringToEth("2"))).to.not.be
      .reverted

    await expect(carbonizedCollection.decarbonizeBatch([1, 2, 3])).to.not.be.reverted
    expect(await carbonizedCollection.exists(1)).to.be.false
    expect(await carbonizedCollection.exists(2)).to.be.false
    expect(await carbonizedCollection.exists(2)).to.be.false
    expect(await celostrials.ownerOf(1)).to.equal(accounts[0].address)
    expect(await celostrials.ownerOf(2)).to.equal(accounts[0].address)
    expect(await celostrials.ownerOf(3)).to.equal(accounts[0].address)
  })
})
