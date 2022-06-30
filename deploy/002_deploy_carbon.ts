import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { deployProxyAndSave } from "../utils/utils"
import { deployments, ethers } from "hardhat"
import { parseEther } from "ethers/lib/utils"

const func: DeployFunction = async function (hardhat: HardhatRuntimeEnvironment) {
  let celostrialsAddress = (await hardhat.deployments.getOrNull("Celostrials"))?.address
  if (!celostrialsAddress) throw Error("Celostrials not deployed")

  const carbon = await deployments.deploy("MockCarbon", {
    from: (await hardhat.ethers.getSigners())[0].address,
    args: [parseEther("100000000")],
  })

  console.log(
    `${!carbon.newlyDeployed ? "✅ MockCarbon already deployed" : "🚀  MockCarbon deployed"}`
  )

  const mockCelo = await deployments.deploy("MockERC20", {
    from: (await hardhat.ethers.getSigners())[0].address,
    args: [parseEther("100000000")],
  })

  console.log(
    `${!mockCelo.newlyDeployed ? "✅ MockCelo already deployed" : "🚀  MockCelo deployed"}`
  )

  // CarbonizedCollection deploy
  const carbonizedCollectionAbi = (await hardhat.artifacts.readArtifact("CarbonizedCollection")).abi
  const carbonizedCollectionArgs = [
    celostrialsAddress,
    carbon.address,
    "CarbonizedCelostrials",
    "NFET-NCT",
  ]

  const carbonizedCollectionAddress = await deployProxyAndSave(
    "CarbonizedCollection",
    carbonizedCollectionArgs,
    hardhat,
    carbonizedCollectionAbi
  )

  // CarbonStaking deploy
  // const carbonStakingAbi = (await hardhat.artifacts.readArtifact("CarbonizedCollection")).abi
  // const carbonStakingArgs = [
  //   (await hardhat.ethers.getSigners())[0].address,
  //   mockCelo.address,
  //   carbonizedCollectionAddress,
  // ]

  // await deployProxyAndSave("CarbonStaking", carbonStakingArgs, hardhat, carbonStakingAbi)
}
export default func
func.tags = ["carbon"]
