import { ethers } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "chai"
import chai from "chai"
import { solidity } from "ethereum-waffle"
import { Celostrials } from "../types/Celostrials"

chai.use(solidity)

describe("Celostrials Tests", function () {
  let deployer: SignerWithAddress
  let memberA: SignerWithAddress
  let celostrials: Celostrials
  let count: number

  before(async function () {
    const accounts = await ethers.getSigners()
    deployer = accounts[0]
    memberA = accounts[1]
  })

  it("Successfully deploys Contracts", async function () {
    const celostrialsFactory = await ethers.getContractFactory("Celostrials")

    celostrials = (await celostrialsFactory.deploy()) as Celostrials
    await (await celostrials.closeWhitelist()).wait()
    expect(celostrials.address).to.properAddress
    const supply = ethers.utils.formatUnits(await celostrials.totalSupply(), "wei")
    expect(supply).to.equal("51")
    count = 51
  })

  it("Successfully mints 1", async function () {
    let tx = await (await celostrials.mint(memberA.address, 1)).wait()
    const tokenId = ethers.utils.formatUnits(
      tx.events?.find((e: any) => e.eventSignature == "Transfer(address,address,uint256)")?.args
        ?.tokenId,
      "wei"
    )
    count += 1
    expect(Number(tokenId)).to.be.greaterThan(51).to.be.lessThan(100)

    const supply = ethers.utils.formatUnits(await celostrials.totalSupply(), "wei")
    expect(supply).to.equal(String(count))
  })

  let randomNum = Math.floor(Math.random() * 11) + 1

  it(`Successfully mints ${randomNum}`, async function () {
    let tx = await (await celostrials.mint(memberA.address, randomNum)).wait()

    const events = tx.events ? tx.events : []

    for (let value of events) {
      expect(Number(value.args?.tokenId)).to.be.greaterThan(0)
    }

    count += randomNum
    console.log("Total supply: ", count)
    const supply = ethers.utils.formatUnits(await celostrials.totalSupply(), "wei")
    expect(supply).to.equal(String(count))
  })
  randomNum = Math.floor(Math.random() * 11) + 1
  it(`Successfully mints ${randomNum}`, async function () {
    let tx = await (await celostrials.mint(memberA.address, randomNum)).wait()

    const events = tx.events ? tx.events : []

    for (let value of events) {
      expect(Number(value.args?.tokenId)).to.be.greaterThan(0)
    }
    count += randomNum
    console.log("Total supply: ", count)
    const supply = ethers.utils.formatUnits(await celostrials.totalSupply(), "wei")
    expect(supply).to.equal(String(count))
  })
  randomNum = Math.floor(Math.random() * 11) + 1
  it(`Successfully mints ${randomNum}`, async function () {
    let tx = await (await celostrials.mint(memberA.address, randomNum)).wait()

    const events = tx.events ? tx.events : []

    for (let value of events) {
      expect(Number(value.args?.tokenId)).to.be.greaterThan(0)
    }
    count += randomNum
    console.log("Total supply: ", count)
    const supply = ethers.utils.formatUnits(await celostrials.totalSupply(), "wei")
    expect(supply).to.equal(String(count))
  })
  randomNum = Math.floor(Math.random() * 11) + 1
  it(`Successfully mints ${randomNum}`, async function () {
    let tx = await (await celostrials.mint(memberA.address, randomNum)).wait()

    const events = tx.events ? tx.events : []

    for (let value of events) {
      expect(Number(value.args?.tokenId)).to.be.greaterThan(0)
    }
    count += randomNum
    console.log("Total supply: ", count)
    const supply = ethers.utils.formatUnits(await celostrials.totalSupply(), "wei")
    expect(supply).to.equal(String(count))
  })
  randomNum = Math.floor(Math.random() * 11) + 1
  it(`Successfully mints ${randomNum}`, async function () {
    let tx = await (await celostrials.mint(memberA.address, randomNum)).wait()

    const events = tx.events ? tx.events : []

    for (let value of events) {
      expect(Number(value.args?.tokenId)).to.be.greaterThan(0)
    }
    count += randomNum
    console.log("Total supply: ", count)
    const supply = ethers.utils.formatUnits(await celostrials.totalSupply(), "wei")
    expect(supply).to.equal(String(count))
  })
  randomNum = Math.floor(Math.random() * 11) + 1
  it(`Successfully mints ${randomNum}`, async function () {
    let tx = await (await celostrials.mint(memberA.address, randomNum)).wait()

    const events = tx.events ? tx.events : []

    for (let value of events) {
      expect(Number(value.args?.tokenId)).to.be.greaterThan(0)
    }
    count += randomNum
    console.log("Total supply: ", count)
    const supply = ethers.utils.formatUnits(await celostrials.totalSupply(), "wei")
    expect(supply).to.equal(String(count))
  })
  randomNum = Math.floor(Math.random() * 11) + 1
  it(`Successfully mints ${randomNum}`, async function () {
    let tx = await (await celostrials.mint(memberA.address, randomNum)).wait()

    const events = tx.events ? tx.events : []

    for (let value of events) {
      expect(Number(value.args?.tokenId)).to.be.greaterThan(0)
    }
    count += randomNum
    console.log("Total supply: ", count)
    const supply = ethers.utils.formatUnits(await celostrials.totalSupply(), "wei")
    expect(supply).to.equal(String(count))
  })

  it("Successfully mints 6", async function () {
    let tx = await (await celostrials.mint(memberA.address, 6)).wait()

    const events = tx.events ? tx.events : []

    for (let value of events) {
      expect(Number(value.args?.tokenId)).to.be.greaterThan(0)
    }
    count += 6
    console.log("Total supply: ", count)
    const supply = ethers.utils.formatUnits(await celostrials.totalSupply(), "wei")
    expect(supply).to.equal(String(count))
  })

  it("Successfully mints 10", async function () {
    let tx = await (await celostrials.mint(memberA.address, 10)).wait()

    const events = tx.events ? tx.events : []

    for (let value of events) {
      expect(Number(value.args?.tokenId)).to.be.greaterThan(0)
    }
    count += 10
    console.log("Total supply: ", count)
    const supply = ethers.utils.formatUnits(await celostrials.totalSupply(), "wei")
    expect(supply).to.equal(String(count))
  })

  it("Successfully mints 10", async function () {
    let tx = await (await celostrials.mint(memberA.address, 10)).wait()

    const events = tx.events ? tx.events : []

    for (let value of events) {
      expect(Number(value.args?.tokenId)).to.be.greaterThan(0)
    }
    count += 10
    console.log("Total supply: ", count)
    const supply = ethers.utils.formatUnits(await celostrials.totalSupply(), "wei")
    expect(supply).to.equal(String(count))
  })

  it("Successfully mints 10", async function () {
    let tx = await (await celostrials.mint(memberA.address, 10)).wait()

    const events = tx.events ? tx.events : []

    for (let value of events) {
      expect(Number(ethers.utils.formatUnits(value.args?.tokenId, "wei"))).to.be.greaterThan(0)
    }
    count += 10
    console.log("Total supply: ", count)
    const supply = ethers.utils.formatUnits(await celostrials.totalSupply(), "wei")
    expect(supply).to.equal(String(count))
  })

  it("Successfully mints 160", async function () {
    for (var i = 0; i <= 15; i++) {
      let tx = await (await celostrials.mint(memberA.address, 10, { gasLimit: 20000000 })).wait()

      const events = tx.events ? tx.events : []

      for (let value of events) {
        expect(Number(value.args?.tokenId)).to.be.greaterThan(0)
      }
      count += 10
      console.log("Total supply: ", count)
    }
    const supply = ethers.utils.formatUnits(await celostrials.totalSupply(), "wei")
    expect(supply).to.equal(String(count))
  })
})
