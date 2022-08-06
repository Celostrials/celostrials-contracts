import { ethers, upgrades } from "hardhat"
import { expect } from "chai"
import chai from "chai"
import { solidity } from "ethereum-waffle"
import { stringToEth, stringToWei, ethToString, weiToString } from "../utils/utils"
import { MockCarbon, MockERC20, CarbonizedCollection, Celostrials, CarbonRewards } from "../types"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

chai.use(solidity)

describe("Celostrials Carbonization Tests", function () {
  let celostrials: Celostrials
  let carbonizedCollection: CarbonizedCollection
  let carbonRewards: CarbonRewards
  let mockCelo: MockERC20
  let mockCarbon: MockCarbon
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
  })

  it("Test Carbonization", async function () {
    // carbonize tokens 1, 2
    await expect(carbonizedCollection.carbonize(1, stringToEth("1"))).to.not.be.reverted
    await expect(carbonizedCollection.carbonize(2, stringToEth("2"))).to.not.be.reverted
    // test carbon deposits
    expect(ethToString(await carbonizedCollection.carbonDeposit(1))).to.equal("1.0")
    expect(ethToString(await carbonizedCollection.carbonDeposit(2))).to.equal("2.0")
    // test 3 has not yet been minted
    expect(await carbonizedCollection.exists(3)).to.equal(false)
    // owner of carbonized 1 should be 0
    expect(await carbonizedCollection.ownerOf(1)).to.equal(accounts[0].address)
    // owner of uncarbonized 1 should be carbonizedCollection address
    expect(await celostrials.ownerOf(1)).to.equal(carbonizedCollection.address)
  })

  it("Test decarbonization", async function () {
    //carbonize 1 and 2
    await expect(carbonizedCollection.carbonize(1, stringToEth("1"))).to.not.be.reverted
    await expect(carbonizedCollection.carbonize(2, stringToEth("2"))).to.not.be.reverted
    // decarbonize 1
    await expect(carbonizedCollection.decarbonize(1)).to.not.be.reverted
    // check existance of 1 and 2
    expect(await carbonizedCollection.exists(1)).to.be.false
    expect(await carbonizedCollection.exists(2)).to.be.true
    // check ownership of decarbonized token
    expect(await celostrials.ownerOf(1)).to.equal(accounts[0].address)
  })

  it("Test batch carbonization", async function () {
    // batch carbonize 1, 3 and 4
    await expect(
      carbonizedCollection.carbonizeBatch(
        [1, 3, 4],
        [stringToEth("1"), stringToEth("1"), stringToEth("2")]
      )
    ).to.not.be.reverted
    // check carbon deposits
    expect(ethToString(await carbonizedCollection.carbonDeposit(3))).to.equal("1.0")
    expect(ethToString(await carbonizedCollection.carbonDeposit(4))).to.equal("2.0")
  })
  it("Test batch decarbonize", async function () {
    // batch carbonize 1, 2 and 3
    await expect(
      carbonizedCollection.carbonizeBatch(
        [1, 2, 3],
        [stringToEth("1"), stringToEth("1"), stringToEth("2")]
      )
    ).to.not.be.reverted
    // batch decarbonize 1, 2, and 3
    await expect(carbonizedCollection.decarbonizeBatch([1, 2, 3])).to.not.be.reverted
    // check successfull burn of 1, 2 and 3
    expect(await carbonizedCollection.exists(1)).to.be.false
    expect(await carbonizedCollection.exists(2)).to.be.false
    expect(await carbonizedCollection.exists(3)).to.be.false
    // check ownership of original 1, 2 and 3
    expect(await celostrials.ownerOf(1)).to.equal(accounts[0].address)
    expect(await celostrials.ownerOf(2)).to.equal(accounts[0].address)
    expect(await celostrials.ownerOf(3)).to.equal(accounts[0].address)
  })
  it("Test max carbon", async function () {
    // fail to carbonize with invalid carbon amount (greater than maxCarbon)
    await expect(carbonizedCollection.carbonize(1, stringToEth("3"))).to.be.reverted
    // set max carbon to 3
    await expect(carbonizedCollection.setMaxCarbon(stringToEth("3.0"))).to.not.be.reverted
    // carbonize with 3 carbon
    await expect(carbonizedCollection.carbonize(1, stringToEth("3.0"))).to.not.be.reverted
  })
  it("Test min carbon", async function () {
    // fail to carbonize with invalid carbon amount (less than minCarbon)
    await expect(carbonizedCollection.carbonize(1, stringToEth("0.5"))).to.be.reverted
    // set min carbon to .5
    await expect(carbonizedCollection.setMinCarbon(stringToEth("0.5"))).to.not.be.reverted
    // carbonize with .5 carbon
    await expect(carbonizedCollection.carbonize(1, stringToEth("0.5"))).to.not.be.reverted
  })
  it("Test carbonized transfer", async function () {})
})
