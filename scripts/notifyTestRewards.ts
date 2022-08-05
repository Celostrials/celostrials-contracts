import { deployments, ethers } from "hardhat"
import { CarbonRewards__factory } from "../types/factories/CarbonRewards__factory"
import { stringToEth } from "../utils/utils"
import { ERC20__factory } from "../types/factories/ERC20__factory"

async function main(): Promise<void> {
  const signer = (await ethers.getSigners())[0]
  let rewardsDeployment = await deployments.getOrNull("CarbonRewards")
  if (!rewardsDeployment) throw Error("No rewards deployment")
  const rewards = CarbonRewards__factory.connect(rewardsDeployment.address, signer)
  let CeloDeployment = await deployments.getOrNull("MockERC20")
  if (!CeloDeployment) throw Error("No rewards deployment")
  const celo = ERC20__factory.connect(CeloDeployment.address, signer)
  await (await celo.approve(rewards.address, ethers.constants.MaxUint256)).wait()
  await (await rewards.setRewardsDuration(1209600)).wait()
  await (await rewards.notifyRewardAmount(stringToEth("1000"))).wait()
  console.log("💵 rewards notified")
}

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error)
    process.exit(1)
  })
