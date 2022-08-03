import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { deployProxyAndSave } from "../utils/utils"
import { deployments, ethers } from "hardhat"
import { parseEther } from "ethers/lib/utils"
import { CarbonRewards__factory } from "../types/factories/CarbonRewards__factory"

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

  // CarbonRewards deploy
  const carbonRewardsAbi = (await hardhat.artifacts.readArtifact("CarbonRewards")).abi
  let carbonRewardsArgs = [(await hardhat.ethers.getSigners())[0].address, mockCelo.address]
  const carbonRewardsAddress = await deployProxyAndSave(
    "CarbonRewards",
    carbonRewardsArgs,
    hardhat,
    carbonRewardsAbi
  )

  // CarbonizedCollection deploy
  const carbonizedCollectionAbi = (await hardhat.artifacts.readArtifact("CarbonizedCollection")).abi
  const carbonizedCollectionArgs = [
    celostrialsAddress,
    carbon.address,
    carbonRewardsAddress,
    "CarbonizedCelostrials",
    "NFET-NCT",
  ]

  const carbonizedCollectionAddress = await deployProxyAndSave(
    "CarbonizedCollection",
    carbonizedCollectionArgs,
    hardhat,
    carbonizedCollectionAbi
  )

  await (
    await CarbonRewards__factory.connect(
      carbonRewardsAddress,
      (
        await hardhat.ethers.getSigners()
      )[0]
    ).setCarbonCollection(carbonizedCollectionAddress)
  ).wait()
}
export default func
func.tags = ["carbon"]
