import { task } from "hardhat/config"
import { addr } from "../hardhat.config"
import fs from "fs"

task("sendMockCarbon", "Send Mock Carbon")
  .addParam("to", "Address to send mock to ")
  .addParam("amount", "Amount of mock to send to to address")
  .setAction(async (taskArgs, { ethers, network }) => {
    const deploymentPath = `./deployments/${network.name}/MockCarbon.json`
    const mockDeployment = fs.readFileSync(deploymentPath).toString()
    const mockAddress = JSON.parse(mockDeployment)["address"]

    if (!mockAddress) throw new Error("token not deployed on this network")

    const to = await addr(ethers, taskArgs.to)
    const amount = ethers.utils.parseEther(taskArgs.amount)
    const signer = (await ethers.getSigners())[0]

    const MockFactory = await ethers.getContractFactory("MockCarbon")

    const tokenContract = new ethers.Contract(mockAddress, MockFactory.interface, signer)

    try {
      await (await tokenContract.transfer(to, amount)).wait()
      console.log("Carbon transfered")
    } catch (e) {
      console.log(e)
    }
  })
